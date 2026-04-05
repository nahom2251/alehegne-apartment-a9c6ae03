import { useEffect, useState } from 'react';

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [fadeOut, setFadeOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowContent(true), 300);

    // Animate progress from 0 to 100
    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 8 + 2;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
      }
      setProgress(Math.min(Math.round(current), 100));
    }, 100);

    const t2 = setTimeout(() => setFadeOut(true), 2800);
    const t3 = setTimeout(() => onComplete(), 3300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearInterval(interval);
    };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[hsl(0,0%,98%)] to-[hsl(0,0%,93%)] transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      <div className={`flex flex-col items-center transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        {/* AS Monogram */}
        <div className="mb-6">
          <span
            className="text-7xl md:text-8xl font-serif italic tracking-tight"
            style={{
              background: 'linear-gradient(135deg, hsl(43,76%,52%), hsl(43,60%,65%))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            AS
          </span>
        </div>

        {/* Title */}
        <h1
          className="text-2xl md:text-3xl font-bold tracking-wide text-center"
          style={{
            background: 'linear-gradient(135deg, hsl(43,76%,52%), hsl(43,60%,65%))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          AS Apartment
        </h1>


        {/* Progress bar */}
        <div className="mt-10 w-64">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span className="uppercase tracking-wider text-[10px]">Initializing</span>
            <span style={{
              background: 'linear-gradient(135deg, hsl(43,76%,52%), hsl(43,60%,65%))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }} className="font-semibold">{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-200 ease-out gold-gradient"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-6 text-center">
        <p className="text-xs text-muted-foreground">Powered by NUN Tech</p>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} NUN Tech. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default SplashScreen;
