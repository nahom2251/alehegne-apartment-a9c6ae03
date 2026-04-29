import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Receipt, CheckCircle, Clock, XCircle, Download } from 'lucide-react';
import { generateCombinedReceiptPdf } from '@/lib/pdfGenerator';
import { toast } from 'sonner';

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const TenantHistory = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [proofs, setProofs] = useState<any[]>([]);
  const [rentPayments, setRentPayments] = useState<any[]>([]);
  const [apartment, setApartment] = useState<any>(null);
  const [elecPaid, setElecPaid] = useState<any[]>([]);
  const [waterPaid, setWaterPaid] = useState<any[]>([]);
  const [securityPaid, setSecurityPaid] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: apt } = await supabase
        .from('apartments')
        .select('*')
        .eq('tenant_user_id', user.id)
        .single();
      if (apt) {
        setApartment(apt);

        const { data: proofData } = await supabase
          .from('payment_proofs')
          .select('*')
          .eq('tenant_user_id', user.id)
          .order('created_at', { ascending: false });
        if (proofData) setProofs(proofData);

        const { data: rentData } = await supabase
          .from('rent_payments')
          .select('*')
          .eq('apartment_id', apt.id)
          .order('payment_date', { ascending: false });
        if (rentData) setRentPayments(rentData);

        const { data: elec } = await supabase
          .from('electricity_bills')
          .select('*')
          .eq('apartment_id', apt.id)
          .eq('is_paid', true);
        if (elec) setElecPaid(elec);

        const { data: water } = await supabase
          .from('water_bills')
          .select('*')
          .eq('apartment_id', apt.id)
          .eq('is_paid', true);
        if (water) setWaterPaid(water);

        const { data: sec } = await supabase
          .from('security_bills')
          .select('*')
          .eq('apartment_id', apt.id)
          .eq('is_paid', true);
        if (sec) setSecurityPaid(sec);
      }
    };
    fetchData();
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusVariant = (status: string): 'default' | 'destructive' | 'secondary' => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const handleDownloadTotalReceipt = () => {
    if (!apartment) return;
    const items: Array<{ billType: 'Rent' | 'Electricity' | 'Water' | 'Security'; month: string; year: number; amount: number; paidAt?: string }> = [];

    rentPayments.forEach((p) => {
      const d = new Date(p.payment_date);
      items.push({ billType: 'Rent', month: monthNames[d.getMonth()], year: d.getFullYear(), amount: Number(p.amount) || 0, paidAt: p.payment_date });
    });
    elecPaid.forEach((b) => items.push({ billType: 'Electricity', month: monthNames[b.month - 1], year: b.year, amount: Number(b.total) || 0, paidAt: b.paid_at }));
    waterPaid.forEach((b) => items.push({ billType: 'Water', month: monthNames[b.month - 1], year: b.year, amount: Number(b.amount) || 0, paidAt: b.paid_at }));
    securityPaid.forEach((b) => items.push({ billType: 'Security', month: monthNames[b.month - 1], year: b.year, amount: Number(b.amount) || 0, paidAt: b.paid_at }));

    if (items.length === 0) {
      toast.error('No paid items to include in receipt');
      return;
    }

    generateCombinedReceiptPdf({
      tenantName: apartment.tenant_name || 'Tenant',
      unitLabel: apartment.label || '-',
      items,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t('tenant.history')}</h1>
        <Button
          onClick={handleDownloadTotalReceipt}
          size="sm"
          className="gold-gradient text-card font-semibold"
        >
          <Download className="w-4 h-4 mr-2" />
          Total Receipt
        </Button>
      </div>

      {/* Rent Payments */}
      {rentPayments.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('tenant.rentPayments')}</h2>
          {rentPayments.map(payment => (
            <Card key={payment.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg status-green flex items-center justify-center">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{t('tenant.rent')}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{payment.amount.toLocaleString()} {t('common.birr')}</p>
                    <p className="text-xs text-muted-foreground">{payment.months_paid} {t('tenant.months')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Payment Proofs */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('tenant.submittedProofs')}</h2>
        {proofs.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t('tenant.noProofs')}</p>
        ) : proofs.map(proof => (
          <Card key={proof.id}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(proof.status)}
                  <div>
                    <p className="font-medium text-sm capitalize">{proof.bill_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {proof.month && proof.year ? `${monthNames[proof.month - 1]} ${proof.year}` : format(new Date(proof.created_at), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                <Badge variant={getStatusVariant(proof.status)}>
                  {proof.status === 'submitted' ? t('tenant.submitted') : proof.status === 'approved' ? t('bill.paid') : t('tenant.rejected')}
                </Badge>
              </div>
              {proof.notes && (
                <p className="text-xs text-muted-foreground mt-2 pl-7">{proof.notes}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TenantHistory;
