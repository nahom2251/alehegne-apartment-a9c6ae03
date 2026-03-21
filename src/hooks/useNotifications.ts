import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { differenceInDays, addMonths, parseISO } from 'date-fns';

export interface Notification {
  id: string;
  type: 'overdue' | 'near_due' | 'pending_bill' | 'user_approval';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export const useNotifications = () => {
  const { user, isSuperAdmin, isApproved } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = useCallback(async () => {
    if (!user || !isApproved) return;

    const items: Notification[] = [];

    // Check rent status for all apartments
    const { data: apts } = await supabase.from('apartments').select('*').eq('is_occupied', true);
    if (apts) {
      apts.forEach(apt => {
        if (!apt.move_in_date || !apt.monthly_rent) return;
        const moveIn = parseISO(apt.move_in_date);
        const paidUntil = addMonths(moveIn, apt.rent_paid_months || 0);
        const daysLeft = differenceInDays(paidUntil, new Date());

        if (daysLeft < 0) {
          items.push({
            id: `overdue-${apt.id}`,
            type: 'overdue',
            title: `🔴 Rent Overdue - ${apt.label}`,
            message: `${apt.tenant_name}'s rent is ${Math.abs(daysLeft)} days overdue`,
            timestamp: new Date(),
            read: false,
          });
        } else if (daysLeft <= 5) {
          items.push({
            id: `near-${apt.id}`,
            type: 'near_due',
            title: `🟡 Rent Due Soon - ${apt.label}`,
            message: `${apt.tenant_name}'s rent is due in ${daysLeft} days`,
            timestamp: new Date(),
            read: false,
          });
        }
      });
    }

    // Check unpaid bills
    const { data: elecBills } = await supabase.from('electricity_bills').select('*, apartments(label, tenant_name)').eq('is_paid', false);
    if (elecBills) {
      elecBills.forEach(bill => {
        items.push({
          id: `elec-${bill.id}`,
          type: 'pending_bill',
          title: `⚡ Pending Electricity Bill`,
          message: `${bill.apartments?.label} - ${bill.total?.toLocaleString()} Birr`,
          timestamp: new Date(bill.created_at),
          read: false,
        });
      });
    }

    const { data: waterBills } = await supabase.from('water_bills').select('*, apartments(label, tenant_name)').eq('is_paid', false);
    if (waterBills) {
      waterBills.forEach(bill => {
        items.push({
          id: `water-${bill.id}`,
          type: 'pending_bill',
          title: `💧 Pending Water Bill`,
          message: `${bill.apartments?.label} - ${bill.amount?.toLocaleString()} Birr`,
          timestamp: new Date(bill.created_at),
          read: false,
        });
      });
    }

    // Check pending user approvals (super admin only)
    if (isSuperAdmin) {
      const { data: pendingUsers } = await supabase.from('profiles').select('*').eq('status', 'pending');
      if (pendingUsers) {
        pendingUsers.forEach(u => {
          items.push({
            id: `user-${u.id}`,
            type: 'user_approval',
            title: `👤 Pending User Approval`,
            message: `${u.full_name} (${u.email}) is waiting for approval`,
            timestamp: new Date(u.created_at),
            read: false,
          });
        });
      }
    }

    setNotifications(items);
  }, [user, isSuperAdmin, isApproved]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, markAsRead, markAllRead, refresh: fetchNotifications };
};
