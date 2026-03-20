import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, XCircle, Building2 } from 'lucide-react';

const PendingApproval = () => {
  const { profile, signOut } = useAuth();
  const { t } = useLanguage();
  const isRejected = profile?.status === 'rejected';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-xl">
          <CardContent className="pt-8 pb-6">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: isRejected ? 'hsl(0 72% 51% / 0.1)' : 'hsl(43 76% 52% / 0.1)' }}>
              {isRejected ? (
                <XCircle className="w-8 h-8 text-destructive" />
              ) : (
                <Clock className="w-8 h-8 text-primary" />
              )}
            </div>
            <h2 className="text-xl font-bold mb-2">
              {isRejected ? t('auth.rejected') : t('auth.pending')}
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              {isRejected
                ? 'Contact the administrator for more information.'
                : 'The administrator will review your request shortly.'}
            </p>
            <Button variant="outline" onClick={signOut}>
              {t('auth.logout')}
            </Button>
          </CardContent>
        </Card>
      </div>
      <footer className="text-center py-3 text-xs text-muted-foreground border-t border-border">
        {t('app.powered')}
      </footer>
    </div>
  );
};

export default PendingApproval;
