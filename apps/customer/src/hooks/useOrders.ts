import { useEffect, useState } from 'react';
import { supabase } from '@rideshare/shared';
import type { Order, VehicleType, Address } from '@rideshare/shared';

export function useOrders(customerId: string | undefined) {
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  // Load existing active order on mount
  useEffect(() => {
    if (!customerId) return;
    supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .in('status', ['pending', 'accepted', 'arriving', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => { if (data) setActiveOrder(data as Order); });
  }, [customerId]);

  // Subscribe to active order changes in real-time
  useEffect(() => {
    if (!customerId) return;

    const channel = supabase
      .channel('customer_orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${customerId}`,
        },
        (payload) => {
          const updated = payload.new as Order;
          if (['pending', 'accepted', 'arriving', 'in_progress'].includes(updated.status)) {
            setActiveOrder(updated);
          } else {
            setActiveOrder(null);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [customerId]);

  const requestRide = async (
    pickup: Address,
    dropoff: Address,
    vehicleType: VehicleType,
    estimatedPrice: number
  ) => {
    if (!customerId) throw new Error('Not authenticated');
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert({
          customer_id: customerId,
          pickup,
          dropoff,
          vehicle_type: vehicleType,
          estimated_price: estimatedPrice,
          status: 'pending',
        })
        .select()
        .single();
      if (error) throw error;
      setActiveOrder(data);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId)
      .eq('customer_id', customerId);
    if (error) throw error;
    setActiveOrder(null);
  };

  const fetchHistory = async () => {
    if (!customerId) return;
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .in('status', ['completed', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(20);
    setOrderHistory(data ?? []);
  };

  return { activeOrder, orderHistory, loading, requestRide, cancelOrder, fetchHistory };
}
