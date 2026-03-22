import React, { useState, useEffect } from 'react';
import { useSettings, Rates, VehicleRates } from '../hooks/useSettings';

const VEHICLE_LABELS: Record<string, string> = {
  economy: 'RideFast',
  comfort: 'Comfort',
  premium: 'Premium',
};

export default function SettingsPage() {
  const { rates, loading, saving, saved, saveRates } = useSettings();
  const [draft, setDraft] = useState<Rates>(rates);

  useEffect(() => { setDraft(rates); }, [rates]);

  const update = (type: keyof Rates, field: keyof VehicleRates, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return;
    setDraft(prev => ({ ...prev, [type]: { ...prev[type], [field]: num } }));
  };

  if (loading) return <p style={{ color: '#aaa', padding: 32 }}>Se incarca...</p>;

  return (
    <div>
      <h2 style={pageTitle}>Setari</h2>

      <div style={card}>
        <h3 style={sectionTitle}>Tarife curse</h3>
        <p style={desc}>Modificarile se aplica la toate cursele noi.</p>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Tip masina</th>
              <th style={th}>Tarif pornire (lei)</th>
              <th style={th}>Tarif / km (lei)</th>
              <th style={th}>Tarif / min (lei)</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(draft) as (keyof Rates)[]).map((type) => (
              <tr key={type}>
                <td style={td}>
                  <span style={{ fontWeight: 600, color: '#111' }}>{VEHICLE_LABELS[type]}</span>
                </td>
                <td style={td}>
                  <input
                    type="number" min="0" step="0.5"
                    value={draft[type].base_fare}
                    onChange={e => update(type, 'base_fare', e.target.value)}
                    style={input}
                  />
                </td>
                <td style={td}>
                  <input
                    type="number" min="0" step="0.1"
                    value={draft[type].per_km}
                    onChange={e => update(type, 'per_km', e.target.value)}
                    style={input}
                  />
                </td>
                <td style={td}>
                  <input
                    type="number" min="0" step="0.05"
                    value={draft[type].per_min}
                    onChange={e => update(type, 'per_min', e.target.value)}
                    style={input}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => saveRates(draft)}
            disabled={saving}
            style={saveBtn}
          >
            {saving ? 'Se salveaza...' : 'Salveaza'}
          </button>
          {saved && <span style={{ color: '#22c55e', fontSize: 13, fontWeight: 500 }}>✓ Salvat</span>}
        </div>
      </div>
    </div>
  );
}

const pageTitle: React.CSSProperties = { fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 20 };
const sectionTitle: React.CSSProperties = { fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 4 };
const desc: React.CSSProperties = { fontSize: 13, color: '#888', marginBottom: 20 };
const card: React.CSSProperties = {
  background: '#fff', borderRadius: 12, border: '1px solid #efefef', padding: '24px 28px',
};
const th: React.CSSProperties = {
  textAlign: 'left', fontSize: 12, color: '#999', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.05em',
  padding: '8px 12px', borderBottom: '1px solid #f0f0f0',
};
const td: React.CSSProperties = {
  padding: '10px 12px', borderBottom: '1px solid #f8f8f8',
};
const input: React.CSSProperties = {
  width: 90, padding: '7px 10px', borderRadius: 8,
  border: '1px solid #e0e0e0', fontSize: 14, color: '#111',
  outline: 'none',
};
const saveBtn: React.CSSProperties = {
  padding: '10px 24px', borderRadius: 10, border: 'none',
  background: '#111', color: '#fff', fontSize: 14,
  fontWeight: 600, cursor: 'pointer',
};
