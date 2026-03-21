import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
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

  // Check for recovery hash on mount
  useState(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setView('reset');
    }
  });

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
        toast.error('Please enter your full name');
        setSubmitting(false);
        return;
      }
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Account created! Please check your email to confirm.');
      }
    } else if (view === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Password reset link sent! Check your email.');
      }
    } else if (view === 'reset') {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Password updated successfully!');
        setView('login');
        window.location.hash = '';
      }
    }
    setSubmitting(false);
  };

  const renderForm = () => {
    if (view === 'forgot') {
      return (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">{t('auth.email')}</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('auth.email')} className="mt-1" required />
          </div>
          <Button type="submit" className="w-full gold-gradient text-card font-semibold" disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Send Reset Link
          </Button>
          <button type="button" onClick={() => setView('login')} className="flex items-center gap-1 text-sm text-primary hover:underline mx-auto">
            <ArrowLeft className="w-3 h-3" /> Back to Login
          </button>
        </form>
      );
    }

    if (view === 'reset') {
      return (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">New Password</label>
            <div className="relative mt-1">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
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
            Update Password
          </Button>
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
              <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">Remember me</label>
            </div>
            <button type="button" onClick={() => setView('forgot')} className="text-sm text-primary hover:underline">
              Forgot password?
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
    if (view === 'forgot') return 'Reset Password';
    if (view === 'reset') return 'Set New Password';
    return t('app.short');
  };

  const getSubtitle = () => {
    if (view === 'forgot') return 'Enter your email to receive a reset link';
    if (view === 'reset') return 'Choose a strong new password';
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
            <div className="mx-auto w-16 h-16 rounded-xl gold-gradient flex items-center justify-center mb-4 shadow-md">
              <Building2 className="w-8 h-8 text-card" />
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
        {t('app.powered')}
      </footer>
    </div>
  );
};

export default Auth;
