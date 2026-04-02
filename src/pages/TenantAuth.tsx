import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, Eye, EyeOff, Loader2, ArrowLeft, Search, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const TenantAuth = () => {
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Phone lookup state
  const [lookupLoading, setLookupLoading] = useState(false);
  const [foundApartment, setFoundApartment] = useState<{ apartment_id: string; apartment_label: string; tenant_name: string } | null>(null);
  const [phoneLookedUp, setPhoneLookedUp] = useState(false);

  // Load remembered email
  useEffect(() => {
    const remembered = localStorage.getItem('tenant_remember') === 'true';
    const savedEmail = localStorage.getItem('tenant_email');
    if (remembered && savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handlePhoneLookup = async () => {
    if (!phone.trim()) { toast.error(t('tenant.enterPhone')); return; }
    setLookupLoading(true);
    setFoundApartment(null);
    setPhoneLookedUp(false);

    const { data, error } = await supabase.rpc('lookup_tenant_by_phone', { _phone: phone.trim() });
    setLookupLoading(false);
    setPhoneLookedUp(true);

    if (error) { toast.error(error.message); return; }
    if (data && data.length > 0) {
      setFoundApartment(data[0]);
    } else {
      toast.error(t('tenant.phoneNotFound'));
    }
  };

  const resetRegisterForm = () => {
    setPhone('');
    setFoundApartment(null);
    setPhoneLookedUp(false);
    setEmail('');
    setPassword('');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('Please enter your email'); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('auth.resetLinkSent'));
    setView('login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (view === 'login') {
      if (rememberMe) {
        localStorage.setItem('tenant_email', email);
        localStorage.setItem('tenant_remember', 'true');
      } else {
        localStorage.removeItem('tenant_email');
        localStorage.removeItem('tenant_remember');
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    } else if (view === 'register') {
      if (!foundApartment) { toast.error(t('tenant.lookupFirst')); setSubmitting(false); return; }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { full_name: foundApartment.tenant_name || 'Tenant' },
          emailRedirectTo: window.location.origin,
        },
      });
      if (signUpError) { toast.error(signUpError.message); setSubmitting(false); return; }

      if (signUpData.user) {
        const { error: regError } = await supabase.rpc('register_tenant', {
          _apartment_id: foundApartment.apartment_id,
          _phone: phone,
        });
        if (regError) toast.error(regError.message);
        else { toast.success(t('tenant.accountCreated')); resetRegisterForm(); setView('login'); }
      }
    }
    setSubmitting(false);
  };

  const renderForgotForm = () => (
    <form onSubmit={handleForgotPassword} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-foreground">{t('auth.email')}</label>
        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('auth.email')} className="mt-1" required />
      </div>
      <Button type="submit" className="w-full gold-gradient text-card font-semibold" disabled={submitting}>
        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {t('auth.sendResetLink')}
      </Button>
      <div className="text-center">
        <button type="button" onClick={() => setView('login')} className="text-sm text-primary hover:underline">
          {t('auth.backToLogin')}
        </button>
      </div>
    </form>
  );

  const renderRegisterForm = () => (
    <div className="space-y-4">
      {/* Step 1: Phone lookup */}
      <div>
        <label className="text-sm font-medium text-foreground">{t('tenant.phone')}</label>
        <div className="flex gap-2 mt-1">
          <Input
            type="tel"
            value={phone}
            onChange={e => { setPhone(e.target.value); setFoundApartment(null); setPhoneLookedUp(false); }}
            placeholder="09XXXXXXXX"
            disabled={!!foundApartment}
          />
          {!foundApartment ? (
            <Button type="button" onClick={handlePhoneLookup} disabled={lookupLoading} variant="outline" size="icon" className="shrink-0">
              {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          ) : (
            <Button type="button" onClick={resetRegisterForm} variant="outline" size="icon" className="shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Step 2: Show found info */}
      {foundApartment && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{t('tenant.tenantFound')}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">{t('auth.fullName')}:</span>
              <p className="font-medium text-foreground">{foundApartment.tenant_name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t('tenant.apartment')}:</span>
              <p className="font-medium text-foreground">{foundApartment.apartment_label}</p>
            </div>
          </div>
        </div>
      )}

      {phoneLookedUp && !foundApartment && (
        <p className="text-sm text-destructive text-center">{t('tenant.phoneNotFound')}</p>
      )}

      {/* Step 3: Email & password (only after successful lookup) */}
      {foundApartment && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">{t('auth.email')}</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('auth.email')} className="mt-1" required />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">{t('auth.password')}</label>
            <div className="relative mt-1">
              <Input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={t('auth.password')} required minLength={6} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full gold-gradient text-card font-semibold" disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('auth.registerBtn')}
          </Button>
        </form>
      )}
    </div>
  );

  const renderLoginForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-foreground">{t('auth.email')}</label>
        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('auth.email')} className="mt-1" required />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">{t('auth.password')}</label>
        <div className="relative mt-1">
          <Input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={t('auth.password')} required minLength={6} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox id="remember" checked={rememberMe} onCheckedChange={(c) => setRememberMe(!!c)} />
          <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">{t('auth.rememberMe')}</label>
        </div>
        <button type="button" onClick={() => setView('forgot')} className="text-sm text-primary hover:underline">
          {t('auth.forgotPassword')}
        </button>
      </div>
      <Button type="submit" className="w-full gold-gradient text-card font-semibold" disabled={submitting}>
        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {t('auth.loginBtn')}
      </Button>
    </form>
  );

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
              {view === 'forgot' ? t('auth.forgotPassword') : view === 'login' ? t('tenant.login') : t('tenant.register')}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {view === 'forgot' ? t('auth.forgotPasswordMsg') : t('tenant.portal')}
            </p>
          </CardHeader>
          <CardContent>
            {view === 'forgot' && renderForgotForm()}
            {view === 'login' && renderLoginForm()}
            {view === 'register' && renderRegisterForm()}

            {view !== 'forgot' && (
              <div className="mt-4 text-center">
                <button onClick={() => { resetRegisterForm(); setView(view === 'login' ? 'register' : 'login'); }} className="text-sm text-primary hover:underline">
                  {view === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
                </button>
              </div>
            )}
            <div className="mt-3 text-center">
              <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mx-auto">
                <ArrowLeft className="w-3 h-3" /> {t('tenant.backToHome')}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <footer className="text-center py-3 text-xs text-muted-foreground border-t border-border">
        <p>{t('app.powered')}</p>
        <p>{t('app.copyright')}</p>
      </footer>
    </div>
  );
};

export default TenantAuth;
