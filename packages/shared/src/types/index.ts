// ─── User / Auth ───────────────────────────────────────────────────────────

export type UserRole = 'customer' | 'driver' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
}

// ─── Driver ────────────────────────────────────────────────────────────────

export type DriverStatus = 'online' | 'offline' | 'in_ride';

export interface Driver {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  avatar_url?: string;
  vehicle_type: VehicleType;
  vehicle_plate: string;
  vehicle_model: string;
  status: DriverStatus;
  rating: number;
  total_trips: number;
  location?: LatLng;
  created_at: string;
}

// ─── Location ──────────────────────────────────────────────────────────────

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Address {
  label: string;
  lat: number;
  lng: number;
}

// ─── Vehicle / Ride Types ──────────────────────────────────────────────────

export type VehicleType = 'economy' | 'comfort' | 'premium';

export interface VehicleOption {
  type: VehicleType;
  label: string;
  description: string;
  base_fare: number;
  per_km: number;
  per_min: number;
  eta_minutes: number;
  image: string;
}

// ─── Order / Trip ──────────────────────────────────────────────────────────

export type OrderStatus =
  | 'pending'       // customer requested, waiting for driver
  | 'accepted'      // driver accepted
  | 'arriving'      // driver en route to pickup
  | 'in_progress'   // trip underway
  | 'completed'     // trip finished
  | 'cancelled';    // cancelled by either party

export interface Order {
  id: string;
  customer_id: string;
  driver_id?: string;
  vehicle_type: VehicleType;
  pickup: Address;
  dropoff: Address;
  status: OrderStatus;
  estimated_price: number;
  final_price?: number;
  distance_km?: number;
  duration_min?: number;
  created_at: string;
  accepted_at?: string;
  completed_at?: string;
}

// ─── Rating ────────────────────────────────────────────────────────────────

export interface Rating {
  id: string;
  order_id: string;
  from_user_id: string;
  to_user_id: string;
  score: number;        // 1–5
  comment?: string;
  created_at: string;
}

// ─── Admin / Analytics ─────────────────────────────────────────────────────

export interface DashboardStats {
  active_drivers: number;
  online_drivers: number;
  revenue_today: number;
  trips_today: number;
  avg_rating: number;
  pending_orders: number;
}
