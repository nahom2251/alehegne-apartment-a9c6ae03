import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, ChevronLeft, ChevronRight, Receipt, Save, Send, CheckCircle, Loader2, Zap, Droplets, ShieldCheck } from 'lucide-react';
import { generateCombinedReceiptPdf } from '@/lib/pdfGenerator';
import { toast } from 'sonner';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
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
    if (!aptId) { toast.error('Select an apartment first'); return; }
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
        toast.success('Loaded existing invoice');
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
        toast.info('New draft - fill in amounts');
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
    if (!aptId) { toast.error('Select an apartment'); return; }
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
      toast.success('Invoice saved');
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
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
    toast.success(`Marked as ${status}`);
    fetchAll();
    if (editing?.id === inv.id) setEditing({ ...editing, ...updates });
  };

  const downloadInvoice = (inv: InvoiceRow) => {
    const apt = aptMap[inv.apartment_id];
    const items: any[] = [];
    if (inv.electricity_amount > 0) items.push({ billType: 'Electricity', month: MONTHS[inv.month - 1], year: inv.year, amount: Number(inv.electricity_amount), paidAt: inv.paid_at || undefined });
    if (inv.water_amount > 0) items.push({ billType: 'Water', month: MONTHS[inv.month - 1], year: inv.year, amount: Number(inv.water_amount), paidAt: inv.paid_at || undefined });
    if (inv.security_amount > 0) items.push({ billType: 'Security', month: MONTHS[inv.month - 1], year: inv.year, amount: Number(inv.security_amount), paidAt: inv.paid_at || undefined });
    if (items.length === 0) { toast.error('Nothing to download'); return; }
    generateCombinedReceiptPdf({
      tenantName: apt?.tenant_name || 'Tenant',
      unitLabel: apt?.label || '-',
      items,
      isPaid: inv.status === 'paid',
    });
  };

  const filtered = useMemo(() => {
    return invoices.filter((i) => (filterApt === 'all' || i.apartment_id === filterApt) && (filterStatus === 'all' || i.status === filterStatus));
  }, [invoices, filterApt, filterStatus]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const statusBadge = (s: string) => {
    if (s === 'paid') return <Badge className="bg-success text-success-foreground">Paid</Badge>;
    if (s === 'sent') return <Badge variant="secondary">Sent</Badge>;
    return <Badge variant="outline">Draft</Badge>;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Receipt className="w-6 h-6 text-primary" />
        Utility Invoices
      </h1>

      {/* Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create / Edit Invoice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Apartment</Label>
              <Select value={aptId} onValueChange={setAptId}>
                <SelectTrigger><SelectValue placeholder="Select apartment" /></SelectTrigger>
                <SelectContent>
                  {apartments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.label}{a.tenant_name ? ` — ${a.tenant_name}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Month</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Year</Label>
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
            Load / Start Draft
          </Button>

          {editing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Editing existing invoice {statusBadge(editing.status)}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border">
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Zap className="w-4 h-4 text-warning" /> Electricity</Label>
              <Input type="number" placeholder="kWh" value={kwh} onChange={(e) => setKwh(e.target.value)} />
              <Input type="number" placeholder="Rate (Birr/kWh)" value={rate} onChange={(e) => setRate(e.target.value)} />
              <p className="text-xs text-muted-foreground">Total: {electricityTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} Birr</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Droplets className="w-4 h-4 text-info" /> Water</Label>
              <Input type="number" placeholder="Amount" value={waterAmount} onChange={(e) => setWaterAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-primary" /> Security</Label>
              <Input type="number" placeholder="Amount" value={securityAmount} onChange={(e) => setSecurityAmount(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3 flex-wrap gap-3">
            <p className="text-lg font-semibold">Grand Total: <span className="gold-text-gradient">{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} Birr</span></p>
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={handleSave} disabled={saving || !aptId} className="gold-gradient text-card">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save
              </Button>
              {editing && editing.status === 'draft' && (
                <Button variant="outline" onClick={() => setStatus(editing, 'sent')}>
                  <Send className="w-4 h-4 mr-2" /> Mark Sent
                </Button>
              )}
              {editing && editing.status !== 'paid' && (
                <Button variant="outline" onClick={() => setStatus(editing, 'paid')}>
                  <CheckCircle className="w-4 h-4 mr-2" /> Mark Paid
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
          <CardTitle className="text-base">Saved Invoices</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterApt} onValueChange={(v) => { setFilterApt(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All apartments</SelectItem>
                {apartments.map((a) => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : pageItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No invoices yet</p>
          ) : (
            <div className="space-y-2">
              {pageItems.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between border border-border rounded-lg p-3 gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {aptMap[inv.apartment_id]?.label || '-'} — {MONTHS[inv.month - 1]} {inv.year}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {aptMap[inv.apartment_id]?.tenant_name || '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{Number(inv.total).toLocaleString()} Birr</span>
                    {statusBadge(inv.status)}
                    <Button size="sm" variant="ghost" onClick={() => { setAptId(inv.apartment_id); setMonth(inv.month); setYear(inv.year); setEditing(inv); /* trigger fetch fields */ setTimeout(loadDraft, 0); }}>
                      Edit
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
                Page {currentPage} of {totalPages} · {filtered.length} invoice{filtered.length === 1 ? '' : 's'}
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