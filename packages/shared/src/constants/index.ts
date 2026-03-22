import type { VehicleOption } from '../types';

export const CURRENCY = 'lei';

export const VEHICLE_OPTIONS: VehicleOption[] = [
  {
    type: 'economy',
    label: 'RideFast',
    description: 'Curse accesibile de zi cu zi',
    base_fare: 5,
    per_km: 2.5,
    per_min: 0.4,
    eta_minutes: 8,
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80',
  },
  {
    type: 'comfort',
    label: 'Comfort',
    description: 'Masini noi, spatiu suplimentar',
    base_fare: 8,
    per_km: 3.5,
    per_min: 0.6,
    eta_minutes: 5,
    image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80',
  },
  {
    type: 'premium',
    label: 'Premium',
    description: 'Vehicule de lux, top rated',
    base_fare: 15,
    per_km: 6,
    per_min: 1,
    eta_minutes: 3,
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&q=80',
  },
];

export interface VehicleRates {
  base_fare: number;
  per_km: number;
  per_min: number;
}

export interface RatesConfig {
  economy: VehicleRates;
  comfort: VehicleRates;
  premium: VehicleRates;
}

// Estimate price for a trip — uses Supabase rates if provided, falls back to VEHICLE_OPTIONS defaults
export function estimatePrice(
  vehicleType: VehicleOption['type'],
  distanceKm: number,
  durationMin: number,
  rates?: RatesConfig
): number {
  let base_fare: number, per_km: number, per_min: number;
  if (rates) {
    ({ base_fare, per_km, per_min } = rates[vehicleType]);
  } else {
    const vehicle = VEHICLE_OPTIONS.find((v) => v.type === vehicleType);
    if (!vehicle) return 0;
    ({ base_fare, per_km, per_min } = vehicle);
  }
  const total = base_fare + per_km * distanceKm + per_min * durationMin;
  return Math.round(total * 100) / 100;
}

export const APP_NAME = 'RideShare';

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Se cauta sofer...',
  accepted: 'Sofer acceptat',
  arriving: 'Soferul vine spre tine',
  in_progress: 'Cursa in desfasurare',
  completed: 'Cursa finalizata',
  cancelled: 'Anulata',
};
