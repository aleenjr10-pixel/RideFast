import { useEffect, useState } from 'react';
import { supabase } from '@rideshare/shared';
import type { RatesConfig } from '@rideshare/shared';

const DEFAULT_RATES: RatesConfig = {
  economy: { base_fare: 5, per_km: 2.5, per_min: 0.4 },
  comfort: { base_fare: 8, per_km: 3.5, per_min: 0.6 },
  premium: { base_fare: 15, per_km: 6, per_min: 1 },
};

export function useRates() {
  const [rates, setRates] = useState<RatesConfig>(DEFAULT_RATES);

  useEffect(() => {
    supabase
      .from('settings')
      .select('value')
      .eq('key', 'rates')
      .single()
      .then(({ data }) => {
        if (data?.value) setRates(data.value as RatesConfig);
      });
  }, []);

  return rates;
}
