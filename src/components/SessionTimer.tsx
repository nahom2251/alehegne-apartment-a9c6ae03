import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const START_KEY = 'as_apt_session_start';

const format = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
};

const SessionTimer = () => {
  const { user } = useAuth();
  const [start, setStart] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!user) {
      localStorage.removeItem(START_KEY);
      setStart(null);
      return;
    }
    const existing = localStorage.getItem(START_KEY);
    const t = existing ? parseInt(existing, 10) : Date.now();
    if (!existing) localStorage.setItem(START_KEY, String(t));
    setStart(t);
  }, [user?.id]);

  useEffect(() => {
    if (!start) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [start]);

  if (!user || !start) return null;
  return (
    <div
      className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/60 text-xs text-muted-foreground tabular-nums"
      title="Session time"
    >
      <Clock className="w-3.5 h-3.5" />
      <span>{format(now - start)}</span>
    </div>
  );
};

export default SessionTimer;