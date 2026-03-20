import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) toast.error(error.message);
    } else {
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
    }
    setSubmitting(false);
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
            <CardTitle className="text-xl font-bold">
              {t('app.short')}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t('app.name')}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="text-sm font-medium text-foreground">{t('auth.fullName')}</label>
                  <Input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t('auth.fullName')}
                    className="mt-1"
                    required={!isLogin}
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-foreground">{t('auth.email')}</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.email')}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">{t('auth.password')}</label>
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.password')}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full gold-gradient text-card font-semibold" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isLogin ? t('auth.loginBtn') : t('auth.registerBtn')}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-primary hover:underline"
              >
                {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
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

export default Auth;
