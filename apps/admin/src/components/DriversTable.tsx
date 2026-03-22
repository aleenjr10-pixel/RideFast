import React from 'react';
import type { Driver } from '@rideshare/shared';

const STATUS_DOT: Record<string, string> = {
  online:   '#22c55e',
  offline:  '#d1d5db',
  in_ride:  '#3b82f6',
};

interface Props {
  drivers: Driver[];
}

export function DriversTable({ drivers }: Props) {
  if (!drivers.length) {
    return <p style={{ color: '#bbb', fontSize: 14 }}>No active drivers right now.</p>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #efefef' }}>
            {['Driver', 'Vehicle', 'Status', 'Rating', 'Trips'].map((h) => (
              <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#999', fontWeight: 500 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {drivers.map((d) => (
            <tr key={d.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
              <td style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: '#e0e7ff', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#4338ca',
                    flexShrink: 0,
                  }}>
                    {d.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, color: '#111' }}>{d.full_name}</div>
                    <div style={{ fontSize: 11, color: '#aaa' }}>{d.phone}</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: '10px 12px', color: '#555', textTransform: 'capitalize' }}>
                {d.vehicle_type} · {d.vehicle_plate}
              </td>
              <td style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: STATUS_DOT[d.status] ?? '#d1d5db',
                  }} />
                  <span style={{ color: '#555', textTransform: 'capitalize' }}>
                    {d.status.replace('_', ' ')}
                  </span>
                </div>
              </td>
              <td style={{ padding: '10px 12px', color: '#111', fontWeight: 500 }}>
                {d.rating.toFixed(1)} ★
              </td>
              <td style={{ padding: '10px 12px', color: '#555' }}>
                {d.total_trips}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
