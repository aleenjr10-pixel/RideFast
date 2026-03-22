import { useEffect, useState } from 'react';
import { supabase } from '@rideshare/shared';
import type { Session } from '@supabase/supabase-js';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user?.user_metadata?.role !== 'driver') {
      await supabase.auth.signOut();
      throw new Error('Access denied. Driver accounts only.');
    }
  };

  const signUp = async (
    email: string, password: string, fullName: string, phone: string,
    vehicleType: string, vehiclePlate: string, vehicleModel: string,
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone, role: 'driver', vehicle_type: vehicleType, vehicle_plate: vehiclePlate, vehicle_model: vehicleModel },
      },
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  return { session, loading, signIn, signUp, signOut };
}
