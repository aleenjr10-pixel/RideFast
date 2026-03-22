import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  positive?: boolean;
}

export function StatCard({ label, value, delta, positive }: StatCardProps) {
  return (
    <div style={{
      background: '#f9f9f9',
      border: '1px solid #efefef',
      borderRadius: 12,
      padding: '16px 20px',
    }}>
      <p style={{ fontSize: 12, color: '#999', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </p>
      <p style={{ fontSize: 28, fontWeight: 700, color: '#111', margin: '6px 0 0' }}>
        {value}
      </p>
      {delta && (
        <p style={{ fontSize: 12, color: positive !== false ? '#16a34a' : '#dc2626', marginTop: 4 }}>
          {delta}
        </p>
      )}
    </div>
  );
}
