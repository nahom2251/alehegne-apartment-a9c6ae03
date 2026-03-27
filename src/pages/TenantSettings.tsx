import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Lock, Phone, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

const TenantSettings = () => {
  const { profile, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const [phone, setPhone] = useState(profile?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    const { error } = await supabase
      .from('profiles')
      .update({ phone })
      .eq('user_id', profile?.user_id);
    setSavingProfile(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('settings.profileUpdated'));
    refreshProfile();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t('settings.passwordMismatch'));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t('settings.passwordTooShort'));
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('settings.passwordUpdated'));
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" /> {t('settings.profileInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('auth.fullName')}</label>
              <Input value={profile?.full_name || ''} disabled className="mt-1 bg-muted" />
            </div>
            <div>
              <label className="text-sm font-medium">{t('auth.email')}</label>
              <Input value={profile?.email || ''} disabled className="mt-1 bg-muted" />
            </div>
            <div>
              <label className="text-sm font-medium">{t('tenant.phone')}</label>
              <Input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="09XXXXXXXX"
                className="mt-1"
              />
            </div>
            <Button type="submit" disabled={savingProfile} className="gap-2">
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('settings.saveProfile')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4" /> {t('settings.changePassword')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('auth.newPassword')}</label>
              <Input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••"
                className="mt-1"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('settings.confirmPassword')}</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••"
                className="mt-1"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" disabled={savingPassword} className="gap-2">
              {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {t('auth.updatePassword')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantSettings;
