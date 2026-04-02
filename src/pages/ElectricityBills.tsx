import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Zap, Plus, Loader2, CheckCircle, Download, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { generateBillPdf } from '@/lib/pdfGenerator';

interface Apartment { id: string; label: string; tenant_name: string | null; is_occupied: boolean | null; }
interface ElecBill {
  id: string; apartment_id: string; month: number; year: number;
  kwh: number; rate: number; base_cost: number; service_fee: number | null;
  tax_percent: number | null; tv_tax: number | null; control_tax_percent: number | null;
  total: number | null; is_paid: boolean | null;
  apartments?: { label: string; tenant_name: string | null };
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const ElectricityBills = () => {
  const { t } = useLanguage();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [bills, setBills] = useState<ElecBill[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [form, setForm] = useState({ apartment_id: '', month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), kwh: '', rate: '' });

  const fetchData = async () => {
    const { data: apts } = await supabase.from('apartments').select('id, label, tenant_name, is_occupied').eq('is_occupied', true);
    if (apts) setApartments(apts);
    const { data: b } = await supabase.from('electricity_bills').select('*, apartments(label, tenant_name)').order('year', { ascending: false }).order('month', { ascending: false });
    if (b) setBills(b as ElecBill[]);
  };

  useEffect(() => { fetchData(); }, []);

  const calculateTotal = (kwh: number, rate: number) => {
    const base = kwh * rate;
    const step1 = base + 16;
    const step2 = step1 + (0.15 * step1);
    const step3 = step2 + 10;
    const total = step3 + (0.005 * step3);
    return total;
  };

  const handleAdd = async () => {
    if (!form.apartment_id || !form.kwh || !form.rate) { toast.error('Fill all fields'); return; }
    setSaving(true);
    const kwh = Number(form.kwh);
    const rate = Number(form.rate);
    const total = calculateTotal(kwh, rate);
    const baseCost = kwh * rate;

    const { error } = await supabase.from('electricity_bills').insert({
      apartment_id: form.apartment_id,
      month: Number(form.month),
      year: Number(form.year),
      kwh, rate, base_cost: baseCost, total,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('bill.add'));
    setShowAdd(false);
    setForm({ apartment_id: '', month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), kwh: '', rate: '' });
    fetchData();
  };

  const markPaid = async (id: string) => {
    await supabase.from('electricity_bills').update({ is_paid: true, paid_at: new Date().toISOString() }).eq('id', id);
    toast.success(t('bill.paid'));
    fetchData();
  };

  const downloadPdf = (bill: ElecBill) => {
    const baseCost = bill.kwh * bill.rate;
    generateBillPdf({
      tenantName: bill.apartments?.tenant_name || 'N/A',
      unitLabel: bill.apartments?.label || 'N/A',
      month: MONTHS[bill.month - 1],
      year: bill.year,
      billType: 'Electricity',
      amount: bill.total || 0,
      isPaid: !!bill.is_paid,
      details: {
        'kWh consumed': bill.kwh,
        'Rate per kWh': bill.rate,
        'Base cost': baseCost.toFixed(2),
        'Service fee': '16.00',
        'Tax (15%)': (baseCost * 0.15).toFixed(2),
        'TV Tax': '10.00',
        'Control Tax (0.5%)': (baseCost * 0.005).toFixed(2),
      },
    });
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
        <h1 className="text-2xl font-bold">{t('nav.electricity')}</h1>
        <Button onClick={() => setShowAdd(true)} className="gold-gradient text-card">
          <Plus className="w-4 h-4 mr-1" /> {t('bill.add')}
        </Button>
      </div>

      {/* Filters */}
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
                  <Zap className="w-4 h-4 text-primary" />
                  {bill.apartments?.label}
                </CardTitle>
                <div className="flex items-center gap-1.5">
                  <Badge variant={bill.is_paid ? 'default' : 'destructive'} className={bill.is_paid ? 'bg-success' : ''}>
                    {bill.is_paid ? t('bill.paid') : t('bill.unpaid')}
                  </Badge>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => downloadPdf(bill)} title={bill.is_paid ? 'Download Receipt' : 'Download Invoice'}>
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p className="text-muted-foreground">{bill.apartments?.tenant_name}</p>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-muted-foreground">{MONTHS[bill.month - 1]} {bill.year}</span>
                <span className="text-right font-semibold">{bill.total?.toLocaleString()} {t('common.birr')}</span>
                <span className="text-muted-foreground">{bill.kwh} kWh × {bill.rate}</span>
              </div>
              {!bill.is_paid && (
                <Button size="sm" variant="outline" onClick={() => markPaid(bill.id)} className="w-full mt-2">
                  <CheckCircle className="w-3 h-3 mr-1" /> {t('bill.markPaid')}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {filteredBills.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">No electricity bills found</p>}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('bill.add')} - {t('nav.electricity')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">{t('nav.apartments')}</label>
              <Select value={form.apartment_id} onValueChange={v => setForm({...form, apartment_id: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {apartments.map(a => <SelectItem key={a.id} value={a.id}>{a.label} - {a.tenant_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">{t('bill.month')}</label>
                <Select value={form.month} onValueChange={v => setForm({...form, month: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">{t('bill.year')}</label>
                <Input type="number" value={form.year} onChange={e => setForm({...form, year: e.target.value})} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">{t('bill.kwh')}</label>
                <Input type="number" value={form.kwh} onChange={e => setForm({...form, kwh: e.target.value})} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">{t('bill.rate')}</label>
                <Input type="number" step="0.01" value={form.rate} onChange={e => setForm({...form, rate: e.target.value})} className="mt-1" />
              </div>
            </div>
            {form.kwh && form.rate && (
              <div className="p-3 rounded-lg bg-muted text-sm">
                <p className="font-semibold">{t('bill.total')}: {calculateTotal(Number(form.kwh), Number(form.rate)).toFixed(2)} {t('common.birr')}</p>
              </div>
            )}
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

export default ElectricityBills;
