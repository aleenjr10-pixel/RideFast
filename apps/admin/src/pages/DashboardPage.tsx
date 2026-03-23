import React, { useState } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { useAuth } from '../hooks/useAuth';
import { StatCard } from '../components/StatCard';
import { OrdersTable } from '../components/OrdersTable';
import { DriversTable } from '../components/DriversTable';
import { LiveMap } from '../components/LiveMap';
import SettingsPage from './SettingsPage';
import DriversPage from './DriversPage';

type Tab = 'overview' | 'drivers' | 'trips' | 'settings';

export default function DashboardPage() {
  const { signOut } = useAuth();
  const { stats, recentOrders, activeDrivers, loading } = useDashboard();
  const [tab, setTab] = useState<Tab>('overview');

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#bbb' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 220,
        background: '#fff', borderRight: '1px solid #efefef',
        display: 'flex', flexDirection: 'column', padding: '28px 16px',
      }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: 0 }}>RideShare</h1>
          <p style={{ fontSize: 12, color: '#aaa', margin: '2px 0 0' }}>Admin</p>
        </div>

        {(['overview', 'drivers', 'trips', 'settings'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: tab === t ? 600 : 400,
              background: tab === t ? '#f3f4f6' : 'transparent',
              color: tab === t ? '#111' : '#666',
              marginBottom: 4,
            }}
          >
            {t === 'overview' ? '📊 Overview'
              : t === 'drivers' ? '🚗 Soferi'
              : t === 'trips' ? '🗺️ Curse'
              : '⚙️ Setari'}
          </button>
        ))}

        <div style={{ marginTop: 'auto' }}>
          <button
            onClick={() => signOut()}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: '1px solid #e8e8e8', background: 'transparent',
              color: '#888', fontSize: 13, cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ marginLeft: 220, padding: '32px 36px' }}>
        {tab === 'overview' && (
          <>
            <h2 style={pageTitle}>Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
              <StatCard label="Active drivers" value={stats.active_drivers} delta={`${stats.online_drivers} available`} />
              <StatCard label="Revenue today" value={`$${stats.revenue_today.toFixed(2)}`} delta="updated live" />
              <StatCard label="Trips today" value={stats.trips_today} delta={`${stats.pending_orders} pending`} positive={stats.pending_orders === 0} />
              <StatCard label="Avg rating" value={`${stats.avg_rating.toFixed(2)} ★`} />
              <StatCard label="Pending orders" value={stats.pending_orders} positive={stats.pending_orders === 0} />
            </div>

            <h3 style={sectionTitle}>Live map</h3>
            <div style={{ marginBottom: 32 }}>
              <LiveMap drivers={activeDrivers} />
            </div>

            <h3 style={sectionTitle}>Recent trips</h3>
            <div style={card}>
              <OrdersTable orders={recentOrders} />
            </div>
          </>
        )}

        {tab === 'drivers' && (
          <>
            <h2 style={pageTitle}>Soferi</h2>
            <DriversPage />
          </>
        )}

        {tab === 'trips' && (
          <>
            <h2 style={pageTitle}>Curse</h2>
            <div style={card}>
              <OrdersTable orders={recentOrders} />
            </div>
          </>
        )}

        {tab === 'settings' && <SettingsPage />}
      </div>
    </div>
  );
}

const pageTitle: React.CSSProperties = { fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 20 };
const sectionTitle: React.CSSProperties = { fontSize: 15, fontWeight: 600, color: '#333', marginBottom: 12 };
const card: React.CSSProperties = {
  background: '#fff', borderRadius: 12, border: '1px solid #efefef', padding: '20px 24px',
};
