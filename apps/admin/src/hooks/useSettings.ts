import { useEffect, useState } from 'react';
import { supabase } from '@rideshare/shared';

export interface VehicleRates {
  base_fare: number;
  per_km: number;
  per_min: number;
}

export interface Rates {
  economy: VehicleRates;
  comfort: VehicleRates;
  premium: VehicleRates;
}

const DEFAULT_RATES: Rates = {
  economy: { base_fare: 5, per_km: 2.5, per_min: 0.4 },
  comfort: { base_fare: 8, per_km: 3.5, per_min: 0.6 },
  premium: { base_fare: 15, per_km: 6, per_min: 1 },
};

export function useSettings() {
  const [rates, setRates] = useState<Rates>(DEFAULT_RATES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase
      .from('settings')
      .select('value')
      .eq('key', 'rates')
      .single()
      .then(({ data }) => {
        if (data?.value) setRates(data.value as Rates);
        setLoading(false);
      });
  }, []);

  const saveRates = async (newRates: Rates) => {
    setSaving(true);
    await supabase
      .from('settings')
      .upsert({ key: 'rates', value: newRates, updated_at: new Date().toISOString() });
    setRates(newRates);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return { rates, loading, saving, saved, saveRates };
}
