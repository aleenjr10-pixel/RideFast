# RideShare — Monorepo

A full-stack rideshare platform with three surfaces:

| App | Stack | Description |
|-----|-------|-------------|
| `apps/customer` | React Native (Expo) | Customer mobile app — book rides |
| `apps/driver` | React Native (Expo) | Driver mobile app — accept/decline orders |
| `apps/admin` | React + Vite | Web dashboard — track drivers, revenue, trips |
| `packages/shared` | TypeScript | Shared types, Supabase client, constants |

---

## Tech Stack

- **Frontend (mobile):** React Native via Expo
- **Frontend (web):** React 18 + Vite
- **Backend / DB:** Supabase (Postgres + Auth + Realtime)
- **Language:** TypeScript throughout

---

## Quick Start

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a new project, then run the schema:

```
supabase/schema.sql   ← paste this into the SQL editor
```

Enable Realtime for the `orders` and `drivers` tables:
> Database → Replication → toggle on `orders` and `drivers`

### 2. Set environment variables

**Customer app** (`apps/customer/.env`):
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Driver app** (`apps/driver/.env`):
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Admin dashboard** (`apps/admin/.env`):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install dependencies

```bash
yarn install
```

### 4. Run each app

```bash
# Customer mobile app
yarn customer          # opens Expo — scan QR with Expo Go

# Driver mobile app
yarn driver            # opens Expo — scan QR with Expo Go

# Admin web dashboard
yarn admin             # opens http://localhost:5173
```

---

## Project Structure

```
rideshare/
├── apps/
│   ├── customer/
│   │   ├── App.tsx                  # Entry point
│   │   └── src/
│   │       ├── hooks/
│   │       │   ├── useAuth.ts       # Supabase auth
│   │       │   └── useOrders.ts     # Request ride, realtime order updates
│   │       └── screens/
│   │           ├── LoginScreen.tsx
│   │           └── HomeScreen.tsx   # Book ride, vehicle selection
│   │
│   ├── driver/
│   │   ├── App.tsx
│   │   └── src/
│   │       ├── hooks/
│   │       │   ├── useAuth.ts
│   │       │   └── useDriver.ts     # Status toggle, location push, accept/decline
│   │       └── screens/
│   │           ├── LoginScreen.tsx
│   │           └── HomeScreen.tsx   # Incoming orders, active ride, earnings
│   │
│   └── admin/
│       └── src/
│           ├── hooks/
│           │   ├── useAuth.ts
│           │   └── useDashboard.ts  # Stats, realtime updates
│           ├── components/
│           │   ├── StatCard.tsx
│           │   ├── OrdersTable.tsx
│           │   ├── DriversTable.tsx
│           │   └── LiveMap.tsx      # Replace with Mapbox for production
│           └── pages/
│               ├── LoginPage.tsx
│               └── DashboardPage.tsx
│
├── packages/
│   └── shared/
│       └── src/
│           ├── types/index.ts       # All domain types
│           ├── constants/index.ts   # Vehicle options, fare calc, labels
│           └── lib/supabase.ts      # Shared Supabase client
│
└── supabase/
    └── schema.sql                   # Full DB schema + RLS policies
```

---

## What's Next

Immediate next steps to move from scaffold to working MVP:

1. **Maps integration** — add `react-native-maps` to mobile apps with real geocoding; replace `LiveMap.tsx` placeholder with Mapbox GL
2. **Push notifications** — Expo Notifications for incoming order alerts to drivers
3. **Payment** — integrate Stripe for card-on-file and automatic charging on trip completion
4. **Driver registration flow** — admin-approved driver signup with document upload
5. **Rating screen** — post-trip rating UI for both customer and driver

---

## User Roles & Auth Flow

| Role | Signs up via | Access |
|------|-------------|--------|
| Customer | Customer app | Can request rides, view history |
| Driver | Must be created by admin | Can receive and complete rides |
| Admin | Supabase dashboard | Full access to dashboard |
