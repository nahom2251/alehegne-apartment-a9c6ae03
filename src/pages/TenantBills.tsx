import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, Droplets, Home, Upload, CheckCircle, Loader2, ImageIcon, ShieldCheck } from 'lucide-react';
import { differenceInDays, addMonths, parseISO, format } from 'date-fns';
import { toast } from 'sonner';

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const TenantBills = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [apartment, setApartment] = useState<any>(null);
  const [electricityBills, setElectricityBills] = useState<any[]>([]);
  const [waterBills, setWaterBills] = useState<any[]>([]);
  const [uploadingBillId, setUploadingBillId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ billId: string; billType: string; file: File; preview: string } | null>(null);

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

  const handleFileSelect = (billId: string, billType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return; }
    setSelectedFile({ billId, billType, file, preview: URL.createObjectURL(file) });
  };

  const handleSubmitProof = async (billId: string, billType: string, month: number, year: number, amount?: number) => {
    if (!selectedFile || selectedFile.billId !== billId || !apartment || !user) return;
    setUploadingBillId(billId);

    try {
      const fileExt = selectedFile.file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, selectedFile.file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('payment_proofs')
        .insert({
          tenant_user_id: user.id,
          apartment_id: apartment.id,
          bill_type: billType,
          bill_id: billId,
          image_url: urlData.publicUrl || filePath,
          status: 'submitted',
          month,
          year,
          amount: amount || null,
        });
      if (insertError) throw insertError;

      toast.success(t('tenant.proofSubmitted'));
      setSelectedFile(null);
    } catch (error: any) {
      toast.error(error.message);
    }
    setUploadingBillId(null);
  };

  const handleSubmitRentProof = async () => {
    if (!selectedFile || selectedFile.billType !== 'rent' || !apartment || !user) return;
    setUploadingBillId('rent');

    try {
      const fileExt = selectedFile.file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, selectedFile.file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('payment_proofs')
        .insert({
          tenant_user_id: user.id,
          apartment_id: apartment.id,
          bill_type: 'rent',
          image_url: urlData.publicUrl || filePath,
          status: 'submitted',
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          amount: apartment.monthly_rent || null,
        });
      if (insertError) throw insertError;

      toast.success(t('tenant.proofSubmitted'));
      setSelectedFile(null);
    } catch (error: any) {
      toast.error(error.message);
    }
    setUploadingBillId(null);
  };

  const getRentInfo = () => {
    if (!apartment?.move_in_date || !apartment?.monthly_rent) return null;
    const moveIn = parseISO(apartment.move_in_date);
    const paidUntil = addMonths(moveIn, apartment.rent_paid_months || 0);
    const daysLeft = differenceInDays(paidUntil, new Date());
    return { daysLeft, paidUntil, amount: apartment.monthly_rent };
  };

  const rentInfo = getRentInfo();

  const UploadSection = ({ billId, billType }: { billId: string; billType: string }) => (
    <div className="mt-3 space-y-2">
      {selectedFile?.billId === billId && selectedFile.preview && (
        <img src={selectedFile.preview} alt="Preview" className="w-full max-h-32 object-contain rounded-lg border border-border" />
      )}
      <div className="flex gap-2">
        <label className="flex-1 cursor-pointer">
          <Input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(billId, billType, e)} />
          <div className="flex items-center justify-center gap-2 border border-dashed border-border rounded-lg py-2 px-3 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
            <ImageIcon className="w-4 h-4" />
            {selectedFile?.billId === billId ? selectedFile.file.name : t('tenant.screenshot')}
          </div>
        </label>
      </div>
    </div>
  );

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

                <UploadSection billId="rent" billType="rent" />

                {selectedFile?.billId === 'rent' && (
                  <Button
                    onClick={handleSubmitRentProof}
                    disabled={uploadingBillId === 'rent'}
                    className="w-full gold-gradient text-card font-semibold"
                    size="sm"
                  >
                    {uploadingBillId === 'rent' ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('common.loading')}</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" /> {t('tenant.submitProof')}</>
                    )}
                  </Button>
                )}
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

                {!bill.is_paid && (
                  <>
                    <UploadSection billId={bill.id} billType="electricity" />
                    {selectedFile?.billId === bill.id && (
                      <Button
                        onClick={() => handleSubmitProof(bill.id, 'electricity', bill.month, bill.year, bill.total)}
                        disabled={uploadingBillId === bill.id}
                        className="w-full gold-gradient text-card font-semibold mt-2"
                        size="sm"
                      >
                        {uploadingBillId === bill.id ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('common.loading')}</>
                        ) : (
                          <><Upload className="w-4 h-4 mr-2" /> {t('tenant.submitProof')}</>
                        )}
                      </Button>
                    )}
                  </>
                )}
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

                {!bill.is_paid && (
                  <>
                    <UploadSection billId={bill.id} billType="water" />
                    {selectedFile?.billId === bill.id && (
                      <Button
                        onClick={() => handleSubmitProof(bill.id, 'water', bill.month, bill.year, bill.amount)}
                        disabled={uploadingBillId === bill.id}
                        className="w-full gold-gradient text-card font-semibold mt-2"
                        size="sm"
                      >
                        {uploadingBillId === bill.id ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('common.loading')}</>
                        ) : (
                          <><Upload className="w-4 h-4 mr-2" /> {t('tenant.submitProof')}</>
                        )}
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TenantBills;
