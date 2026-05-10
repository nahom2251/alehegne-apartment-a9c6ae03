import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, ChevronLeft, ChevronRight, Receipt } from 'lucide-react';
import { generateCombinedReceiptPdf } from '@/lib/pdfGenerator';
import { toast } from 'sonner';

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PAGE_SIZE = 10;

type Row = {
  apartment_id: string;
  billType: 'Electricity' | 'Water' | 'Security';
  month: number;
  year: number;
  amount: number;
  paidAt?: string;
};

const UtilitiesReceipts = () => {
  const [apartments, setApartments] = useState<any[]>([]);
  const [selectedAptId, setSelectedAptId] = useState<string>('all');
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: apts }, { data: elec }, { data: water }, { data: sec }] = await Promise.all([
        supabase.from('apartments').select('id, label, tenant_name').order('floor').order('position'),
        supabase.from('electricity_bills').select('apartment_id, month, year, total, paid_at').eq('is_paid', true),
        supabase.from('water_bills').select('apartment_id, month, year, amount, paid_at').eq('is_paid', true),
        supabase.from('security_bills').select('apartment_id, month, year, amount, paid_at').eq('is_paid', true),
      ]);
      if (apts) setApartments(apts);
      const all: Row[] = [];
      (elec || []).forEach((b: any) => all.push({ apartment_id: b.apartment_id, billType: 'Electricity', month: b.month, year: b.year, amount: Number(b.total) || 0, paidAt: b.paid_at }));
      (water || []).forEach((b: any) => all.push({ apartment_id: b.apartment_id, billType: 'Water', month: b.month, year: b.year, amount: Number(b.amount) || 0, paidAt: b.paid_at }));
      (sec || []).forEach((b: any) => all.push({ apartment_id: b.apartment_id, billType: 'Security', month: b.month, year: b.year, amount: Number(b.amount) || 0, paidAt: b.paid_at }));
      all.sort((a, b) => (b.paidAt || '').localeCompare(a.paidAt || ''));
      setRows(all);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(
    () => (selectedAptId === 'all' ? rows : rows.filter((r) => r.apartment_id === selectedAptId)),
    [rows, selectedAptId]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const aptMap = useMemo(() => {
    const m: Record<string, any> = {};
    apartments.forEach((a) => (m[a.id] = a));
    return m;
  }, [apartments]);

  const handleDownload = (apartmentId: string) => {
    const apt = aptMap[apartmentId];
    if (!apt) return;
    const items = rows
      .filter((r) => r.apartment_id === apartmentId)
      .map((r) => ({ billType: r.billType, month: monthNames[r.month - 1], year: r.year, amount: r.amount, paidAt: r.paidAt }));
    if (items.length === 0) {
      toast.error('No paid utility bills for this unit');
      return;
    }
    generateCombinedReceiptPdf({
      tenantName: apt.tenant_name || 'Tenant',
      unitLabel: apt.label || '-',
      items,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Receipt className="w-6 h-6 text-primary" />
          Utilities Receipts
        </h1>
        <Select value={selectedAptId} onValueChange={(v) => { setSelectedAptId(v); setPage(1); }}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by apartment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All apartments</SelectItem>
            {apartments.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.label} {a.tenant_name ? `— ${a.tenant_name}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedAptId !== 'all' && (
        <Card className="gold-gradient text-card">
          <CardContent className="pt-6 pb-6 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm opacity-80">{aptMap[selectedAptId]?.label}</p>
              <p className="font-semibold">{aptMap[selectedAptId]?.tenant_name || 'No tenant'}</p>
            </div>
            <Button onClick={() => handleDownload(selectedAptId)} variant="secondary">
              <Download className="w-4 h-4 mr-2" />
              Download Utilities Receipt
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Paid Utility Bills</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : pageItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No paid utility bills found</p>
          ) : (
            <div className="space-y-2">
              {pageItems.map((r, i) => (
                <div key={i} className="flex items-center justify-between border border-border rounded-lg p-3 gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant="outline">{r.billType}</Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {aptMap[r.apartment_id]?.label || '-'}
                        {aptMap[r.apartment_id]?.tenant_name ? ` — ${aptMap[r.apartment_id].tenant_name}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {monthNames[r.month - 1]} {r.year}
                        {r.paidAt ? ` · paid ${new Date(r.paidAt).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{r.amount.toLocaleString()} Birr</span>
                    <Button size="sm" variant="ghost" onClick={() => handleDownload(r.apartment_id)} title="Download combined receipt for this unit">
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
                Page {currentPage} of {totalPages} · {filtered.length} item{filtered.length === 1 ? '' : 's'}
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

export default UtilitiesReceipts;