import React from 'react';
import type { Driver } from '@rideshare/shared';

interface Props {
  drivers: Driver[];
}

const STATUS_COLOR: Record<string, string> = {
  online:  '#22c55e',
  in_ride: '#3b82f6',
  offline: '#9ca3af',
};

/**
 * LiveMap — placeholder using SVG dots on a grid background.
 * Replace this component body with a real Mapbox GL / Google Maps
 * integration when ready. Driver locations come from driver.location (LatLng).
 *
 * Mapbox setup:
 *   npm install mapbox-gl
 *   import mapboxgl from 'mapbox-gl';
 *   mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
 */
export function LiveMap({ drivers }: Props) {
  // Map driver positions to pseudo screen coords (for placeholder only)
  const toScreenX = (lng: number) => ((lng + 180) / 360) * 700;
  const toScreenY = (lat: number) => ((90 - lat) / 180) * 260;

  return (
    <div style={{
      background: '#f0fdf4',
      border: '1px solid #dcfce7',
      borderRadius: 12,
      overflow: 'hidden',
      position: 'relative',
      height: 280,
    }}>
      <svg width="100%" height="280" viewBox="0 0 700 280" preserveAspectRatio="xMidYMid slice">
        {/* Grid lines */}
        {[1,2,3,4,5,6].map((i) => (
          <line key={`v${i}`} x1={i * 100} y1={0} x2={i * 100} y2={280} stroke="#bbf7d0" strokeWidth={0.5} />
        ))}
        {[1,2,3].map((i) => (
          <line key={`h${i}`} x1={0} y1={i * 70} x2={700} y2={i * 70} stroke="#bbf7d0" strokeWidth={0.5} />
        ))}

        {/* Driver blips */}
        {drivers.map((d) => {
          const x = d.location ? toScreenX(d.location.longitude) : Math.random() * 600 + 50;
          const y = d.location ? toScreenY(d.location.latitude) : Math.random() * 200 + 40;
          const color = STATUS_COLOR[d.status] ?? '#9ca3af';
          return (
            <g key={d.id}>
              <circle cx={x} cy={y} r={7} fill={color} stroke="#fff" strokeWidth={2} />
              <text x={x + 10} y={y + 4} fontSize={10} fill="#374151" fontFamily="sans-serif">
                {d.full_name?.split(' ')[0]}
              </text>
            </g>
          );
        })}

        {/* Fallback blips if no drivers */}
        {drivers.length === 0 && (
          <>
            <circle cx={120} cy={130} r={7} fill="#22c55e" stroke="#fff" strokeWidth={2} />
            <circle cx={280} cy={90}  r={7} fill="#3b82f6" stroke="#fff" strokeWidth={2} />
            <circle cx={420} cy={160} r={7} fill="#22c55e" stroke="#fff" strokeWidth={2} />
            <circle cx={560} cy={80}  r={7} fill="#3b82f6" stroke="#fff" strokeWidth={2} />
            <circle cx={200} cy={200} r={7} fill="#9ca3af" stroke="#fff" strokeWidth={2} />
          </>
        )}
      </svg>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 10, left: 12,
        display: 'flex', gap: 14, fontSize: 11, color: '#555',
      }}>
        {[['#22c55e', 'Available'], ['#3b82f6', 'In ride'], ['#9ca3af', 'Offline']].map(([color, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
