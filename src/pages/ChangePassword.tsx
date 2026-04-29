import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import Logo from '@/components/Logo';
import { useNavigate } from 'react-router-dom';

const ChangePassword = () => {
  const { refreshProfile, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSubmitting(false);
      toast.error(error.message);
      return;
    }
    const { error: clearError } = await supabase.rpc('clear_must_change_password');
    if (clearError) {
      setSubmitting(false);
      toast.error(clearError.message);
      return;
    }
    await refreshProfile();
    toast.success('Password updated successfully');
    setSubmitting(false);
    navigate('/tenant', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-border">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4">
              <Logo size={72} />
            </div>
            <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" />
              Change Your Password
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              For your security, please set a new password to continue.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">New Password</label>
                <div className="relative mt-1">
                  <Input
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Confirm Password</label>
                <Input
                  type={show ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="mt-1"
                  minLength={6}
                  required
                />
                {confirmPassword.length > 0 && confirmPassword !== password && (
                  <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full gold-gradient text-card font-semibold"
                disabled={submitting || password.length < 6 || password !== confirmPassword}
              >
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Password
              </Button>
              <button
                type="button"
                onClick={async () => { await signOut(); navigate('/'); }}
                className="text-sm text-muted-foreground hover:text-foreground mx-auto block"
              >
                Sign out
              </button>
            </form>
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

export default ChangePassword;