import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Zap, Plus, Loader2, CheckCircle, Download, Filter, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Apartment { id: string; label: string; tenant_name: string | null; is_occupied: boolean | null; }
interface ElecBill {
  id: string; apartment_id: string; month: number; year: number;
  kwh: number; rate: number; base_cost: number; service_fee: number | null;
  tax_percent: number | null; tv_tax: number | null; control_tax_percent: number | null;
  total: number | null; is_paid: boolean | null;
  apartments?: { label: string; tenant_name: string | null };
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_KEYS = ['month.jan','month.feb','month.mar','month.apr','month.may','month.jun','month.jul','month.aug','month.sep','month.oct','month.nov','month.dec'];

const ElectricityBills = () => {
  const { t } = useLanguage();
  const tMonths = MONTH_KEYS.map(k => t(k));
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [bills, setBills] = useState<ElecBill[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [form, setForm] = useState({ apartment_id: '', month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), kwh: '', rate: '' });
  const [editing, setEditing] = useState<ElecBill | null>(null);
  const [editForm, setEditForm] = useState({ month: '1', year: '', kwh: '', rate: '' });
  const [deleting, setDeleting] = useState<ElecBill | null>(null);

  const fetchData = async () => {
    const [{ data: apts }, { data: b }] = await Promise.all([
      supabase.from('apartments').select('id, label, tenant_name, is_occupied').eq('is_occupied', true),
      supabase.from('electricity_bills').select('*, apartments(label, tenant_name)').order('year', { ascending: false }).order('month', { ascending: false }),
    ]);
    if (apts) setApartments(apts);
    if (b) setBills(b as ElecBill[]);
  };

  useEffect(() => { fetchData(); }, []);

  const calculateTotal = (kwh: number, rate: number) => {
    const base = kwh * rate;
    const step1 = base + 16;
    const step2 = step1 + (0.15 * step1);
    const step3 = step2 + 10;
    const total = step3 + (0.005 * step3);
    return Math.round(total);
  };

  const handleAdd = async () => {
    if (!form.apartment_id || !form.kwh || !form.rate) { toast.error(t('common.fillAll')); return; }
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
    if (error) {
      toast.error(error.code === '23505' ? t('bill.duplicate') : error.message);
      return;
    }
    toast.success(t('bill.add'));
    setShowAdd(false);
    setForm({ apartment_id: '', month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), kwh: '', rate: '' });
    fetchData();
  };

  const openEdit = (bill: ElecBill) => {
    setEditing(bill);
    setEditForm({ month: String(bill.month), year: String(bill.year), kwh: String(bill.kwh), rate: String(bill.rate) });
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setSaving(true);
    const kwh = Number(editForm.kwh);
    const rate = Number(editForm.rate);
    const total = calculateTotal(kwh, rate);
    const baseCost = kwh * rate;
    const { error } = await supabase.from('electricity_bills').update({
      month: Number(editForm.month),
      year: Number(editForm.year),
      kwh, rate, base_cost: baseCost, total,
    }).eq('id', editing.id);
    setSaving(false);
    if (error) {
      toast.error(error.code === '23505' ? t('bill.duplicate') : error.message);
      return;
    }
    toast.success(t('bill.updated'));
    setEditing(null);
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from('electricity_bills').delete().eq('id', deleting.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t('bill.deleted'));
    setDeleting(null);
    fetchData();
  };

  const markPaid = async (id: string) => {
    await supabase.from('electricity_bills').update({ is_paid: true, paid_at: new Date().toISOString() }).eq('id', id);
    toast.success(t('bill.paid'));
    fetchData();
  };

  const downloadPdf = async (bill: ElecBill) => {
    const [{ pickPdfLanguage }, { generateBillPdf }] = await Promise.all([
      import('@/lib/pickPdfLanguage'),
      import('@/lib/pdfGenerator'),
    ]);
    const lang = await pickPdfLanguage();
    if (!lang) return;
    const base = bill.kwh * bill.rate;
    const step1 = base + 16;
    const step2 = step1 + (0.15 * step1);
    const step3 = step2 + 10;
    await generateBillPdf({
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
        'Base cost': base.toFixed(2),
        'Service fee': '16.00',
        'After service (Base+16)': step1.toFixed(2),
        'Tax (15%)': (0.15 * step1).toFixed(2),
        'After tax': step2.toFixed(2),
        'TV Tax': '10.00',
        'After TV tax': step3.toFixed(2),
        'Control Tax (0.5%)': (0.005 * step3).toFixed(2),
      },
      lang,
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
          <SelectTrigger className="w-[120px]"><SelectValue placeholder={t('filter.month')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.allMonths')}</SelectItem>
            {tMonths.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-[100px]"><SelectValue placeholder={t('filter.year')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.allYears')}</SelectItem>
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
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => downloadPdf(bill)} title={bill.is_paid ? t('bill.downloadReceipt') : t('bill.downloadInvoice')}>
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(bill)} title={t('bill.edit')}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleting(bill)} title={t('bill.delete')}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p className="text-muted-foreground">{bill.apartments?.tenant_name}</p>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-muted-foreground">{tMonths[bill.month - 1]} {bill.year}</span>
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
        {filteredBills.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">{t('bill.noElec')}</p>}
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
                    {tMonths.map((m, i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}
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
                <p className="font-semibold">{t('bill.total')}: {calculateTotal(Number(form.kwh), Number(form.rate)).toLocaleString()} {t('common.birr')}</p>
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

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('bill.edit')} - {t('nav.electricity')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">{t('bill.month')}</label>
                <Select value={editForm.month} onValueChange={v => setEditForm({...editForm, month: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {tMonths.map((m, i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">{t('bill.year')}</label>
                <Input type="number" value={editForm.year} onChange={e => setEditForm({...editForm, year: e.target.value})} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">{t('bill.kwh')}</label>
                <Input type="number" value={editForm.kwh} onChange={e => setEditForm({...editForm, kwh: e.target.value})} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">{t('bill.rate')}</label>
                <Input type="number" step="0.01" value={editForm.rate} onChange={e => setEditForm({...editForm, rate: e.target.value})} className="mt-1" />
              </div>
            </div>
            {editForm.kwh && editForm.rate && (
              <div className="p-3 rounded-lg bg-muted text-sm">
                <p className="font-semibold">{t('bill.total')}: {calculateTotal(Number(editForm.kwh), Number(editForm.rate)).toLocaleString()} {t('common.birr')}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t('apt.cancel')}</Button>
            <Button onClick={handleUpdate} disabled={saving} className="gold-gradient text-card">
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} {t('apt.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t('bill.delete')}?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{t('bill.deleteConfirm')}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>{t('apt.cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete}>{t('bill.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ElectricityBills;
