import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2, Users, Home, AlertCircle, Clock, TrendingUp, Zap, ChevronRight,
} from 'lucide-react';
import {
  differenceInDays, addMonths, parseISO, format, startOfMonth, subMonths,
} from 'date-fns';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';

interface Apartment {
  id: string;
  label: string;
  tenant_name: string | null;
  is_occupied: boolean | null;
  move_in_date: string | null;
  monthly_rent: number | null;
  rent_paid_months: number | null;
}

interface BillRow { amount: number | null; total?: number | null; is_paid: boolean | null; paid_at: string | null; created_at: string; }

const Dashboard = () => {
  const { t } = useLanguage();
  const { isSuperAdmin } = useAuth();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [elec, setElec] = useState<BillRow[]>([]);
  const [water, setWater] = useState<BillRow[]>([]);
  const [security, setSecurity] = useState<BillRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      const [aptRes, pendingRes, elecRes, waterRes, secRes] = await Promise.all([
        supabase.from('apartments').select('*').order('floor'),
        isSuperAdmin
          ? supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending')
          : Promise.resolve({ count: 0 } as any),
        supabase.from('electricity_bills').select('total, is_paid, paid_at, created_at'),
        supabase.from('water_bills').select('amount, is_paid, paid_at, created_at'),
        supabase.from('security_bills').select('amount, is_paid, paid_at, created_at'),
      ]);
      if (cancelled) return;
      if (aptRes.data) setApartments(aptRes.data);
      setPendingCount((pendingRes as any).count || 0);
      setElec((elecRes.data as any) || []);
      setWater((waterRes.data as any) || []);
      setSecurity((secRes.data as any) || []);
      setLoading(false);
    };
    fetchData();
    return () => { cancelled = true; };
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

  // Derived stats
  const now = new Date();
  const rentStatuses = occupied
    .map(a => ({ apt: a, status: getRentStatus(a) }))
    .filter(x => x.status !== null) as { apt: Apartment; status: { daysLeft: number; paidUntil: Date } }[];
  const overdueCount = rentStatuses.filter(x => x.status.daysLeft < 0).length;
  const dueThisWeekCount = rentStatuses.filter(x => x.status.daysLeft >= 0 && x.status.daysLeft <= 7).length;

  const rentRevenueMonth = occupied.reduce((s, a) => s + (a.monthly_rent || 0), 0);
  const sumPaidThisMonth = (rows: BillRow[]) => {
    const start = startOfMonth(now);
    return rows
      .filter(r => r.is_paid && r.paid_at && new Date(r.paid_at) >= start)
      .reduce((s, r) => s + ((r.total ?? r.amount) || 0), 0);
  };
  const utilityRevenueMonth = sumPaidThisMonth(elec) + sumPaidThisMonth(water) + sumPaidThisMonth(security);
  const totalRevenueMonth = rentRevenueMonth + utilityRevenueMonth;

  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, i) => {
      const d = subMonths(startOfMonth(now), 5 - i);
      return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM'), rent: 0, utility: 0 };
    });
    const byKey = Object.fromEntries(months.map(m => [m.key, m]));
    // Rent: distribute monthly_rent for each occupied apt over the 6 months (assumes active)
    occupied.forEach(a => {
      months.forEach(m => { m.rent += a.monthly_rent || 0; });
    });
    // Utility: sum paid bills grouped by paid_at month
    const addUtil = (rows: BillRow[]) => rows.forEach(r => {
      if (!r.is_paid || !r.paid_at) return;
      const k = format(new Date(r.paid_at), 'yyyy-MM');
      if (byKey[k]) byKey[k].utility += ((r.total ?? r.amount) || 0);
    });
    addUtil(elec); addUtil(water); addUtil(security);
    return months;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apartments, elec, water, security]);

  const topRent = rentStatuses
    .slice()
    .sort((a, b) => a.status.daysLeft - b.status.daysLeft)
    .slice(0, 4);

  const StatCard = ({
    icon: Icon, label, value, sub, tone,
  }: { icon: any; label: string; value: React.ReactNode; sub?: string; tone: 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'muted' }) => {
    const toneMap: Record<string, string> = {
      primary: 'bg-primary/10 text-primary',
      success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
      danger: 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
      warning: 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
      info: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400',
      muted: 'bg-muted text-muted-foreground',
    };
    return (
      <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${toneMap[tone]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-tight">{value}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
            {sub && <p className="text-xs text-muted-foreground/80 mt-0.5">{sub}</p>}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('nav.dashboard')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {format(now, 'MMMM yyyy')} — {t('dash.subtitle')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label={t('dash.totalApts')} value={apartments.length} tone="muted" />
        <StatCard icon={Home} label={t('dash.occupied')} value={occupied.length} sub={`${vacant.length} ${t('dash.vacantLabel')}`} tone="success" />
        <StatCard icon={AlertCircle} label={t('dash.overdueRent')} value={overdueCount} tone="danger" />
        <StatCard icon={Clock} label={t('dash.dueThisWeek')} value={dueThisWeekCount} tone="warning" />
        <StatCard icon={TrendingUp} label={t('dash.rentRevenue')} value={<>{rentRevenueMonth.toLocaleString()} {t('common.birr')}</>} sub={t('dash.thisMonth')} tone="success" />
        <StatCard icon={Zap} label={t('dash.utilityRevenue')} value={<>{utilityRevenueMonth.toLocaleString()} {t('common.birr')}</>} sub={t('dash.thisMonth')} tone="info" />
        <StatCard icon={TrendingUp} label={t('dash.totalRevenue')} value={<>{totalRevenueMonth.toLocaleString()} {t('common.birr')}</>} sub={t('dash.thisMonth')} tone="primary" />
        <StatCard icon={Users} label={t('dash.activeTenants')} value={occupied.length} tone="muted" />
      </div>

      {/* Revenue Overview */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">{t('dash.revenueOverview')}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{t('dash.last6Months')}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false}
                     tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
              <Tooltip formatter={(v: number) => `${v.toLocaleString()} ${t('common.birr')}`} contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="rent" name={t('rev.rent')} stroke="hsl(var(--foreground))" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="utility" name={t('nav.electricity')} stroke="hsl(160, 60%, 45%)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Rent Status */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t('dash.rentStatus')}</CardTitle>
            <Link to="/rent" className="text-sm text-primary flex items-center gap-0.5 hover:underline">
              {t('dash.viewAll')} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {topRent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t('dash.noActiveTenants')}</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {topRent.map(({ apt, status }) => (
                <li key={apt.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{apt.tenant_name}</p>
                    <p className="text-xs text-muted-foreground">{apt.label}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${getStatusColor(status.daysLeft)}`}>
                    {status.daysLeft < 0
                      ? `${Math.abs(status.daysLeft)} ${t('common.days')} ${t('apt.overdue')}`
                      : `${status.daysLeft} ${t('apt.daysLeft')}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Apartment Occupancy */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t('dash.apartmentOccupancy')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {loading && apartments.length === 0
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-4 rounded-lg border border-border bg-card space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))
              : apartments.map((apt) => {
              const status = getRentStatus(apt);
              return (
                <div
                  key={apt.id}
                  className="p-3 rounded-xl border border-border/60 bg-card text-center hover:shadow-md transition-shadow"
                >
                  <p className="font-semibold text-base">{apt.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">
                    {apt.floor === 2 ? 'Second' : apt.floor === 3 ? 'Third' : apt.floor === 4 ? 'Fourth' : `Floor ${apt.floor}`}
                    {' '}{apt.position}
                  </p>
                  {apt.is_occupied ? (
                    <p className="text-xs mt-1 text-emerald-600 font-medium truncate">{apt.tenant_name}</p>
                  ) : (
                    <p className="text-xs mt-1 text-muted-foreground">{t('apt.vacant')}</p>
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
