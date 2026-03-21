import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Zap, Droplets, Building2, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { generateRevenuePdf } from '@/lib/pdfGenerator';

const COLORS = ['hsl(43, 74%, 49%)', 'hsl(48, 96%, 53%)', 'hsl(200, 80%, 50%)'];

const Revenue = () => {
  const { t } = useLanguage();
  const [rentRevenue, setRentRevenue] = useState({ paid: 0, pending: 0 });
  const [elecRevenue, setElecRevenue] = useState({ paid: 0, pending: 0 });
  const [waterRevenue, setWaterRevenue] = useState({ paid: 0, pending: 0 });

  useEffect(() => {
    const fetchRevenue = async () => {
      const { data: apts } = await supabase.from('apartments').select('monthly_rent, rent_paid_months, is_occupied');
      if (apts) {
        const occupied = apts.filter(a => a.is_occupied);
        const paid = occupied.reduce((sum, a) => sum + ((a.monthly_rent || 0) * (a.rent_paid_months || 0)), 0);
        setRentRevenue({ paid, pending: 0 });
      }

      const { data: elec } = await supabase.from('electricity_bills').select('total, is_paid');
      if (elec) {
        const paid = elec.filter(b => b.is_paid).reduce((s, b) => s + (b.total || 0), 0);
        const pending = elec.filter(b => !b.is_paid).reduce((s, b) => s + (b.total || 0), 0);
        setElecRevenue({ paid, pending });
      }

      const { data: water } = await supabase.from('water_bills').select('amount, is_paid');
      if (water) {
        const paid = water.filter(b => b.is_paid).reduce((s, b) => s + (b.amount || 0), 0);
        const pending = water.filter(b => !b.is_paid).reduce((s, b) => s + (b.amount || 0), 0);
        setWaterRevenue({ paid, pending });
      }
    };
    fetchRevenue();
  }, []);

  const totalPaid = rentRevenue.paid + elecRevenue.paid + waterRevenue.paid;
  const totalPending = rentRevenue.pending + elecRevenue.pending + waterRevenue.pending;

  const barData = [
    { name: 'Rent', Collected: rentRevenue.paid, Pending: rentRevenue.pending },
    { name: t('nav.electricity'), Collected: elecRevenue.paid, Pending: elecRevenue.pending },
    { name: t('nav.water'), Collected: waterRevenue.paid, Pending: waterRevenue.pending },
  ];

  const pieData = [
    { name: 'Rent', value: rentRevenue.paid },
    { name: t('nav.electricity'), value: elecRevenue.paid },
    { name: t('nav.water'), value: waterRevenue.paid },
  ].filter(d => d.value > 0);

  const cards = [
    { icon: Building2, label: 'Rent', paid: rentRevenue.paid, pending: rentRevenue.pending, color: 'text-primary' },
    { icon: Zap, label: t('nav.electricity'), paid: elecRevenue.paid, pending: elecRevenue.pending, color: 'text-warning' },
    { icon: Droplets, label: t('nav.water'), paid: waterRevenue.paid, pending: waterRevenue.pending, color: 'text-info' },
  ];

  const handleDownloadReport = () => {
    generateRevenuePdf({
      rentPaid: rentRevenue.paid,
      rentPending: rentRevenue.pending,
      elecPaid: elecRevenue.paid,
      elecPending: elecRevenue.pending,
      waterPaid: waterRevenue.paid,
      waterPending: waterRevenue.pending,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">{t('nav.revenue')}</h1>
        <Button onClick={handleDownloadReport} className="gold-gradient text-card">
          <Download className="w-4 h-4 mr-1" /> Download Report
        </Button>
      </div>

      {/* Total */}
      <Card className="gold-gradient">
        <CardContent className="pt-6 pb-6 text-card">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-8 h-8" />
            <div>
              <p className="text-sm opacity-80">Total Revenue</p>
              <p className="text-3xl font-bold">{totalPaid.toLocaleString()} {t('common.birr')}</p>
            </div>
          </div>
          {totalPending > 0 && (
            <p className="text-sm opacity-80 mt-1">
              Pending: {totalPending.toLocaleString()} {t('common.birr')}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <c.icon className={`w-4 h-4 ${c.color}`} />
                {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{c.paid.toLocaleString()} {t('common.birr')}</p>
              {c.pending > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Pending: {c.pending.toLocaleString()} {t('common.birr')}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => `${value.toLocaleString()} Birr`} />
                <Legend />
                <Bar dataKey="Collected" fill="hsl(43, 74%, 49%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pending" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Collection Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value.toLocaleString()} Birr`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground py-12">No revenue data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Revenue;
