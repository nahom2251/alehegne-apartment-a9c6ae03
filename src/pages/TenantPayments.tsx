import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Loader2, Users, Home, Zap, Droplets, ShieldCheck, Download } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { generateTenantPaymentsPdf } from '@/lib/pdfGenerator';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PAGE_SIZE = 15;

interface Apartment { id: string; label: string; tenant_name: string | null; }

interface PaymentRow {
  key: string;
  apartment_id: string;
  tenant_name: string | null;
  type: 'rent' | 'electricity' | 'water' | 'security';
  month: number;
  year: number;
  amount: number;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
}

const typeMeta: Record<PaymentRow['type'], { label: string; icon: any; color: string }> = {
  rent: { label: 'Rent', icon: Home, color: 'text-primary' },
  electricity: { label: 'Electricity', icon: Zap, color: 'text-warning' },
  water: { label: 'Water', icon: Droplets, color: 'text-info' },
  security: { label: 'Security', icon: ShieldCheck, color: 'text-primary' },
};

const TenantPayments = () => {
  const { t } = useLanguage();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [aptFilter, setAptFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: apts }, { data: rent }, { data: elec }, { data: water }, { data: sec }] = await Promise.all([
        supabase.from('apartments').select('id, label, tenant_name').order('floor').order('position'),
        supabase.from('rent_bills').select('id, apartment_id, tenant_name, month, year, amount, is_paid, paid_at, created_at'),
        supabase.from('electricity_bills').select('id, apartment_id, tenant_name, month, year, total, is_paid, paid_at, created_at'),
        supabase.from('water_bills').select('id, apartment_id, tenant_name, month, year, amount, is_paid, paid_at, created_at'),
        supabase.from('security_bills').select('id, apartment_id, tenant_name, month, year, amount, is_paid, paid_at, created_at'),
      ]);
      if (apts) setApartments(apts);
      const merged: PaymentRow[] = [];
      (rent || []).forEach((r: any) => merged.push({ key: `rent-${r.id}`, apartment_id: r.apartment_id, tenant_name: r.tenant_name, type: 'rent', month: r.month, year: r.year, amount: Number(r.amount || 0), is_paid: !!r.is_paid, paid_at: r.paid_at, created_at: r.created_at }));
      (elec || []).forEach((r: any) => merged.push({ key: `elec-${r.id}`, apartment_id: r.apartment_id, tenant_name: r.tenant_name, type: 'electricity', month: r.month, year: r.year, amount: Number(r.total || 0), is_paid: !!r.is_paid, paid_at: r.paid_at, created_at: r.created_at }));
      (water || []).forEach((r: any) => merged.push({ key: `water-${r.id}`, apartment_id: r.apartment_id, tenant_name: r.tenant_name, type: 'water', month: r.month, year: r.year, amount: Number(r.amount || 0), is_paid: !!r.is_paid, paid_at: r.paid_at, created_at: r.created_at }));
      (sec || []).forEach((r: any) => merged.push({ key: `sec-${r.id}`, apartment_id: r.apartment_id, tenant_name: r.tenant_name, type: 'security', month: r.month, year: r.year, amount: Number(r.amount || 0), is_paid: !!r.is_paid, paid_at: r.paid_at, created_at: r.created_at }));
      // Sort newest first by year, month, then created_at
      merged.sort((a, b) => (b.year - a.year) || (b.month - a.month) || (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setRows(merged);
      setLoading(false);
    };
    load();
  }, []);

  const aptMap = useMemo(() => {
    const m: Record<string, Apartment> = {};
    apartments.forEach((a) => (m[a.id] = a));
    return m;
  }, [apartments]);

  const filtered = useMemo(() => rows.filter((r) =>
    (aptFilter === 'all' || r.apartment_id === aptFilter) &&
    (typeFilter === 'all' || r.type === typeFilter) &&
    (statusFilter === 'all' || (statusFilter === 'paid' ? r.is_paid : !r.is_paid))
  ), [rows, aptFilter, typeFilter, statusFilter]);

  // Sort by tenant when "all", else by date
  const sorted = useMemo(() => {
    if (aptFilter !== 'all') return filtered;
    return [...filtered].sort((a, b) => {
      const an = aptMap[a.apartment_id]?.label || '';
      const bn = aptMap[b.apartment_id]?.label || '';
      if (an !== bn) return an.localeCompare(bn);
      return (b.year - a.year) || (b.month - a.month);
    });
  }, [filtered, aptFilter, aptMap]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Summary
  const totals = useMemo(() => {
    const paid = filtered.filter((r) => r.is_paid).reduce((s, r) => s + r.amount, 0);
    const pending = filtered.filter((r) => !r.is_paid).reduce((s, r) => s + r.amount, 0);
    return { paid, pending, count: filtered.length };
  }, [filtered]);

  const handleDownloadPdf = () => {
    const tenantLabel = aptFilter === 'all' ? 'all' : (aptMap[aptFilter]?.label || 'all');
    generateTenantPaymentsPdf({
      rows: sorted.map((r) => ({
        apartmentLabel: aptMap[r.apartment_id]?.label || '-',
        tenantName: aptMap[r.apartment_id]?.tenant_name || '',
        // prefer snapshot if apartment is now vacant/reassigned
        // (the PDF uses tenantName separately; we still pass current apt name)
        type: typeMeta[r.type].label as 'Rent' | 'Electricity' | 'Water' | 'Security',
        month: MONTHS[r.month - 1],
        year: r.year,
        amount: r.amount,
        isPaid: r.is_paid,
        paidAt: r.paid_at,
      })),
      filters: { tenant: tenantLabel, type: typeFilter, status: statusFilter },
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Tenant Payments
        </h1>
        <Button size="sm" variant="outline" onClick={handleDownloadPdf} disabled={loading || sorted.length === 0}>
          <Download className="w-4 h-4 mr-1" /> Download PDF
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Collected</p>
          <p className="text-lg font-bold text-success">{totals.paid.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-lg font-bold text-destructive">{totals.pending.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Records</p>
          <p className="text-lg font-bold">{totals.count}</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={aptFilter} onValueChange={(v) => { setAptFilter(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Tenant" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tenants</SelectItem>
              {apartments.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.label}{a.tenant_name ? ` — ${a.tenant_name}` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="rent">Rent</SelectItem>
              <SelectItem value="electricity">Electricity</SelectItem>
              <SelectItem value="water">Water</SelectItem>
              <SelectItem value="security">Security</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : pageRows.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No payment records.</p>
      ) : (
        <div className="space-y-2">
          {pageRows.map((r) => {
            const apt = aptMap[r.apartment_id];
            const meta = typeMeta[r.type];
            const Icon = meta.icon;
            return (
              <Card key={r.key}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {apt?.label || '-'}{apt?.tenant_name ? ` — ${apt.tenant_name}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {meta.label} • {MONTHS[r.month - 1]} {r.year}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold">{r.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {t('common.birr')}</p>
                      {r.is_paid ? (
                        <Badge className="bg-success text-success-foreground text-xs">Paid</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">Pending</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-3">
            <p className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages} • {sorted.length} records
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantPayments;