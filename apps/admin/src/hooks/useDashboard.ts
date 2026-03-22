import { useEffect, useState } from 'react';
import { supabase } from '@rideshare/shared';
import type { DashboardStats, Order, Driver } from '@rideshare/shared';

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    active_drivers: 0,
    online_drivers: 0,
    revenue_today: 0,
    trips_today: 0,
    avg_rating: 0,
    pending_orders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [activeDrivers, setActiveDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [driversRes, ordersRes, pendingRes] = await Promise.all([
      supabase.from('drivers').select('id, status, rating, full_name, vehicle_type, location'),
      supabase
        .from('orders')
        .select('*')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false }),
      supabase.from('orders').select('id').eq('status', 'pending'),
    ]);

    const drivers = driversRes.data ?? [];
    const orders = ordersRes.data ?? [];

    const completedOrders = orders.filter((o) => o.status === 'completed');
    const revenue = completedOrders.reduce((sum, o) => sum + (o.final_price ?? o.estimated_price), 0);
    const avgRating =
      drivers.length > 0
        ? drivers.reduce((sum: number, d: any) => sum + d.rating, 0) / drivers.length
        : 0;

    setStats({
      active_drivers: drivers.filter((d: any) => d.status !== 'offline').length,
      online_drivers: drivers.filter((d: any) => d.status === 'online').length,
      revenue_today: Math.round(revenue * 100) / 100,
      trips_today: completedOrders.length,
      avg_rating: Math.round(avgRating * 100) / 100,
      pending_orders: pendingRes.data?.length ?? 0,
    });

    setRecentOrders(orders.slice(0, 10));
    setActiveDrivers(drivers.filter((d: any) => d.status !== 'offline') as Driver[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();

    // Real-time: refresh on any order or driver change
    const channel = supabase
      .channel('admin_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, fetchStats)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { stats, recentOrders, activeDrivers, loading, refresh: fetchStats };
}
