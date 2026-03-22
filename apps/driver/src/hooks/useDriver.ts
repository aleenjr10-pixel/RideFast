import { useEffect, useState, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '@rideshare/shared';
import type { Order, DriverStatus } from '@rideshare/shared';

const DISPATCH_TIMEOUT_SEC = 20;

export function useDriver(userId: string | undefined) {
  const [driverId, setDriverId] = useState<string | null>(null);
  const [status, setStatus] = useState<DriverStatus>('offline');
  const statusRef = useRef<DriverStatus>('offline');
  const [incomingOrder, setIncomingOrder] = useState<Order | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [earnings, setEarnings] = useState({ today: 0, trips: 0, rating: 0 });
  const [dispatchSecondsLeft, setDispatchSecondsLeft] = useState(0);
  const locationInterval = useRef<ReturnType<typeof setInterval>>();
  const countdownInterval = useRef<ReturnType<typeof setInterval>>();
  const driverIdRef = useRef<string | null>(null);

  // Keep refs in sync
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { driverIdRef.current = driverId; }, [driverId]);

  // Re-check for assigned orders when app comes back to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const did = driverIdRef.current;
      if (!did) return;
      if (statusRef.current === 'online') {
        supabase.from('orders').select('*')
          .eq('driver_id', did).eq('status', 'pending')
          .order('created_at', { ascending: false }).limit(1).single()
          .then(({ data }) => { if (data) setIncomingOrder(data as Order); });
      }
      supabase.from('orders').select('*')
        .eq('driver_id', did).in('status', ['accepted', 'arriving', 'in_progress'])
        .order('created_at', { ascending: false }).limit(1).single()
        .then(({ data }) => { if (data) setActiveOrder(data as Order); });
    });
    return () => sub.remove();
  }, []);

  // Load driver profile + check for already-assigned pending order
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('drivers')
      .select('id, status, rating, total_trips')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setDriverId(data.id);
        setEarnings((e) => ({ ...e, rating: data.rating, trips: data.total_trips }));

        // Check if there's already a pending order assigned to this driver (only if online)
        if (data.status === 'online' || data.status === 'in_ride') {
          supabase
            .from('orders')
            .select('*')
            .eq('driver_id', data.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
            .then(({ data: order }) => { if (order) setIncomingOrder(order as Order); });
        }

        // Check if there's an active order (accepted/in_progress)
        supabase
          .from('orders')
          .select('*')
          .eq('driver_id', data.id)
          .in('status', ['accepted', 'arriving', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
          .then(({ data: order }) => { if (order) setActiveOrder(order as Order); });
      });
  }, [userId]);

  // Start 20s countdown when an incoming order arrives
  useEffect(() => {
    clearInterval(countdownInterval.current);
    if (!incomingOrder) { setDispatchSecondsLeft(0); return; }

    setDispatchSecondsLeft(DISPATCH_TIMEOUT_SEC);
    countdownInterval.current = setInterval(() => {
      setDispatchSecondsLeft((s) => {
        if (s <= 1) {
          // Time's up — auto-skip
          clearInterval(countdownInterval.current);
          const order = incomingOrder;
          const did = driverIdRef.current;
          if (order && did) {
            supabase.rpc('skip_dispatch', { p_order_id: order.id, p_driver_id: did });
          }
          setIncomingOrder(null);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval.current);
  }, [incomingOrder?.id]);

  // Subscribe to orders assigned to this driver
  useEffect(() => {
    if (!driverId) return;
    const channel = supabase
      .channel('driver_orders')
      // New order dispatched to this driver (driver_id set by trigger)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `driver_id=eq.${driverId}` },
        (payload) => {
          const order = payload.new as Order;
          if (order.status === 'pending') {
            // Freshly dispatched to us
            setIncomingOrder(order);
          } else if (['accepted', 'arriving', 'in_progress'].includes(order.status)) {
            setActiveOrder(order);
            setIncomingOrder(null);
          } else if (order.status === 'completed') {
            setActiveOrder(null);
            setEarnings((e) => ({
              today: e.today + (order.final_price ?? order.estimated_price),
              trips: e.trips + 1,
              rating: e.rating,
            }));
          }
        }
      )
      // Handle order cancelled by customer while it's incoming to us
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: 'status=eq.cancelled' },
        (payload) => {
          const order = payload.new as Order;
          setIncomingOrder((cur) => (cur?.id === order.id ? null : cur));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [driverId]);

  // Push location to Supabase while online
  useEffect(() => {
    if (status === 'offline' || !driverId) {
      clearInterval(locationInterval.current);
      return;
    }
    const pushLocation = async () => {
      const loc = await Location.getCurrentPositionAsync({});
      await supabase
        .from('drivers')
        .update({ location: { latitude: loc.coords.latitude, longitude: loc.coords.longitude } })
        .eq('id', driverId);
    };
    pushLocation();
    locationInterval.current = setInterval(pushLocation, 10_000);
    return () => clearInterval(locationInterval.current);
  }, [status, driverId]);

  const goOnline = async () => {
    const { status: perm } = await Location.requestForegroundPermissionsAsync();
    if (perm !== 'granted') return;
    // Push location + status in one update so dispatch_pending_orders can find us
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    await supabase.from('drivers').update({
      status: 'online',
      location: { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
    }).eq('id', driverId);
    setStatus('online');
    // Dispatch any pending orders that had no available driver when created
    await supabase.rpc('dispatch_pending_orders');
  };

  const goOffline = async () => {
    await supabase.from('drivers').update({ status: 'offline' }).eq('id', driverId);
    setStatus('offline');
  };

  const acceptOrder = async (orderId: string) => {
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'accepted', driver_id: driverId, accepted_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('status', 'pending')
      .eq('driver_id', driverId)
      .select()
      .single();
    if (!error && data) {
      setActiveOrder(data as Order);
      setIncomingOrder(null);
      await supabase.from('drivers').update({ status: 'in_ride' }).eq('id', driverId);
      setStatus('in_ride');
    }
  };

  const arrivedAtPickup = async (orderId: string) => {
    const { data } = await supabase
      .from('orders')
      .update({ status: 'arriving' })
      .eq('id', orderId)
      .select()
      .single();
    if (data) setActiveOrder(data as Order);
  };

  const startRide = async (orderId: string) => {
    const { data } = await supabase
      .from('orders')
      .update({ status: 'in_progress' })
      .eq('id', orderId)
      .select()
      .single();
    if (data) setActiveOrder(data as Order);
  };

  const declineOrder = useCallback(async () => {
    if (!incomingOrder || !driverId) return;
    clearInterval(countdownInterval.current);
    const order = incomingOrder;
    setIncomingOrder(null);
    await supabase.rpc('skip_dispatch', { p_order_id: order.id, p_driver_id: driverId });
  }, [incomingOrder, driverId]);

  const completeOrder = async (orderId: string, finalPrice: number) => {
    await supabase
      .from('orders')
      .update({ status: 'completed', final_price: finalPrice, completed_at: new Date().toISOString() })
      .eq('id', orderId);
    await supabase.from('drivers').update({ status: 'online' }).eq('id', driverId);
    setStatus('online');
    setActiveOrder(null);
  };

  return {
    status, incomingOrder, activeOrder, earnings, dispatchSecondsLeft,
    goOnline, goOffline, acceptOrder, declineOrder,
    arrivedAtPickup, startRide, completeOrder,
  };
}
