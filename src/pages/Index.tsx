import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Building2, Shield, Home } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 rounded-2xl gold-gradient flex items-center justify-center mb-6 shadow-lg">
            <Building2 className="w-10 h-10 text-card" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t('app.name')}</h1>
          <p className="text-lg font-semibold gold-text-gradient mt-1">{t('app.short')}</p>
        </div>

        <div className="w-full max-w-sm space-y-3">
          <Button
            onClick={() => navigate('/admin')}
            className="w-full h-14 text-base gap-3 gold-gradient text-card font-semibold shadow-md"
          >
            <Shield className="w-5 h-5" />
            {t('index.adminLogin')}
          </Button>
          <Button
            onClick={() => navigate('/tenant-login')}
            variant="outline"
            className="w-full h-14 text-base gap-3 border-primary text-primary hover:bg-primary/10 font-semibold"
          >
            <Home className="w-5 h-5" />
            {t('index.tenantLogin')}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-4">{t('index.chooseRole')}</p>
      </div>

      <footer className="text-center py-3 text-xs text-muted-foreground border-t border-border">
        {t('app.powered')}
      </footer>
    </div>
  );
};

export default Index;
