import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { differenceInDays, addMonths, parseISO, format } from 'date-fns';

const TenantDashboard = () => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const [apartment, setApartment] = useState<any>(null);
  const [pendingBills, setPendingBills] = useState({ electricity: 0, water: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      // Get tenant's apartment
      const { data: apt } = await supabase
        .from('apartments')
        .select('*')
        .eq('tenant_user_id', user.id)
        .single();
      if (apt) setApartment(apt);

      if (apt) {
        // Count pending bills
        const { count: elecCount } = await supabase
          .from('electricity_bills')
          .select('*', { count: 'exact', head: true })
          .eq('apartment_id', apt.id)
          .eq('is_paid', false);

        const { count: waterCount } = await supabase
          .from('water_bills')
          .select('*', { count: 'exact', head: true })
          .eq('apartment_id', apt.id)
          .eq('is_paid', false);

        setPendingBills({ electricity: elecCount || 0, water: waterCount || 0 });
      }
    };
    fetchData();
  }, [user]);

  const getRentStatus = () => {
    if (!apartment?.move_in_date || !apartment?.monthly_rent) return null;
    const moveIn = parseISO(apartment.move_in_date);
    const paidUntil = addMonths(moveIn, apartment.rent_paid_months || 0);
    const daysLeft = differenceInDays(paidUntil, new Date());
    return { daysLeft, paidUntil };
  };

  const rentStatus = getRentStatus();

  const getStatusInfo = () => {
    if (!rentStatus) return { label: t('common.loading'), color: 'text-muted-foreground', bg: 'bg-muted', icon: Clock };
    if (rentStatus.daysLeft < 0) return { label: `${Math.abs(rentStatus.daysLeft)} ${t('common.days')} ${t('apt.overdue')}`, color: 'text-destructive', bg: 'status-red', icon: AlertTriangle };
    if (rentStatus.daysLeft <= 5) return { label: `${rentStatus.daysLeft} ${t('apt.daysLeft')}`, color: 'text-warning', bg: 'status-yellow', icon: Clock };
    return { label: `${rentStatus.daysLeft} ${t('apt.daysLeft')}`, color: 'text-success', bg: 'status-green', icon: CheckCircle };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('tenant.welcome')}, {profile?.full_name}</h1>

      {/* Apartment Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {apartment?.label || t('common.loading')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">{t('apt.tenant')}</p>
              <p className="font-medium">{apartment?.tenant_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('apt.rent')}</p>
              <p className="font-medium">{apartment?.monthly_rent?.toLocaleString()} {t('common.birr')}</p>
            </div>
          </div>

          {/* Rent Status Card */}
          <div className={`p-4 rounded-lg ${statusInfo.bg}`}>
            <div className="flex items-center gap-3">
              <statusInfo.icon className="w-8 h-8" />
              <div>
                <p className="text-sm font-medium">{t('tenant.rentStatus')}</p>
                <p className="text-lg font-bold">{statusInfo.label}</p>
                {rentStatus && (
                  <p className="text-xs opacity-75">
                    {t('tenant.dueDate')}: {format(rentStatus.paidUntil, 'MMM dd, yyyy')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-primary">{pendingBills.electricity}</p>
            <p className="text-xs text-muted-foreground">{t('tenant.pendingElec')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-info">{pendingBills.water}</p>
            <p className="text-xs text-muted-foreground">{t('tenant.pendingWater')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TenantDashboard;
