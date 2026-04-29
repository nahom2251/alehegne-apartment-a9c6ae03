import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Loader2, ArrowLeft, Search, CheckCircle, Copy, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import Logo from '@/components/Logo';

type View = 'login' | 'register' | 'forgot' | 'credentials';

interface FoundApartment {
  apartment_id: string;
  apartment_label: string;
  tenant_name: string;
}

interface GeneratedCreds {
  email: string;
  password: string;
}

// Build a sane username from full name. Fallback to 'tenant' if empty.
const buildUsername = (fullName: string): string => {
  const cleaned = (fullName || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (cleaned.length === 0) return 'tenant';
  return cleaned[0];
};

const generatePassword = (): string => {
  // 6-digit numeric password
  return String(Math.floor(100000 + Math.random() * 900000));
};

const TenantAuth = () => {
  const [view, setView] = useState<View>('login');
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
  const [foundApartment, setFoundApartment] = useState<FoundApartment | null>(null);
  const [phoneLookedUp, setPhoneLookedUp] = useState(false);

  // Generated credentials shown after successful registration
  const [creds, setCreds] = useState<GeneratedCreds | null>(null);

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
      setFoundApartment(data[0] as FoundApartment);
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
    setCreds(null);
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

  const handleAutoRegister = async () => {
    if (!foundApartment) { toast.error(t('tenant.lookupFirst')); return; }
    setSubmitting(true);

    const baseUsername = buildUsername(foundApartment.tenant_name);
    const generatedPassword = generatePassword();
    let finalEmail = `${baseUsername}@asapartment.com`;

    // Try signup, on duplicate retry with a numeric suffix
    let signUpUser = null;
    let lastError: { message: string } | null = null;
    for (let i = 0; i < 5; i++) {
      const tryEmail = i === 0 ? finalEmail : `${baseUsername}${i + 1}@asapartment.com`;
      const { data, error } = await supabase.auth.signUp({
        email: tryEmail,
        password: generatedPassword,
        options: {
          data: { full_name: foundApartment.tenant_name || 'Tenant' },
          emailRedirectTo: window.location.origin,
        },
      });
      if (!error && data.user) {
        signUpUser = data.user;
        finalEmail = tryEmail;
        lastError = null;
        break;
      }
      lastError = error;
      const msg = error?.message?.toLowerCase() ?? '';
      if (!msg.includes('already') && !msg.includes('registered') && !msg.includes('exists')) {
        break; // not a uniqueness issue — bail out
      }
    }

    if (!signUpUser) {
      setSubmitting(false);
      toast.error(lastError?.message || 'Could not create account');
      return;
    }

    // Link tenant to apartment & approve
    const { error: regError } = await supabase.rpc('register_tenant', {
      _apartment_id: foundApartment.apartment_id,
      _phone: phone,
    });
    if (regError) {
      setSubmitting(false);
      toast.error(regError.message);
      return;
    }

    // Force password change on first login
    const { error: flagError } = await supabase.rpc('mark_must_change_password', {
      _user_id: signUpUser.id,
    });
    if (flagError) {
      // non-fatal — log but continue
      console.warn('mark_must_change_password failed', flagError);
    }

    // Sign the just-created user out so they have to use the new credentials
    await supabase.auth.signOut();

    setSubmitting(false);
    setCreds({ email: finalEmail, password: generatedPassword });
    setView('credentials');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    if (rememberMe) {
      localStorage.setItem('tenant_email', email);
      localStorage.setItem('tenant_remember', 'true');
    } else {
      localStorage.removeItem('tenant_email');
      localStorage.removeItem('tenant_remember');
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast.error(error.message);
    setSubmitting(false);
  };

  const copyCreds = async () => {
    if (!creds) return;
    const text = `Username: ${creds.email}\nPassword: ${creds.password}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Credentials copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
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

      {/* Step 2: Found tenant info */}
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

      {/* Step 3: Auto-create account */}
      {foundApartment && (
        <Button
          type="button"
          onClick={handleAutoRegister}
          className="w-full gold-gradient text-card font-semibold"
          disabled={submitting}
        >
          {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Create Account
        </Button>
      )}

      <p className="text-xs text-muted-foreground text-center">
        We'll auto-generate a username and a 6-digit password for you. You'll be asked to change the password on first login.
      </p>
    </div>
  );

  const renderCredentials = () => (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <KeyRound className="w-4 h-4" />
          <span className="text-sm font-semibold">Your login credentials</span>
        </div>
        <div className="space-y-2">
          <div>
            <p className="text-xs text-muted-foreground">Username</p>
            <p className="font-mono text-sm font-semibold text-foreground break-all">{creds?.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Password</p>
            <p className="font-mono text-lg font-bold text-foreground tracking-widest">{creds?.password}</p>
          </div>
        </div>
        <Button type="button" onClick={copyCreds} variant="outline" size="sm" className="w-full gap-2">
          <Copy className="w-3.5 h-3.5" /> Copy credentials
        </Button>
      </div>

      <div className="rounded-md bg-yellow-500/10 border border-yellow-500/30 p-3">
        <p className="text-xs text-foreground">
          ⚠️ Save these credentials now — you'll need them to log in. You'll be asked to set a new password on first login.
        </p>
      </div>

      <Button
        type="button"
        onClick={() => {
          setEmail(creds?.email ?? '');
          setPassword('');
          resetRegisterForm();
          setView('login');
        }}
        className="w-full gold-gradient text-card font-semibold"
      >
        Continue to Login
      </Button>
    </div>
  );

  const renderLoginForm = () => (
    <form onSubmit={handleLogin} className="space-y-4">
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

  const getTitle = () => {
    if (view === 'forgot') return t('auth.forgotPassword');
    if (view === 'credentials') return 'Account Created';
    if (view === 'login') return t('tenant.login');
    return t('tenant.register');
  };

  const getSubtitle = () => {
    if (view === 'forgot') return t('auth.forgotPasswordMsg');
    if (view === 'credentials') return 'Save your login credentials';
    return t('tenant.portal');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageToggle />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-border">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4">
              <Logo size={72} />
            </div>
            <CardTitle className="text-xl font-bold">{getTitle()}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{getSubtitle()}</p>
          </CardHeader>
          <CardContent>
            {view === 'forgot' && renderForgotForm()}
            {view === 'login' && renderLoginForm()}
            {view === 'register' && renderRegisterForm()}
            {view === 'credentials' && renderCredentials()}

            {(view === 'login' || view === 'register') && (
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
