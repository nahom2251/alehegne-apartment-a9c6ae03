import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import Logo from '@/components/Logo';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type View = 'login' | 'register' | 'forgot' | 'reset';

const Auth = () => {
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (view === 'login') {
      // Adjust storage based on remember me
      if (!rememberMe) {
        // Session storage for non-persistent sessions
        supabase.auth.setSession;
      }
      const { error } = await signIn(email, password);
      if (error) toast.error(error.message);
    } else if (view === 'register') {
      if (!fullName.trim()) {
        toast.error(t('auth.enterFullName'));
        setSubmitting(false);
        return;
      }
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(t('auth.accountCreated'));
      }
    } else if (view === 'forgot') {
      // Submit a reset request that the super admin must approve
      const { error } = await supabase.rpc('submit_password_reset_request', { _email: email });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Reset request submitted. The super admin will review it shortly.');
        setView('login');
      }
    } else if (view === 'reset') {
      // Complete reset via edge function (requires approved request)
      const { data, error } = await supabase.functions.invoke('complete-password-reset', {
        body: { email, new_password: newPassword },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || error?.message || 'Failed to reset password');
      } else {
        toast.success(t('auth.passwordUpdated'));
        setView('login');
        setNewPassword('');
      }
    }
    setSubmitting(false);
  };

  const renderForm = () => {
    if (view === 'forgot') {
      return (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Submit a request to reset your password. The super admin will review and approve it.
          </p>
          <div>
            <label className="text-sm font-medium text-foreground">{t('auth.email')}</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('auth.email')} className="mt-1" required />
          </div>
          <Button type="submit" className="w-full gold-gradient text-card font-semibold" disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit request
          </Button>
          <div className="flex justify-between text-xs">
            <button type="button" onClick={() => setView('login')} className="flex items-center gap-1 text-primary hover:underline">
              <ArrowLeft className="w-3 h-3" /> {t('auth.backToLogin')}
            </button>
            <button type="button" onClick={() => setView('reset')} className="text-primary hover:underline">
              Already approved? Set new password
            </button>
          </div>
        </form>
      );
    }

    if (view === 'reset') {
      return (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Enter your email and a new password. This only works after the super admin approves your reset request.
          </p>
          <div>
            <label className="text-sm font-medium text-foreground">{t('auth.email')}</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('auth.email')} className="mt-1" required />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">{t('auth.newPassword')}</label>
            <div className="relative mt-1">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder={t('auth.enterNewPassword')}
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
            {t('auth.updatePassword')}
          </Button>
          <button type="button" onClick={() => setView('login')} className="flex items-center gap-1 text-sm text-primary hover:underline mx-auto">
            <ArrowLeft className="w-3 h-3" /> {t('auth.backToLogin')}
          </button>
        </form>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        {view === 'register' && (
          <div>
            <label className="text-sm font-medium text-foreground">{t('auth.fullName')}</label>
            <Input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t('auth.fullName')} className="mt-1" required />
          </div>
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
        {view === 'login' && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox id="remember" checked={rememberMe} onCheckedChange={(c) => setRememberMe(!!c)} />
              <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">{t('auth.rememberMe')}</label>
            </div>
            <button type="button" onClick={() => setView('forgot')} className="text-sm text-primary hover:underline">
              {t('auth.forgotPassword')}
            </button>
          </div>
        )}
        <Button type="submit" className="w-full gold-gradient text-card font-semibold" disabled={submitting}>
          {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {view === 'login' ? t('auth.loginBtn') : t('auth.registerBtn')}
        </Button>
      </form>
    );
  };

  const getTitle = () => {
    if (view === 'forgot') return t('auth.resetTitle');
    if (view === 'reset') return t('auth.setNewTitle');
    return t('app.short');
  };

  const getSubtitle = () => {
    if (view === 'forgot') return t('auth.forgotPasswordMsg');
    if (view === 'reset') return t('auth.chooseStrong');
    return t('app.name');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="absolute top-4 right-4">
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
            {renderForm()}
            {(view === 'login' || view === 'register') && (
              <div className="mt-4 text-center">
                <button onClick={() => setView(view === 'login' ? 'register' : 'login')} className="text-sm text-primary hover:underline">
                  {view === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
                </button>
              </div>
            )}
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

export default Auth;
