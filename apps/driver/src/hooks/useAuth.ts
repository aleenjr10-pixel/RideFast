import { useEffect, useState } from 'react';
import { supabase } from '@rideshare/shared';
import type { Session } from '@supabase/supabase-js';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const resolveSession = async (s: typeof session) => {
    if (!s) { setSession(null); return; }
    if (s.user?.user_metadata?.role === 'driver') {
      const { data: driver } = await supabase
        .from('drivers').select('approved').eq('user_id', s.user.id).single();
      if (!driver?.approved) { setSession(null); return; }
    }
    setSession(s);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      resolveSession(data.session).finally(() => setLoading(false));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => resolveSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user?.user_metadata?.role !== 'driver') {
      await supabase.auth.signOut();
      throw new Error('Access denied. Driver accounts only.');
    }
    const { data: driver } = await supabase
      .from('drivers')
      .select('approved')
      .eq('user_id', data.user.id)
      .single();
    if (!driver?.approved) {
      await supabase.auth.signOut();
      throw new Error('PENDING_APPROVAL');
    }
  };

  const signUp = async (
    email: string, password: string, fullName: string, phone: string,
    vehicleType: string, vehiclePlate: string, vehicleModel: string, vehicleColor: string,
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone, role: 'driver', vehicle_type: vehicleType, vehicle_plate: vehiclePlate, vehicle_model: vehicleModel, vehicle_color: vehicleColor },
      },
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  return { session, loading, signIn, signUp, signOut };
}
