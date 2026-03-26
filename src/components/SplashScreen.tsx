import { useEffect, useState } from 'react';

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [fadeOut, setFadeOut] = useState(false);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 300);
    const t2 = setTimeout(() => setStage(2), 800);
    const t3 = setTimeout(() => setStage(3), 1300);
    const t4 = setTimeout(() => setStage(4), 1800);
    const t5 = setTimeout(() => setFadeOut(true), 2800);
    const t6 = setTimeout(() => onComplete(), 3300);
    return () => { [t1,t2,t3,t4,t5,t6].forEach(clearTimeout); };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[hsl(220,25%,12%)] via-[hsl(220,20%,18%)] to-[hsl(220,15%,8%)] transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      {/* Stars */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white/40 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 50}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Moon */}
      <div className={`absolute top-12 right-16 w-16 h-16 rounded-full transition-all duration-1000 ${stage >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
        style={{ background: 'radial-gradient(circle at 35% 35%, hsl(43,76%,80%), hsl(43,76%,52%))' }}
      />

      {/* Building */}
      <div className="relative flex flex-col items-center">
        {/* Floors - build from bottom up */}
        <div className="relative">
          {/* 5th Floor */}
          <div className={`flex justify-center mb-0.5 transition-all duration-500 ${stage >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="w-20 h-12 bg-gradient-to-b from-[hsl(30,15%,35%)] to-[hsl(30,15%,28%)] rounded-t-lg relative border-t-2 border-x-2 border-[hsl(43,76%,52%)/0.3]">
              <div className="absolute inset-x-2 top-2 bottom-1 grid grid-cols-2 gap-1">
                <div className="bg-[hsl(43,60%,70%)/0.6] rounded-sm splash-window" style={{ animationDelay: '0.2s' }} />
                <div className="bg-[hsl(43,60%,70%)/0.6] rounded-sm splash-window" style={{ animationDelay: '0.5s' }} />
              </div>
            </div>
          </div>

          {/* 4th Floor */}
          <div className={`flex justify-center mb-0.5 transition-all duration-500 ${stage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="w-28 h-12 bg-gradient-to-b from-[hsl(30,15%,32%)] to-[hsl(30,15%,25%)] relative border-x-2 border-[hsl(43,76%,52%)/0.3]">
              <div className="absolute inset-x-2 top-2 bottom-1 grid grid-cols-3 gap-1">
                <div className="bg-[hsl(43,60%,70%)/0.6] rounded-sm splash-window" style={{ animationDelay: '0.8s' }} />
                <div className="bg-[hsl(200,70%,60%)/0.4] rounded-sm splash-window" style={{ animationDelay: '0.3s' }} />
                <div className="bg-[hsl(43,60%,70%)/0.6] rounded-sm splash-window" style={{ animationDelay: '1.1s' }} />
              </div>
            </div>
          </div>

          {/* 3rd Floor */}
          <div className={`flex justify-center mb-0.5 transition-all duration-500 ${stage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '200ms' }}>
            <div className="w-28 h-12 bg-gradient-to-b from-[hsl(30,15%,30%)] to-[hsl(30,15%,23%)] relative border-x-2 border-[hsl(43,76%,52%)/0.3]">
              <div className="absolute inset-x-2 top-2 bottom-1 grid grid-cols-3 gap-1">
                <div className="bg-[hsl(43,60%,70%)/0.6] rounded-sm splash-window" style={{ animationDelay: '0.6s' }} />
                <div className="bg-[hsl(43,60%,70%)/0.6] rounded-sm splash-window" style={{ animationDelay: '1.4s' }} />
                <div className="bg-[hsl(200,70%,60%)/0.4] rounded-sm splash-window" style={{ animationDelay: '0.9s' }} />
              </div>
            </div>
          </div>

          {/* 2nd Floor */}
          <div className={`flex justify-center mb-0.5 transition-all duration-500 ${stage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="w-28 h-12 bg-gradient-to-b from-[hsl(30,15%,28%)] to-[hsl(30,15%,21%)] relative border-x-2 border-[hsl(43,76%,52%)/0.3]">
              <div className="absolute inset-x-2 top-2 bottom-1 grid grid-cols-3 gap-1">
                <div className="bg-[hsl(200,70%,60%)/0.4] rounded-sm splash-window" style={{ animationDelay: '1.2s' }} />
                <div className="bg-[hsl(43,60%,70%)/0.6] rounded-sm splash-window" style={{ animationDelay: '0.4s' }} />
                <div className="bg-[hsl(43,60%,70%)/0.6] rounded-sm splash-window" style={{ animationDelay: '0.7s' }} />
              </div>
            </div>
          </div>

          {/* Ground Floor / Entrance */}
          <div className={`flex justify-center transition-all duration-500 ${stage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '200ms' }}>
            <div className="w-28 h-10 bg-gradient-to-b from-[hsl(30,15%,25%)] to-[hsl(30,15%,18%)] relative rounded-b border-b-2 border-x-2 border-[hsl(43,76%,52%)/0.3]">
              <div className="absolute inset-x-0 bottom-0 flex justify-center">
                <div className="w-6 h-7 bg-[hsl(43,76%,52%)/0.8] rounded-t-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Ground line */}
        <div className={`w-48 h-0.5 bg-gradient-to-r from-transparent via-[hsl(43,76%,52%)/0.5] to-transparent transition-all duration-700 ${stage >= 3 ? 'opacity-100' : 'opacity-0'}`} />

        {/* Title */}
        <div className={`mt-8 text-center transition-all duration-700 ${stage >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-wide">
            Alehegne Sewnet
          </h1>
          <p className="text-xl md:text-2xl font-semibold mt-1" style={{
            background: 'linear-gradient(135deg, hsl(43,76%,52%), hsl(43,60%,75%))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Apartment
          </p>
        </div>

        {/* Loading indicator */}
        <div className={`mt-6 transition-all duration-500 ${stage >= 4 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-[hsl(43,76%,52%)]" style={{
                animation: 'splash-dot 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
