import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setLanguage(language === 'en' ? 'am' : 'en')}
      className="gap-1.5 border-border"
    >
      <Globe className="w-4 h-4" />
      {language === 'en' ? 'አማ' : 'EN'}
    </Button>
  );
};

export default LanguageToggle;
