import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import NotificationBell from '@/components/NotificationBell';
import { Button } from '@/components/ui/button';
import { Building2, LayoutDashboard, Receipt, Upload, History, Settings, LogOut } from 'lucide-react';

const TenantLayout = () => {
  const { signOut, profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const navItems = [
    { to: '/tenant', icon: LayoutDashboard, label: t('tenant.dashboard'), end: true },
    { to: '/tenant/bills', icon: Receipt, label: t('tenant.bills'), end: false },
    { to: '/tenant/payment', icon: Upload, label: t('tenant.payment'), end: false },
    { to: '/tenant/history', icon: History, label: t('tenant.history'), end: false },
    { to: '/tenant/settings', icon: Settings, label: t('nav.settings'), end: false },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gold-gradient flex items-center justify-center">
            <Building2 className="w-4 h-4 text-card" />
          </div>
          <span className="text-sm font-semibold">{t('app.short')}</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <LanguageToggle />
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5 text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="sticky bottom-0 border-t border-border bg-card flex items-center justify-around py-2 px-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs transition-colors ${
                isActive ? 'text-primary font-medium' : 'text-muted-foreground'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="truncate max-w-[60px]">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <footer className="text-center py-2 text-xs text-muted-foreground border-t border-border">
        <p>{t('app.powered')}</p>
        <p>{t('app.copyright')}</p>
      </footer>
    </div>
  );
};

export default TenantLayout;
