import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, Droplets, Home } from 'lucide-react';
import { differenceInDays, addMonths, parseISO, format } from 'date-fns';

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const TenantBills = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [apartment, setApartment] = useState<any>(null);
  const [electricityBills, setElectricityBills] = useState<any[]>([]);
  const [waterBills, setWaterBills] = useState<any[]>([]);

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

        const { data: elec } = await supabase
          .from('electricity_bills')
          .select('*')
          .eq('apartment_id', apt.id)
          .order('year', { ascending: false })
          .order('month', { ascending: false });
        if (elec) setElectricityBills(elec);

        const { data: water } = await supabase
          .from('water_bills')
          .select('*')
          .eq('apartment_id', apt.id)
          .order('year', { ascending: false })
          .order('month', { ascending: false });
        if (water) setWaterBills(water);
      }
    };
    fetchData();
  }, [user]);

  const getRentInfo = () => {
    if (!apartment?.move_in_date || !apartment?.monthly_rent) return null;
    const moveIn = parseISO(apartment.move_in_date);
    const paidUntil = addMonths(moveIn, apartment.rent_paid_months || 0);
    const daysLeft = differenceInDays(paidUntil, new Date());
    return { daysLeft, paidUntil, amount: apartment.monthly_rent };
  };

  const rentInfo = getRentInfo();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('tenant.bills')}</h1>

      <Tabs defaultValue="rent">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="rent" className="text-xs gap-1"><Home className="w-3.5 h-3.5" />{t('tenant.rent')}</TabsTrigger>
          <TabsTrigger value="electricity" className="text-xs gap-1"><Zap className="w-3.5 h-3.5" />{t('nav.electricity')}</TabsTrigger>
          <TabsTrigger value="water" className="text-xs gap-1"><Droplets className="w-3.5 h-3.5" />{t('nav.water')}</TabsTrigger>
        </TabsList>

        <TabsContent value="rent" className="mt-4">
          {rentInfo ? (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{t('apt.rent')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('tenant.dueDate')}: {format(rentInfo.paidUntil, 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{rentInfo.amount.toLocaleString()} {t('common.birr')}</p>
                    <Badge variant={rentInfo.daysLeft < 0 ? 'destructive' : rentInfo.daysLeft <= 5 ? 'secondary' : 'default'}>
                      {rentInfo.daysLeft < 0 ? t('apt.overdue') : `${rentInfo.daysLeft} ${t('apt.daysLeft')}`}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="text-muted-foreground text-center py-8">{t('common.loading')}</p>
          )}
        </TabsContent>

        <TabsContent value="electricity" className="mt-4 space-y-3">
          {electricityBills.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No electricity bills</p>
          ) : electricityBills.map(bill => (
            <Card key={bill.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{monthNames[bill.month - 1]} {bill.year}</p>
                    <p className="text-sm text-muted-foreground">{bill.kwh} kWh</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{bill.total?.toLocaleString()} {t('common.birr')}</p>
                    <Badge variant={bill.is_paid ? 'default' : 'destructive'}>
                      {bill.is_paid ? t('bill.paid') : t('bill.unpaid')}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="water" className="mt-4 space-y-3">
          {waterBills.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No water bills</p>
          ) : waterBills.map(bill => (
            <Card key={bill.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{monthNames[bill.month - 1]} {bill.year}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{bill.amount?.toLocaleString()} {t('common.birr')}</p>
                    <Badge variant={bill.is_paid ? 'default' : 'destructive'}>
                      {bill.is_paid ? t('bill.paid') : t('bill.unpaid')}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TenantBills;
