import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Home, Plus, Loader2, CheckCircle, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { format, addMonths } from 'date-fns';

interface Apartment {
  id: string;
  label: string;
  tenant_name: string | null;
  monthly_rent: number | null;
  move_in_date: string | null;
  is_occupied: boolean | null;
}

interface RentBill {
  id: string;
  apartment_id: string;
  month: number;
  year: number;
  amount: number;
  is_paid: boolean | null;
  paid_at: string | null;
  apartments?: { label: string; tenant_name: string | null; move_in_date: string | null };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const RentBilling = () => {
  const { t } = useLanguage();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [bills, setBills] = useState<RentBill[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [selectedApartment, setSelectedApartment] = useState<string>('');
  const [numMonths, setNumMonths] = useState<string>('1');
  const [selectedAptData, setSelectedAptData] = useState<Apartment | null>(null);

  const fetchData = async () => {
    const { data: apts } = await supabase
      .from('apartments')
      .select('id, label, tenant_name, monthly_rent, move_in_date, is_occupied')
      .eq('is_occupied', true);
    if (apts) setApartments(apts);

    const { data: b } = await supabase
      .from('rent_bills')
      .select('*, apartments(label, tenant_name, move_in_date)')
      .order('year', { ascending: false })
      .order('month', { ascending: false });
    if (b) setBills(b as RentBill[]);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (selectedApartment) {
      const apt = apartments.find(a => a.id === selectedApartment);
      setSelectedAptData(apt || null);
    } else {
      setSelectedAptData(null);
    }
  }, [selectedApartment, apartments]);

  const handleAdd = async () => {
    if (!selectedApartment || !selectedAptData) {
      toast.error('Please select an apartment');
      return;
    }
    if (!selectedAptData.move_in_date) {
      toast.error('This apartment has no move-in date set');
      return;
    }
    if (!selectedAptData.monthly_rent) {
      toast.error('This apartment has no monthly rent set');
      return;
    }

    setSaving(true);
    const months = Number(numMonths);
    const moveIn = new Date(selectedAptData.move_in_date);
    const rentAmount = selectedAptData.monthly_rent;

    // Find the next unbilled month starting from move-in date
    // Check existing bills for this apartment
    const { data: existingBills } = await supabase
      .from('rent_bills')
      .select('month, year')
      .eq('apartment_id', selectedApartment);

    const existingSet = new Set(
      (existingBills || []).map(b => `${b.year}-${b.month}`)
    );

    // Start from move-in month, find first unbilled month
    let startDate = new Date(moveIn.getFullYear(), moveIn.getMonth(), 1);
    while (existingSet.has(`${startDate.getFullYear()}-${startDate.getMonth() + 1}`)) {
      startDate = addMonths(startDate, 1);
    }

    const billsToInsert = [];
    let currentDate = startDate;
    for (let i = 0; i < months; i++) {
      const m = currentDate.getMonth() + 1;
      const y = currentDate.getFullYear();
      const key = `${y}-${m}`;
      if (!existingSet.has(key)) {
        billsToInsert.push({
          apartment_id: selectedApartment,
          month: m,
          year: y,
          amount: rentAmount,
        });
        existingSet.add(key);
      }
      currentDate = addMonths(currentDate, 1);
    }

    if (billsToInsert.length === 0) {
      toast.info('All selected months already have bills');
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('rent_bills').insert(billsToInsert);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${billsToInsert.length} rent bill(s) created`);
    setShowAdd(false);
    setSelectedApartment('');
    setNumMonths('1');
    fetchData();
  };

  const markPaid = async (id: string) => {
    await supabase
      .from('rent_bills')
      .update({ is_paid: true, paid_at: new Date().toISOString() })
      .eq('id', id);
    toast.success(t('bill.paid'));
    fetchData();
  };

  const filteredBills = bills.filter(b => {
    if (filterMonth !== 'all' && b.month !== Number(filterMonth)) return false;
    if (filterYear !== 'all' && b.year !== Number(filterYear)) return false;
    return true;
  });

  const years = [...new Set(bills.map(b => b.year))].sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">{t('tenant.rent')}</h1>
        <Button onClick={() => setShowAdd(true)} className="gold-gradient text-card">
          <Plus className="w-4 h-4 mr-1" /> {t('bill.add')}
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="Month" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-[100px]"><SelectValue placeholder="Year" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredBills.map((bill) => (
          <Card key={bill.id}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Home className="w-4 h-4 text-primary" />
                  {bill.apartments?.label}
                </CardTitle>
                <Badge variant={bill.is_paid ? 'default' : 'destructive'} className={bill.is_paid ? 'bg-success' : ''}>
                  {bill.is_paid ? t('bill.paid') : t('bill.unpaid')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p className="text-muted-foreground">{bill.apartments?.tenant_name}</p>
              {bill.apartments?.move_in_date && (
                <p className="text-xs text-muted-foreground">
                  {t('apt.moveIn')}: {format(new Date(bill.apartments.move_in_date), 'MMM dd, yyyy')}
                </p>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{MONTHS[bill.month - 1]} {bill.year}</span>
                <span className="font-semibold">{bill.amount?.toLocaleString()} {t('common.birr')}</span>
              </div>
              {bill.is_paid && bill.paid_at && (
                <p className="text-xs text-muted-foreground">
                  {t('bill.paid')}: {format(new Date(bill.paid_at), 'MMM dd, yyyy')}
                </p>
              )}
              {!bill.is_paid && (
                <Button size="sm" variant="outline" onClick={() => markPaid(bill.id)} className="w-full mt-2">
                  <CheckCircle className="w-3 h-3 mr-1" /> {t('bill.markPaid')}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {filteredBills.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-8">No rent bills found</p>
        )}
      </div>

      {/* Add Rent Bill Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('bill.add')} - {t('tenant.rent')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('nav.apartments')}</label>
              <Select value={selectedApartment} onValueChange={setSelectedApartment}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select apartment" /></SelectTrigger>
                <SelectContent>
                  {apartments.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.label} - {a.tenant_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedAptData && (
              <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
                {selectedAptData.move_in_date && (
                  <p><span className="font-medium">{t('apt.moveIn')}:</span> {format(new Date(selectedAptData.move_in_date), 'MMM dd, yyyy')}</p>
                )}
                <p><span className="font-medium">{t('apt.rent')}:</span> {selectedAptData.monthly_rent?.toLocaleString()} {t('common.birr')}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Number of Months</label>
              <Select value={numMonths} onValueChange={setNumMonths}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {i + 1} {i === 0 ? 'month' : 'months'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>{t('apt.cancel')}</Button>
            <Button onClick={handleAdd} disabled={saving} className="gold-gradient text-card">
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} {t('apt.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RentBilling;
