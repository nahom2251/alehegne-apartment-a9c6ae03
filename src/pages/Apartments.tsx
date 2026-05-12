import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Building2, Edit, UserMinus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { differenceInDays, addMonths, parseISO, format } from 'date-fns';

interface Apartment {
  id: string;
  floor: number;
  position: string;
  label: string;
  tenant_name: string | null;
  tenant_phone: string | null;
  move_in_date: string | null;
  monthly_rent: number | null;
  rent_paid_months: number | null;
  is_occupied: boolean | null;
}

const Apartments = () => {
  const { t } = useLanguage();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [paidCounts, setPaidCounts] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<Apartment | null>(null);
  const [form, setForm] = useState({ tenant_name: '', tenant_phone: '', move_in_date: '', monthly_rent: '', rent_paid_months: '' });
  const [saving, setSaving] = useState(false);

  const fetchApartments = async () => {
    const { data } = await supabase.from('apartments').select('*').order('floor');
    if (data) setApartments(data);
    const { data: paidBills } = await supabase
      .from('rent_bills')
      .select('apartment_id')
      .eq('is_paid', true);
    const counts: Record<string, number> = {};
    (paidBills || []).forEach((b: any) => {
      counts[b.apartment_id] = (counts[b.apartment_id] || 0) + 1;
    });
    setPaidCounts(counts);
  };

  useEffect(() => { fetchApartments(); }, []);

  const openEdit = (apt: Apartment) => {
    setEditing(apt);
    setForm({
      tenant_name: apt.tenant_name || '',
      tenant_phone: apt.tenant_phone || '',
      move_in_date: apt.move_in_date || '',
      monthly_rent: String(apt.monthly_rent || ''),
      rent_paid_months: apt.is_occupied ? String(apt.rent_paid_months || '0') : '0',
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const isOccupied = !!form.tenant_name.trim();
    const isFirstRegistration = isOccupied && !editing.is_occupied;
    const initialPaidMonths = isFirstRegistration ? (Number(form.rent_paid_months) || 0) : (editing.rent_paid_months || 0);

    const { error } = await supabase.from('apartments').update({
      tenant_name: isOccupied ? form.tenant_name : null,
      tenant_phone: isOccupied ? form.tenant_phone : null,
      move_in_date: isOccupied ? form.move_in_date || null : null,
      monthly_rent: isOccupied ? Number(form.monthly_rent) || 0 : 0,
      rent_paid_months: isOccupied ? initialPaidMonths : 0,
      is_occupied: isOccupied,
    }).eq('id', editing.id);

    if (error) { setSaving(false); toast.error(error.message); return; }

    // First-time registration: create paid rent bills for the initial months
    if (isFirstRegistration && initialPaidMonths > 0 && form.move_in_date) {
      const moveIn = parseISO(form.move_in_date);
      const rentAmount = Number(form.monthly_rent) || 0;
      const nowIso = new Date().toISOString();
      const billsToInsert = Array.from({ length: initialPaidMonths }, (_, i) => {
        const d = addMonths(moveIn, i);
        return {
          apartment_id: editing.id,
          month: d.getMonth() + 1,
          year: d.getFullYear(),
          amount: rentAmount,
          is_paid: true,
          paid_at: nowIso,
        };
      });
      const { error: billsError } = await supabase.from('rent_bills').insert(billsToInsert);
      if (billsError) { setSaving(false); toast.error(billsError.message); return; }
    }

    setSaving(false);
    toast.success(t('apt.save'));
    setEditing(null);
    fetchApartments();
  };

  const handleRemoveTenant = async (apt: Apartment) => {
    if (!confirm(t('common.confirm'))) return;
    // Snapshot tenant name onto every payment record so history is preserved
    if (apt.tenant_name) {
      await Promise.all([
        supabase.from('rent_bills').update({ tenant_name: apt.tenant_name }).eq('apartment_id', apt.id).is('tenant_name', null),
        supabase.from('electricity_bills').update({ tenant_name: apt.tenant_name }).eq('apartment_id', apt.id).is('tenant_name', null),
        supabase.from('water_bills').update({ tenant_name: apt.tenant_name }).eq('apartment_id', apt.id).is('tenant_name', null),
        supabase.from('security_bills').update({ tenant_name: apt.tenant_name }).eq('apartment_id', apt.id).is('tenant_name', null),
        supabase.from('utility_invoices').update({ tenant_name: apt.tenant_name }).eq('apartment_id', apt.id).is('tenant_name', null),
      ]);
    }
    await supabase.from('apartments').update({
      tenant_name: null, tenant_phone: null, move_in_date: null,
      monthly_rent: 0, rent_paid_months: 0, is_occupied: false,
    }).eq('id', apt.id);
    toast.success(t('apt.removeTenant'));
    fetchApartments();
  };

  const getRentStatus = (apt: Apartment) => {
    if (!apt.move_in_date || !apt.monthly_rent || !apt.is_occupied) return null;
    const moveIn = parseISO(apt.move_in_date);
    const paidUntil = addMonths(moveIn, paidCounts[apt.id] ?? apt.rent_paid_months ?? 0);
    const daysLeft = differenceInDays(paidUntil, new Date());
    return { daysLeft };
  };

  const getStatusBadge = (daysLeft: number) => {
    if (daysLeft < 0) return <span className="status-red px-2 py-0.5 rounded-full text-xs font-medium">🔴 {Math.abs(daysLeft)}d {t('apt.overdue')}</span>;
    if (daysLeft <= 5) return <span className="status-yellow px-2 py-0.5 rounded-full text-xs font-medium">🟡 {daysLeft}d left</span>;
    return <span className="status-green px-2 py-0.5 rounded-full text-xs font-medium">🟢 {daysLeft}d left</span>;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('nav.apartments')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {apartments.map((apt) => {
          const status = getRentStatus(apt);
          return (
            <Card key={apt.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    {apt.label}
                  </CardTitle>
                  {status && getStatusBadge(status.daysLeft)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {apt.is_occupied ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">{t('apt.tenant')}</p>
                        <p className="font-medium">{apt.tenant_name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('apt.phone')}</p>
                        <p className="font-medium">{apt.tenant_phone || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('apt.rent')}</p>
                        <p className="font-medium">{apt.monthly_rent?.toLocaleString()} {t('common.birr')}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('apt.paidMonths')}</p>
                        <p className="font-medium">{paidCounts[apt.id] ?? apt.rent_paid_months ?? 0}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(apt)} className="flex-1">
                        <Edit className="w-3 h-3 mr-1" /> {t('apt.edit')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleRemoveTenant(apt)} className="text-destructive hover:text-destructive">
                        <UserMinus className="w-3 h-3 mr-1" /> {t('apt.removeTenant')}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-3">{t('apt.vacant')}</p>
                    <Button size="sm" onClick={() => openEdit(apt)} className="gold-gradient text-card">
                      {t('apt.addTenant')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.label} - {t('apt.edit')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">{t('apt.tenant')}</label>
              <Input value={form.tenant_name} onChange={e => setForm({...form, tenant_name: e.target.value})} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">{t('apt.phone')}</label>
              <Input value={form.tenant_phone} onChange={e => setForm({...form, tenant_phone: e.target.value})} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">{t('apt.moveIn')}</label>
              <Input type="date" value={form.move_in_date} onChange={e => setForm({...form, move_in_date: e.target.value})} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">{t('apt.rent')} ({t('common.birr')})</label>
              <Input type="number" value={form.monthly_rent} onChange={e => setForm({...form, monthly_rent: e.target.value})} className="mt-1" />
            </div>
            {!editing?.is_occupied ? (
              <div>
                <label className="text-sm font-medium">{t('apt.paidMonths')} (initial)</label>
                <Input type="number" min="0" max="12" value={form.rent_paid_months} onChange={e => setForm({...form, rent_paid_months: e.target.value})} className="mt-1" />
                <p className="text-xs text-muted-foreground mt-1">Records first payment. Future payments are managed in Rent Billing.</p>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium">{t('apt.paidMonths')}</label>
                <Input type="number" value={paidCounts[editing.id] ?? editing.rent_paid_months ?? 0} disabled className="mt-1" />
                <p className="text-xs text-muted-foreground mt-1">Read-only. Manage payments in Rent Billing.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t('apt.cancel')}</Button>
            <Button onClick={handleSave} disabled={saving} className="gold-gradient text-card">
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {t('apt.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Apartments;
