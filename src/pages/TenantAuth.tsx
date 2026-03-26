import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AvailableApartment {
  id: string;
  label: string;
  tenant_name: string | null;
}

const TenantAuth = () => {
  const [view, setView] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedApartment, setSelectedApartment] = useState('');
  const [apartments, setApartments] = useState<AvailableApartment[]>([]);
  const [autoFilledName, setAutoFilledName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (view === 'register') {
      fetchAvailableApartments();
    }
  }, [view]);

  const fetchAvailableApartments = async () => {
    // Fetch apartments that are occupied but don't have a tenant_user_id yet
    const { data } = await supabase
      .from('apartments')
      .select('id, label, tenant_name, tenant_user_id, is_occupied')
      .eq('is_occupied', true)
      .is('tenant_user_id', null);
    if (data) setApartments(data as AvailableApartment[]);
  };

  const handleApartmentChange = (aptId: string) => {
    setSelectedApartment(aptId);
    const apt = apartments.find(a => a.id === aptId);
    setAutoFilledName(apt?.tenant_name || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (view === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      }
    } else {
      if (!selectedApartment) {
        toast.error('Please select your apartment');
        setSubmitting(false);
        return;
      }
      if (!phone.trim()) {
        toast.error('Please enter your phone number');
        setSubmitting(false);
        return;
      }

      // Sign up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: autoFilledName || 'Tenant' },
          emailRedirectTo: window.location.origin,
        },
      });

      if (signUpError) {
        toast.error(signUpError.message);
        setSubmitting(false);
        return;
      }

      if (signUpData.user) {
        // Call register_tenant function
        const { error: regError } = await supabase.rpc('register_tenant', {
          _apartment_id: selectedApartment,
          _phone: phone,
        });

        if (regError) {
          toast.error(regError.message);
        } else {
          toast.success('Account created! You can now sign in.');
          setView('login');
        }
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageToggle />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-border">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-xl gold-gradient flex items-center justify-center mb-4 shadow-md">
              <Building2 className="w-8 h-8 text-card" />
            </div>
            <CardTitle className="text-xl font-bold">
              {view === 'login' ? t('tenant.login') : t('tenant.register')}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t('tenant.portal')}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {view === 'register' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-foreground">{t('tenant.selectApartment')}</label>
                    <Select value={selectedApartment} onValueChange={handleApartmentChange}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t('tenant.selectApartment')} />
                      </SelectTrigger>
                      <SelectContent>
                        {apartments.map(apt => (
                          <SelectItem key={apt.id} value={apt.id}>
                            {apt.label} - {apt.tenant_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {autoFilledName && (
                    <div>
                      <label className="text-sm font-medium text-foreground">{t('auth.fullName')}</label>
                      <Input value={autoFilledName} disabled className="mt-1 bg-muted" />
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-foreground">{t('tenant.phone')}</label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="09XXXXXXXX"
                      className="mt-1"
                      required
                    />
                  </div>
                </>
              )}
              <div>
                <label className="text-sm font-medium text-foreground">{t('auth.email')}</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('auth.email')} className="mt-1" required />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">{t('auth.password')}</label>
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={t('auth.password')}
                    required
                    minLength={6}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full gold-gradient text-card font-semibold" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {view === 'login' ? t('auth.loginBtn') : t('auth.registerBtn')}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button onClick={() => setView(view === 'login' ? 'register' : 'login')} className="text-sm text-primary hover:underline">
                {view === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
              </button>
            </div>
            <div className="mt-3 text-center">
              <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mx-auto">
                <ArrowLeft className="w-3 h-3" /> {t('tenant.backToHome')}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <footer className="text-center py-3 text-xs text-muted-foreground border-t border-border">
        {t('app.powered')}
      </footer>
    </div>
  );
};

export default TenantAuth;
