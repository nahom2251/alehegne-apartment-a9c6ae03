import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'overdue': return 'border-l-destructive';
      case 'near_due': return 'border-l-warning';
      case 'pending_bill': return 'border-l-primary';
      case 'user_approval': return 'border-l-info';
      default: return 'border-l-muted';
    }
  };

  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="icon" className="relative" onClick={() => setOpen(!open)}>
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center min-w-[18px] h-[18px]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-[400px] bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                <CheckCheck className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto max-h-[340px]">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'p-3 border-b border-border last:border-b-0 border-l-4 cursor-pointer hover:bg-muted/50 transition-colors',
                    getTypeColor(n.type),
                    !n.read && 'bg-muted/30'
                  )}
                  onClick={() => markAsRead(n.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-xs font-medium truncate', !n.read && 'font-semibold')}>{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
