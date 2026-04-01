import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { differenceInDays, addMonths, parseISO } from 'date-fns';

export interface Notification {
  id: string;
  type: 'overdue' | 'near_due' | 'pending_bill' | 'user_approval' | 'payment_status';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export const useNotifications = () => {
  const { user, isAdmin, isSuperAdmin, isTenant, isApproved } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = useCallback(async () => {
    if (!user || !isApproved) return;

    const items: Notification[] = [];

    if (isAdmin) {
      // --- ADMIN notifications: see everything ---

      // Rent status for all occupied apartments
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

      // All unpaid electricity bills
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

      // All unpaid water bills
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

      // Submitted payment proofs awaiting review
      const { data: pendingProofs } = await supabase
        .from('payment_proofs')
        .select('*, apartments(label, tenant_name)')
        .eq('status', 'submitted');
      if (pendingProofs) {
        pendingProofs.forEach(proof => {
          items.push({
            id: `proof-${proof.id}`,
            type: 'pending_bill',
            title: `📋 Payment Proof Awaiting Review`,
            message: `${proof.apartments?.label} - ${proof.bill_type} from ${proof.apartments?.tenant_name}`,
            timestamp: new Date(proof.created_at),
            read: false,
          });
        });
      }

      // Pending user approvals (super admin only)
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
    } else if (isTenant) {
      // --- TENANT notifications: only their own data ---

      // Get tenant's apartment
      const { data: apt } = await supabase
        .from('apartments')
        .select('*')
        .eq('tenant_user_id', user.id)
        .single();

      if (apt) {
        // Rent status
        if (apt.move_in_date && apt.monthly_rent) {
          const moveIn = parseISO(apt.move_in_date);
          const paidUntil = addMonths(moveIn, apt.rent_paid_months || 0);
          const daysLeft = differenceInDays(paidUntil, new Date());

          if (daysLeft < 0) {
            items.push({
              id: `overdue-${apt.id}`,
              type: 'overdue',
              title: `🔴 Rent Overdue`,
              message: `Your rent is ${Math.abs(daysLeft)} days overdue`,
              timestamp: new Date(),
              read: false,
            });
          } else if (daysLeft <= 5) {
            items.push({
              id: `near-${apt.id}`,
              type: 'near_due',
              title: `🟡 Rent Due Soon`,
              message: `Your rent is due in ${daysLeft} days`,
              timestamp: new Date(),
              read: false,
            });
          }
        }

        // Tenant's unpaid electricity bills
        const { data: elecBills } = await supabase
          .from('electricity_bills')
          .select('*')
          .eq('apartment_id', apt.id)
          .eq('is_paid', false);
        if (elecBills) {
          elecBills.forEach(bill => {
            items.push({
              id: `elec-${bill.id}`,
              type: 'pending_bill',
              title: `⚡ Unpaid Electricity Bill`,
              message: `${bill.total?.toLocaleString()} Birr`,
              timestamp: new Date(bill.created_at),
              read: false,
            });
          });
        }

        // Tenant's unpaid water bills
        const { data: waterBills } = await supabase
          .from('water_bills')
          .select('*')
          .eq('apartment_id', apt.id)
          .eq('is_paid', false);
        if (waterBills) {
          waterBills.forEach(bill => {
            items.push({
              id: `water-${bill.id}`,
              type: 'pending_bill',
              title: `💧 Unpaid Water Bill`,
              message: `${bill.amount?.toLocaleString()} Birr`,
              timestamp: new Date(bill.created_at),
              read: false,
            });
          });
        }
      }

      // Tenant's reviewed payment proofs (approved/rejected)
      const { data: reviewedProofs } = await supabase
        .from('payment_proofs')
        .select('*')
        .eq('tenant_user_id', user.id)
        .in('status', ['approved', 'rejected'])
        .order('reviewed_at', { ascending: false })
        .limit(10);
      if (reviewedProofs) {
        reviewedProofs.forEach(proof => {
          items.push({
            id: `proof-${proof.id}`,
            type: 'payment_status',
            title: proof.status === 'approved' ? `✅ Payment Approved` : `❌ Payment Rejected`,
            message: `Your ${proof.bill_type} payment proof was ${proof.status}${proof.notes ? ': ' + proof.notes : ''}`,
            timestamp: new Date(proof.reviewed_at || proof.created_at),
            read: false,
          });
        });
      }
    }

    setNotifications(items);
  }, [user, isAdmin, isSuperAdmin, isTenant, isApproved]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
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
