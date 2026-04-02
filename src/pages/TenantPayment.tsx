import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import cbeLogo from '@/assets/cbe-logo.jpeg';
import telebirrLogo from '@/assets/telebirr-logo.jpeg';

const TenantPayment = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [apartment, setApartment] = useState<any>(null);
  const [billType, setBillType] = useState('rent');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('apartments')
      .select('*')
      .eq('tenant_user_id', user.id)
      .single()
      .then(({ data }) => { if (data) setApartment(data); });
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      if (selected.size > 5 * 1024 * 1024) {
        toast.error('File must be under 5MB');
        return;
      }
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const handleSubmit = async () => {
    if (!file || !apartment || !user) return;
    setUploading(true);

    try {
      // Upload image
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);

      // Insert payment proof record
      const { error: insertError } = await supabase
        .from('payment_proofs')
        .insert({
          tenant_user_id: user.id,
          apartment_id: apartment.id,
          bill_type: billType,
          image_url: urlData.publicUrl || filePath,
          status: 'submitted',
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
        });

      if (insertError) throw insertError;

      toast.success(t('tenant.proofSubmitted'));
      setFile(null);
      setPreviewUrl(null);
    } catch (error: any) {
      toast.error(error.message);
    }
    setUploading(false);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('tenant.payment')}</h1>

      {/* Payment Instructions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            {t('tenant.rentPayment')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-sm"><span className="font-medium">Method:</span> CBE Bank Transfer</p>
          <p className="text-sm"><span className="font-medium">Account:</span> Bayush Kassa</p>
          <p className="text-sm font-mono text-primary font-semibold">1000499143072</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            {t('tenant.utilityPayment')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-sm"><span className="font-medium">Method:</span> Telebirr</p>
          <p className="text-sm"><span className="font-medium">Account:</span> Alehegne</p>
          <p className="text-sm font-mono text-primary font-semibold">0911238816</p>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" />
            {t('tenant.uploadProof')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">{t('tenant.billType')}</label>
            <Select value={billType} onValueChange={setBillType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rent">{t('tenant.rent')}</SelectItem>
                <SelectItem value="electricity">{t('nav.electricity')}</SelectItem>
                <SelectItem value="water">{t('nav.water')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">{t('tenant.screenshot')}</label>
            <div className="mt-1">
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
            </div>
          </div>

          {previewUrl && (
            <div className="relative">
              <img src={previewUrl} alt="Preview" className="w-full max-h-48 object-contain rounded-lg border border-border" />
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!file || uploading}
            className="w-full gold-gradient text-card font-semibold"
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('common.loading')}</>
            ) : (
              <><CheckCircle className="w-4 h-4 mr-2" /> {t('tenant.submitProof')}</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantPayment;
