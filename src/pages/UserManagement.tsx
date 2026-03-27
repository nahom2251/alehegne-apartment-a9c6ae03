import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, CheckCircle, XCircle, Loader2, Trash2, KeyRound, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface TenantInfo {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  apartment_label: string;
  apartment_id: string;
}

const UserManagement = () => {
  const { t } = useLanguage();
  const { isSuperAdmin, session } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data as UserProfile[]);
  };

  const fetchTenants = async () => {
    const { data: apts } = await supabase
      .from('apartments')
      .select('id, label, tenant_user_id, tenant_name, tenant_phone')
      .not('tenant_user_id', 'is', null);

    if (apts) {
      const tenantList: TenantInfo[] = apts.map(apt => ({
        user_id: apt.tenant_user_id!,
        full_name: apt.tenant_name || 'Unknown',
        email: '',
        phone: apt.tenant_phone,
        apartment_label: apt.label,
        apartment_id: apt.id,
      }));

      // Enrich with profile emails
      const userIds = tenantList.map(t => t.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, email')
          .in('user_id', userIds);
        if (profiles) {
          const emailMap = Object.fromEntries(profiles.map(p => [p.user_id, p.email]));
          tenantList.forEach(t => { t.email = emailMap[t.user_id] || ''; });
        }
      }
      setTenants(tenantList);
    }
  };

  useEffect(() => { fetchUsers(); fetchTenants(); }, []);

  const updateStatus = async (userId: string, status: 'approved' | 'rejected') => {
    setLoading(userId);
    const { error } = await supabase.from('profiles').update({ status }).eq('user_id', userId);
    setLoading(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`User ${status}`);
    fetchUsers();
  };

  const adminAction = async (userId: string, action: 'delete' | 'reset_password') => {
    const confirmMsg = action === 'delete' ? t('admin.deleteConfirm') : t('admin.resetConfirm');
    if (!confirm(confirmMsg)) return;

    setLoading(userId + action);
    const { data, error } = await supabase.functions.invoke('admin-manage-user', {
      body: { action, user_id: userId },
    });
    setLoading(null);

    if (error) { toast.error(error.message); return; }
    toast.success(action === 'delete' ? t('admin.deleted') : t('admin.resetSent'));
    fetchUsers();
    fetchTenants();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-success">{t('user.approved')}</Badge>;
      case 'rejected': return <Badge variant="destructive">{t('user.rejected')}</Badge>;
      default: return <Badge variant="secondary">{t('user.pending')}</Badge>;
    }
  };

  if (!isSuperAdmin) return <p className="text-center text-muted-foreground py-8">Access denied</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('nav.users')}</h1>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="gap-1.5"><Users className="w-4 h-4" /> {t('nav.users')}</TabsTrigger>
          <TabsTrigger value="tenants" className="gap-1.5"><Building2 className="w-4 h-4" /> {t('admin.tenants')}</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {users.map((user) => (
              <Card key={user.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm">{user.full_name}</CardTitle>
                    {statusBadge(user.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  {user.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateStatus(user.user_id, 'approved')} disabled={loading === user.user_id} className="flex-1 bg-success hover:bg-success/90 text-card">
                        {loading === user.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                        {t('user.approve')}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => updateStatus(user.user_id, 'rejected')} disabled={loading === user.user_id} className="flex-1">
                        <XCircle className="w-3 h-3 mr-1" /> {t('user.reject')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {users.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">No users found</p>}
          </div>
        </TabsContent>

        {/* Tenants Tab */}
        <TabsContent value="tenants">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {tenants.map((tenant) => (
              <Card key={tenant.user_id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm">{tenant.full_name}</CardTitle>
                    <Badge variant="outline">{tenant.apartment_label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">{tenant.email}</p>
                  {tenant.phone && <p className="text-sm text-muted-foreground">{tenant.phone}</p>}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => adminAction(tenant.user_id, 'reset_password')}
                      disabled={loading === tenant.user_id + 'reset_password'}
                      className="flex-1 gap-1"
                    >
                      {loading === tenant.user_id + 'reset_password' ? <Loader2 className="w-3 h-3 animate-spin" /> : <KeyRound className="w-3 h-3" />}
                      {t('admin.resetPassword')}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => adminAction(tenant.user_id, 'delete')}
                      disabled={loading === tenant.user_id + 'delete'}
                      className="flex-1 gap-1"
                    >
                      {loading === tenant.user_id + 'delete' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      {t('admin.deleteTenant')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {tenants.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">No tenants found</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserManagement;
