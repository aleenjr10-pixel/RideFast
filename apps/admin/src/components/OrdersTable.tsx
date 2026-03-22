import React from 'react';
import type { Order } from '@rideshare/shared';
import { ORDER_STATUS_LABELS } from '@rideshare/shared';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:     { bg: '#fef9c3', color: '#854d0e' },
  accepted:    { bg: '#dbeafe', color: '#1d4ed8' },
  arriving:    { bg: '#dbeafe', color: '#1d4ed8' },
  in_progress: { bg: '#dcfce7', color: '#166534' },
  completed:   { bg: '#f0fdf4', color: '#166534' },
  cancelled:   { bg: '#fee2e2', color: '#991b1b' },
};

interface Props {
  orders: Order[];
}

export function OrdersTable({ orders }: Props) {
  if (!orders.length) {
    return <p style={{ color: '#bbb', fontSize: 14 }}>No trips yet today.</p>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #efefef' }}>
            {['ID', 'Pickup', 'Dropoff', 'Type', 'Price', 'Status', 'Time'].map((h) => (
              <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#999', fontWeight: 500 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const sc = STATUS_COLORS[o.status] ?? { bg: '#f3f4f6', color: '#374151' };
            return (
              <tr key={o.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                <td style={{ padding: '10px 12px', color: '#aaa', fontFamily: 'monospace' }}>
                  #{o.id.slice(0, 6)}
                </td>
                <td style={{ padding: '10px 12px', color: '#333', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {o.pickup.label}
                </td>
                <td style={{ padding: '10px 12px', color: '#333', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {o.dropoff.label}
                </td>
                <td style={{ padding: '10px 12px', color: '#555', textTransform: 'capitalize' }}>
                  {o.vehicle_type}
                </td>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111' }}>
                  ${(o.final_price ?? o.estimated_price).toFixed(2)}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    background: sc.bg, color: sc.color,
                    padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500,
                  }}>
                    {ORDER_STATUS_LABELS[o.status]}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', color: '#aaa' }}>
                  {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
