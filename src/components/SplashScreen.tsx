import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 2000);
    const endTimer = setTimeout(() => onComplete(), 2500);
    return () => {
      clearTimeout(timer);
      clearTimeout(endTimer);
    };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-card transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      <div className="animate-scale-in flex flex-col items-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-2xl gold-gradient flex items-center justify-center shadow-lg">
            <Building2 className="w-12 h-12 text-card" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-lg gold-gradient opacity-40 animate-spin-slow" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Alehegne Sewnet Apartment
          </h1>
          <p className="text-xl md:text-2xl font-semibold gold-text-gradient mt-1">
            AS Apt.
          </p>
        </div>
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin-slow" />
      </div>
    </div>
  );
};

export default SplashScreen;
