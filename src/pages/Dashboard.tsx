import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, DollarSign, Home, AlertTriangle, CheckCircle } from 'lucide-react';
import { differenceInDays, addMonths, parseISO } from 'date-fns';

interface Apartment {
  id: string;
  label: string;
  tenant_name: string | null;
  is_occupied: boolean | null;
  move_in_date: string | null;
  monthly_rent: number | null;
  rent_paid_months: number | null;
}

const Dashboard = () => {
  const { t } = useLanguage();
  const { isSuperAdmin } = useAuth();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('apartments').select('*').order('floor');
      if (data) setApartments(data);

      if (isSuperAdmin) {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        setPendingCount(count || 0);
      }
    };
    fetchData();
  }, [isSuperAdmin]);

  const occupied = apartments.filter(a => a.is_occupied);
  const vacant = apartments.filter(a => !a.is_occupied);

  const getRentStatus = (apt: Apartment) => {
    if (!apt.move_in_date || !apt.monthly_rent || !apt.is_occupied) return null;
    const moveIn = parseISO(apt.move_in_date);
    const paidUntil = addMonths(moveIn, apt.rent_paid_months || 0);
    const daysLeft = differenceInDays(paidUntil, new Date());
    return { daysLeft, paidUntil };
  };

  const getStatusColor = (daysLeft: number) => {
    if (daysLeft < 0) return 'status-red';
    if (daysLeft <= 5) return 'status-yellow';
    return 'status-green';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('nav.dashboard')}</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-card" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('dash.totalApts')}</p>
              <p className="text-xl font-bold">{apartments.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 status-green">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('dash.occupied')}</p>
              <p className="text-xl font-bold">{occupied.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-muted">
              <Home className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('dash.vacant')}</p>
              <p className="text-xl font-bold">{vacant.length}</p>
            </div>
          </CardContent>
        </Card>
        {isSuperAdmin && (
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 status-yellow">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('dash.pendingUsers')}</p>
                <p className="text-xl font-bold">{pendingCount}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Apartment Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('dash.overview')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {apartments.map((apt) => {
              const status = getRentStatus(apt);
              return (
                <div
                  key={apt.id}
                  className="p-4 rounded-lg border border-border bg-card hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{apt.label}</span>
                    {apt.is_occupied ? (
                      status && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(status.daysLeft)}`}>
                          {status.daysLeft < 0
                            ? `${Math.abs(status.daysLeft)} ${t('common.days')} ${t('apt.overdue')}`
                            : `${status.daysLeft} ${t('apt.daysLeft')}`}
                        </span>
                      )
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {t('apt.vacant')}
                      </span>
                    )}
                  </div>
                  {apt.is_occupied ? (
                    <div className="text-sm space-y-1">
                      <p className="text-foreground">{apt.tenant_name}</p>
                        <p className="text-muted-foreground">
                        {apt.monthly_rent?.toLocaleString()} {t('common.birr')}{t('apt.perMonth')}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('apt.addTenant')}</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
