import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(t('settings.passwordMismatch'));
      return;
    }
    if (password.length < 6) {
      toast.error(t('settings.passwordTooShort'));
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setDone(true);
    toast.success(t('settings.passwordUpdated'));
    setTimeout(() => navigate('/'), 2000);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <p className="text-lg font-medium">{t('settings.passwordUpdated')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-3">
            <Lock className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle>{t('auth.updatePassword')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('auth.newPassword')}</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" className="mt-1" required minLength={6} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('settings.confirmPassword')}</label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••" className="mt-1" required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('auth.updatePassword')}
            </Button>
          </form>
        </CardContent>
      </Card>
      <footer className="fixed bottom-0 left-0 right-0 text-center py-2 text-xs text-muted-foreground border-t border-border">
        <p>{t('app.powered')}</p>
        <p>{t('app.copyright')}</p>
      </footer>
    </div>
  );
};

export default ResetPassword;
