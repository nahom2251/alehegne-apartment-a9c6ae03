import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, ChevronLeft, ChevronRight, Receipt, Save, Send, CheckCircle, Loader2, Zap, Droplets, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_KEYS = ['month.jan','month.feb','month.mar','month.apr','month.may','month.jun','month.jul','month.aug','month.sep','month.oct','month.nov','month.dec'];
const PAGE_SIZE = 10;
const currentYear = new Date().getFullYear();
const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

interface Apartment { id: string; label: string; tenant_name: string | null; }

interface InvoiceRow {
  id: string;
  apartment_id: string;
  month: number;
  year: number;
  electricity_amount: number;
  water_amount: number;
  security_amount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid';
  sent_at: string | null;
  paid_at: string | null;
  electricity_bill_id: string | null;
  water_bill_id: string | null;
  security_bill_id: string | null;
}

const calcElectricityTotal = (kwh: number, rate: number) => {
  const base = kwh * rate;
  const step1 = base + 16;
  const step2 = step1 + 0.15 * step1;
  const step3 = step2 + 10;
  return step3 + 0.005 * step3;
};

const UtilityInvoices = () => {
  const { t } = useLanguage();
  const tMonths = MONTH_KEYS.map(k => t(k));
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterApt, setFilterApt] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Editor state
  const [aptId, setAptId] = useState<string>('');
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(currentYear);
  const [kwh, setKwh] = useState('');
  const [rate, setRate] = useState('');
  const [waterAmount, setWaterAmount] = useState('');
  const [securityAmount, setSecurityAmount] = useState('');
  const [editing, setEditing] = useState<InvoiceRow | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: apts }, { data: invs }] = await Promise.all([
      supabase.from('apartments').select('id, label, tenant_name').eq('is_occupied', true).order('floor').order('position'),
      supabase.from('utility_invoices').select('*').order('year', { ascending: false }).order('month', { ascending: false }).order('created_at', { ascending: false }),
    ]);
    if (apts) setApartments(apts);
    if (invs) setInvoices(invs as any);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const aptMap = useMemo(() => {
    const m: Record<string, Apartment> = {};
    apartments.forEach((a) => (m[a.id] = a));
    return m;
  }, [apartments]);

  const electricityTotal = useMemo(() => {
    const k = Number(kwh) || 0;
    const r = Number(rate) || 0;
    return k > 0 && r > 0 ? calcElectricityTotal(k, r) : 0;
  }, [kwh, rate]);

  const grandTotal = electricityTotal + (Number(waterAmount) || 0) + (Number(securityAmount) || 0);

  const loadDraft = async () => {
    if (!aptId) { toast.error(t('ui.selectAptFirst')); return; }
    setSaving(true);
    try {
      // Existing invoice?
      const { data: existing } = await supabase
        .from('utility_invoices')
        .select('*')
        .eq('apartment_id', aptId).eq('month', month).eq('year', year)
        .maybeSingle();

      if (existing) {
        setEditing(existing as any);
        // Load underlying bills
        const [elec, water, sec] = await Promise.all([
          existing.electricity_bill_id
            ? supabase.from('electricity_bills').select('kwh, rate').eq('id', existing.electricity_bill_id).maybeSingle()
            : Promise.resolve({ data: null }),
          existing.water_bill_id
            ? supabase.from('water_bills').select('amount').eq('id', existing.water_bill_id).maybeSingle()
            : Promise.resolve({ data: null }),
          existing.security_bill_id
            ? supabase.from('security_bills').select('amount').eq('id', existing.security_bill_id).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        setKwh(elec.data ? String(elec.data.kwh ?? '') : '');
        setRate(elec.data ? String(elec.data.rate ?? '') : '');
        setWaterAmount(water.data ? String(water.data.amount ?? existing.water_amount) : String(existing.water_amount));
        setSecurityAmount(sec.data ? String(sec.data.amount ?? existing.security_amount) : String(existing.security_amount));
        toast.success(t('ui.loadedExisting'));
      } else {
        // Look up existing bills for this period to prefill
        const [elec, water, sec] = await Promise.all([
          supabase.from('electricity_bills').select('id, kwh, rate').eq('apartment_id', aptId).eq('month', month).eq('year', year).maybeSingle(),
          supabase.from('water_bills').select('id, amount').eq('apartment_id', aptId).eq('month', month).eq('year', year).maybeSingle(),
          supabase.from('security_bills').select('id, amount').eq('apartment_id', aptId).eq('month', month).eq('year', year).maybeSingle(),
        ]);
        setEditing(null);
        setKwh(elec.data ? String(elec.data.kwh ?? '') : '');
        setRate(elec.data ? String(elec.data.rate ?? '') : '');
        setWaterAmount(water.data ? String(water.data.amount ?? '') : '');
        setSecurityAmount(sec.data ? String(sec.data.amount ?? '') : '');
        toast.info(t('ui.newDraft'));
      }
    } finally {
      setSaving(false);
    }
  };

  const upsertBills = async () => {
    const k = Number(kwh) || 0;
    const r = Number(rate) || 0;
    const elecTotal = k > 0 && r > 0 ? calcElectricityTotal(k, r) : 0;
    const wAmt = Number(waterAmount) || 0;
    const sAmt = Number(securityAmount) || 0;

    let electricity_bill_id: string | null = editing?.electricity_bill_id ?? null;
    let water_bill_id: string | null = editing?.water_bill_id ?? null;
    let security_bill_id: string | null = editing?.security_bill_id ?? null;

    // Electricity
    if (k > 0 && r > 0) {
      const elecPayload = {
        apartment_id: aptId, month, year,
        kwh: k, rate: r, base_cost: k * r, total: elecTotal,
      };
      if (electricity_bill_id) {
        const { error } = await supabase.from('electricity_bills').update(elecPayload).eq('id', electricity_bill_id);
        if (error) throw error;
      } else {
        const { data: existing } = await supabase.from('electricity_bills').select('id').eq('apartment_id', aptId).eq('month', month).eq('year', year).maybeSingle();
        if (existing) {
          const { error } = await supabase.from('electricity_bills').update(elecPayload).eq('id', existing.id);
          if (error) throw error;
          electricity_bill_id = existing.id;
        } else {
          const { data: ins, error } = await supabase.from('electricity_bills').insert(elecPayload).select('id').single();
          if (error) throw error;
          electricity_bill_id = ins.id;
        }
      }
    }

    // Water
    if (wAmt > 0) {
      const wPayload = { apartment_id: aptId, month, year, amount: wAmt };
      if (water_bill_id) {
        const { error } = await supabase.from('water_bills').update(wPayload).eq('id', water_bill_id);
        if (error) throw error;
      } else {
        const { data: existing } = await supabase.from('water_bills').select('id').eq('apartment_id', aptId).eq('month', month).eq('year', year).maybeSingle();
        if (existing) {
          const { error } = await supabase.from('water_bills').update(wPayload).eq('id', existing.id);
          if (error) throw error;
          water_bill_id = existing.id;
        } else {
          const { data: ins, error } = await supabase.from('water_bills').insert(wPayload).select('id').single();
          if (error) throw error;
          water_bill_id = ins.id;
        }
      }
    }

    // Security
    if (sAmt > 0) {
      const sPayload = { apartment_id: aptId, month, year, amount: sAmt };
      if (security_bill_id) {
        const { error } = await supabase.from('security_bills').update(sPayload).eq('id', security_bill_id);
        if (error) throw error;
      } else {
        const { data: existing } = await supabase.from('security_bills').select('id').eq('apartment_id', aptId).eq('month', month).eq('year', year).maybeSingle();
        if (existing) {
          const { error } = await supabase.from('security_bills').update(sPayload).eq('id', existing.id);
          if (error) throw error;
          security_bill_id = existing.id;
        } else {
          const { data: ins, error } = await supabase.from('security_bills').insert(sPayload).select('id').single();
          if (error) throw error;
          security_bill_id = ins.id;
        }
      }
    }

    return { electricity_bill_id, water_bill_id, security_bill_id, elecTotal, wAmt, sAmt };
  };

  const handleSave = async () => {
    if (!aptId) { toast.error(t('bill.pleaseSelectApt')); return; }
    setSaving(true);
    try {
      const { electricity_bill_id, water_bill_id, security_bill_id, elecTotal, wAmt, sAmt } = await upsertBills();
      const total = elecTotal + wAmt + sAmt;
      const payload = {
        apartment_id: aptId, month, year,
        electricity_bill_id, water_bill_id, security_bill_id,
        electricity_amount: elecTotal, water_amount: wAmt, security_amount: sAmt,
        total,
      };
      if (editing) {
        const { data, error } = await supabase.from('utility_invoices').update(payload).eq('id', editing.id).select('*').single();
        if (error) throw error;
        setEditing(data as any);
      } else {
        const { data, error } = await supabase.from('utility_invoices').insert({ ...payload, status: 'draft' }).select('*').single();
        if (error) throw error;
        setEditing(data as any);
      }
      toast.success(t('ui.invoiceSaved'));
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || t('ui.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (inv: InvoiceRow, status: 'sent' | 'paid') => {
    const updates: any = { status };
    if (status === 'sent') updates.sent_at = new Date().toISOString();
    if (status === 'paid') {
      updates.paid_at = new Date().toISOString();
      // Mark underlying bills paid
      const now = new Date().toISOString();
      await Promise.all([
        inv.electricity_bill_id ? supabase.from('electricity_bills').update({ is_paid: true, paid_at: now }).eq('id', inv.electricity_bill_id) : Promise.resolve(),
        inv.water_bill_id ? supabase.from('water_bills').update({ is_paid: true, paid_at: now }).eq('id', inv.water_bill_id) : Promise.resolve(),
        inv.security_bill_id ? supabase.from('security_bills').update({ is_paid: true, paid_at: now }).eq('id', inv.security_bill_id) : Promise.resolve(),
      ]);
    }
    const { error } = await supabase.from('utility_invoices').update(updates).eq('id', inv.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${t('ui.markedAs')} ${status === 'sent' ? t('ui.sent') : t('ui.paid')}`);
    fetchAll();
    if (editing?.id === inv.id) setEditing({ ...editing, ...updates });
  };

  const downloadInvoice = async (inv: InvoiceRow) => {
    const apt = aptMap[inv.apartment_id];
    const items: any[] = [];
    if (inv.electricity_amount > 0) items.push({ billType: 'Electricity', month: MONTHS[inv.month - 1], year: inv.year, amount: Number(inv.electricity_amount), paidAt: inv.paid_at || undefined });
    if (inv.water_amount > 0) items.push({ billType: 'Water', month: MONTHS[inv.month - 1], year: inv.year, amount: Number(inv.water_amount), paidAt: inv.paid_at || undefined });
    if (inv.security_amount > 0) items.push({ billType: 'Security', month: MONTHS[inv.month - 1], year: inv.year, amount: Number(inv.security_amount), paidAt: inv.paid_at || undefined });
    if (items.length === 0) { toast.error(t('ui.nothingDownload')); return; }
    try {
      const [{ pickPdfLanguage }, { generateCombinedReceiptPdf }] = await Promise.all([
        import('@/lib/pickPdfLanguage'),
        import('@/lib/pdfGenerator'),
      ]);
      const lang = await pickPdfLanguage();
      if (!lang) return;
      const toastId = toast.loading(lang === 'am' ? 'ፒዲኤፍ በመፍጠር ላይ...' : 'Generating PDF...');
      try {
        await generateCombinedReceiptPdf({
          tenantName: apt?.tenant_name || 'Tenant',
          unitLabel: apt?.label || '-',
          items,
          isPaid: inv.status === 'paid',
          lang,
        });
        toast.success('PDF downloaded', { id: toastId });
      } catch (err: any) {
        toast.error(`PDF failed: ${err?.message || err}`, { id: toastId });
      }
    } catch (err: any) {
      toast.error(`PDF failed: ${err?.message || err}`);
    }
  };

  const filtered = useMemo(() => {
    return invoices.filter((i) => (filterApt === 'all' || i.apartment_id === filterApt) && (filterStatus === 'all' || i.status === filterStatus));
  }, [invoices, filterApt, filterStatus]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const statusBadge = (s: string) => {
    if (s === 'paid') return <Badge className="bg-success text-success-foreground">{t('ui.paid')}</Badge>;
    if (s === 'sent') return <Badge variant="secondary">{t('ui.sent')}</Badge>;
    return <Badge variant="outline">{t('ui.draft')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Receipt className="w-6 h-6 text-primary" />
        {t('ui.title')}
      </h1>

      {/* Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('ui.createEdit')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>{t('nav.apartments')}</Label>
              <Select value={aptId} onValueChange={setAptId}>
                <SelectTrigger><SelectValue placeholder={t('bill.selectApt')} /></SelectTrigger>
                <SelectContent>
                  {apartments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.label}{a.tenant_name ? ` — ${a.tenant_name}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('filter.month')}</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tMonths.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('filter.year')}</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={loadDraft} variant="outline" disabled={!aptId || saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {t('ui.loadDraft')}
          </Button>

          {editing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {t('ui.editingExisting')} {statusBadge(editing.status)}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border">
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Zap className="w-4 h-4 text-warning" /> {t('type.electricity')}</Label>
              <Input type="number" placeholder={t('ui.kwh')} value={kwh} onChange={(e) => setKwh(e.target.value)} />
              <Input type="number" placeholder={t('ui.rate')} value={rate} onChange={(e) => setRate(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t('ui.total')}: {electricityTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} {t('common.birr')}</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Droplets className="w-4 h-4 text-info" /> {t('type.water')}</Label>
              <Input type="number" placeholder={t('ui.amount')} value={waterAmount} onChange={(e) => setWaterAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-primary" /> {t('type.security')}</Label>
              <Input type="number" placeholder={t('ui.amount')} value={securityAmount} onChange={(e) => setSecurityAmount(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3 flex-wrap gap-3">
            <p className="text-lg font-semibold">{t('ui.grandTotal')}: <span className="gold-text-gradient">{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} {t('common.birr')}</span></p>
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={handleSave} disabled={saving || !aptId} className="gold-gradient text-card">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {t('apt.save')}
              </Button>
              {editing && editing.status === 'draft' && (
                <Button variant="outline" onClick={() => setStatus(editing, 'sent')}>
                  <Send className="w-4 h-4 mr-2" /> {t('ui.markSent')}
                </Button>
              )}
              {editing && editing.status !== 'paid' && (
                <Button variant="outline" onClick={() => setStatus(editing, 'paid')}>
                  <CheckCircle className="w-4 h-4 mr-2" /> {t('ui.markPaid')}
                </Button>
              )}
              {editing && (
                <Button variant="outline" onClick={() => downloadInvoice(editing)}>
                  <Download className="w-4 h-4 mr-2" /> PDF
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">{t('ui.savedInvoices')}</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterApt} onValueChange={(v) => { setFilterApt(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allApartments')}</SelectItem>
                {apartments.map((a) => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allStatuses')}</SelectItem>
                <SelectItem value="draft">{t('ui.draft')}</SelectItem>
                <SelectItem value="sent">{t('ui.sent')}</SelectItem>
                <SelectItem value="paid">{t('ui.paid')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">{t('common.loading')}</p>
          ) : pageItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t('ui.noInvoices')}</p>
          ) : (
            <div className="space-y-2">
              {pageItems.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between border border-border rounded-lg p-3 gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {aptMap[inv.apartment_id]?.label || '-'} — {tMonths[inv.month - 1]} {inv.year}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {aptMap[inv.apartment_id]?.tenant_name || '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{Number(inv.total).toLocaleString()} {t('common.birr')}</span>
                    {statusBadge(inv.status)}
                    <Button size="sm" variant="ghost" onClick={() => { setAptId(inv.apartment_id); setMonth(inv.month); setYear(inv.year); setEditing(inv); /* trigger fetch fields */ setTimeout(loadDraft, 0); }}>
                      {t('apt.edit')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => downloadInvoice(inv)}>
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-muted-foreground">
                {t('common.page')} {currentPage} {t('common.of')} {totalPages} · {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UtilityInvoices;