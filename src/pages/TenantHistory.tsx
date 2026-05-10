import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Receipt, CheckCircle, Clock, XCircle } from 'lucide-react';

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const TenantHistory = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [proofs, setProofs] = useState<any[]>([]);
  const [rentPayments, setRentPayments] = useState<any[]>([]);
  const [apartment, setApartment] = useState<any>(null);

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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('tenant.history')}</h1>

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
