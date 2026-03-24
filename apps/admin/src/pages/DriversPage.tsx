import React, { useEffect, useState } from 'react';
import { supabase } from '@rideshare/shared';

interface Driver {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  vehicle_type: string;
  vehicle_model: string;
  vehicle_color: string;
  vehicle_plate: string;
  documents: { license_url?: string; id_card_url?: string };
  status: string;
  rating: number;
  total_trips: number;
  approved: boolean;
  created_at: string;
}

const STATUS_LABEL: Record<string, { label: string; color: string; dot: string }> = {
  online:   { label: 'Online',    color: '#16a34a', dot: '#22c55e' },
  offline:  { label: 'Offline',   color: '#9ca3af', dot: '#d1d5db' },
  in_ride:  { label: 'In cursa',  color: '#2563eb', dot: '#3b82f6' },
};

export default function DriversPage() {
  const [subTab, setSubTab] = useState<'active' | 'pending'>('active');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [docUrls, setDocUrls] = useState<Record<string, { license?: string; id_card?: string }>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchDrivers = async () => {
    setLoading(true);
    setExpandedId(null);
    const query = supabase
      .from('drivers')
      .select('id, user_id, full_name, phone, vehicle_type, vehicle_model, vehicle_color, vehicle_plate, documents, status, rating, total_trips, approved, created_at')
      .order('created_at', { ascending: false });

    const { data } = subTab === 'active'
      ? await query.eq('approved', true)
      : await query.eq('approved', false);

    setDrivers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchDrivers(); }, [subTab]);

  const loadDocUrls = async (driver: Driver) => {
    if (docUrls[driver.id]) return;
    const { license_url, id_card_url } = driver.documents ?? {};
    console.log('[docs]', driver.full_name, { license_url, id_card_url });
    const [licRes, idRes] = await Promise.all([
      license_url ? supabase.storage.from('driver-documents').createSignedUrl(license_url, 3600) : null,
      id_card_url ? supabase.storage.from('driver-documents').createSignedUrl(id_card_url, 3600) : null,
    ]);
    console.log('[signed urls]', { lic: licRes?.data?.signedUrl, licErr: licRes?.error, id: idRes?.data?.signedUrl, idErr: idRes?.error });
    setDocUrls((prev) => ({
      ...prev,
      [driver.id]: {
        license: licRes?.data?.signedUrl,
        id_card: idRes?.data?.signedUrl,
      },
    }));
  };

  const toggleExpand = (driver: Driver) => {
    const next = expandedId === driver.id ? null : driver.id;
    setExpandedId(next);
    if (next) loadDocUrls(driver);
  };

  const approve = async (driver: Driver) => {
    setProcessing(driver.id);
    const { error } = await supabase.from('drivers').update({ approved: true }).eq('id', driver.id);
    if (error) { alert(`Eroare la aprobare: ${error.message}`); setProcessing(null); return; }
    setDrivers((prev) => prev.filter((d) => d.id !== driver.id));
    setProcessing(null);
  };

  const reject = async (driver: Driver) => {
    if (!confirm(`Respingi contul lui ${driver.full_name}?`)) return;
    setProcessing(driver.id);
    const { error } = await supabase.from('drivers').delete().eq('id', driver.id);
    if (error) { alert(`Eroare la respingere: ${error.message}`); setProcessing(null); return; }
    setDrivers((prev) => prev.filter((d) => d.id !== driver.id));
    setProcessing(null);
  };

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #efefef', paddingBottom: 0 }}>
        {(['active', 'pending'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            style={{
              padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: subTab === t ? 600 : 400,
              color: subTab === t ? '#111' : '#888',
              borderBottom: subTab === t ? '2px solid #111' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t === 'active' ? 'Soferi activi' : 'Soferi in asteptare'}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#bbb', fontSize: 14 }}>Se incarca...</p>
      ) : drivers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#bbb' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>{subTab === 'active' ? '🚗' : '✅'}</div>
          <p style={{ fontSize: 14 }}>{subTab === 'active' ? 'Niciun sofer inregistrat.' : 'Niciun sofer in asteptare.'}</p>
        </div>
      ) : (
        <div style={{ border: '1px solid #efefef', borderRadius: 12, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ ...rowStyle, background: '#fafafa', borderBottom: '1px solid #efefef' }}>
            <div style={{ ...colName, color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>Sofer</div>
            <div style={{ ...colVehicle, color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>Masina</div>
            <div style={{ ...colPlate, color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>Nr. inmatriculare</div>
            {subTab === 'active' && (
              <div style={{ ...colStatus, color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>Status</div>
            )}
            <div style={{ width: 24 }} />
          </div>

          {drivers.map((driver, i) => {
            const isExpanded = expandedId === driver.id;
            const st = STATUS_LABEL[driver.status] ?? STATUS_LABEL.offline;
            const urls = docUrls[driver.id];
            const isLast = i === drivers.length - 1;

            return (
              <div key={driver.id} style={{ borderBottom: isLast ? 'none' : '1px solid #f5f5f5' }}>
                {/* Row */}
                <div
                  style={{ ...rowStyle, cursor: 'pointer', background: isExpanded ? '#fafafa' : '#fff' }}
                  onClick={() => toggleExpand(driver)}
                >
                  <div style={colName}>
                    <div style={avatarStyle}>
                      {driver.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>{driver.full_name}</span>
                  </div>
                  <div style={{ ...colVehicle, fontSize: 14, color: '#555', textTransform: 'capitalize' }}>
                    {driver.vehicle_type} · {driver.vehicle_model}
                  </div>
                  <div style={{ ...colPlate, fontSize: 14, color: '#555', fontFamily: 'monospace', letterSpacing: 1 }}>
                    {driver.vehicle_plate}
                  </div>
                  {subTab === 'active' && (
                    <div style={{ ...colStatus, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: st.dot }} />
                      <span style={{ fontSize: 13, color: st.color }}>{st.label}</span>
                    </div>
                  )}
                  <div style={{ width: 24, color: '#bbb', fontSize: 12, textAlign: 'center' }}>
                    {isExpanded ? '▲' : '▼'}
                  </div>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div style={{ background: '#fafafa', borderTop: '1px solid #f0f0f0', padding: '20px 24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px 24px', marginBottom: 20 }}>
                      <Field label="Telefon" value={driver.phone} />
                      <Field label="Tip vehicul" value={driver.vehicle_type} capitalize />
                      <Field label="Model" value={driver.vehicle_model} />
                      <Field label="Culoare" value={driver.vehicle_color} />
                      <Field label="Nr. inmatriculare" value={driver.vehicle_plate} mono />
                      {subTab === 'active' && <Field label="Rating" value={`${driver.rating?.toFixed(1)} ★`} />}
                      {subTab === 'active' && <Field label="Curse totale" value={String(driver.total_trips)} />}
                      <Field label="Inregistrat" value={new Date(driver.created_at).toLocaleDateString('ro-RO')} />
                    </div>

                    {/* Documents */}
                    <div style={{ marginBottom: subTab === 'pending' ? 20 : 0 }}>
                      <div style={labelStyle}>Documente</div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <DocPreview label="Permis de conducere" url={urls?.license} />
                        <DocPreview label="Carte de identitate" url={urls?.id_card} />
                      </div>
                    </div>

                    {/* Pending actions */}
                    {subTab === 'pending' && (
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, borderTop: '1px solid #efefef', paddingTop: 16 }}>
                        <button
                          onClick={() => reject(driver)}
                          disabled={processing === driver.id}
                          style={{ padding: '9px 20px', borderRadius: 10, border: '1px solid #fca5a5', background: '#fff', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Respinge
                        </button>
                        <button
                          onClick={() => approve(driver)}
                          disabled={processing === driver.id}
                          style={{ padding: '9px 24px', borderRadius: 10, border: 'none', background: '#111', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                        >
                          {processing === driver.id ? 'Se proceseaza...' : 'Aproba'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, capitalize, mono }: { label: string; value: string; capitalize?: boolean; mono?: boolean }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={{ fontSize: 14, color: '#111', fontWeight: 500, textTransform: capitalize ? 'capitalize' : 'none', fontFamily: mono ? 'monospace' : 'inherit', letterSpacing: mono ? 1 : 'normal' }}>
        {value ?? '—'}
      </div>
    </div>
  );
}

function DocPreview({ label, url }: { label: string; url?: string }) {
  return (
    <div style={{ flex: 1, minWidth: 200 }}>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{label}</div>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt={label} style={{ width: '100%', maxWidth: 260, height: 150, objectFit: 'cover', borderRadius: 10, border: '1px solid #efefef', cursor: 'pointer' }} />
        </a>
      ) : (
        <div style={{ width: 260, height: 150, borderRadius: 10, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 13 }}>
          Fara document
        </div>
      )}
    </div>
  );
}

const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', padding: '14px 20px', gap: 16 };
const colName: React.CSSProperties = { flex: 2, display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 };
const colVehicle: React.CSSProperties = { flex: 2, minWidth: 0 };
const colPlate: React.CSSProperties = { flex: 1, minWidth: 0 };
const colStatus: React.CSSProperties = { flex: 1, minWidth: 0 };
const avatarStyle: React.CSSProperties = {
  width: 34, height: 34, borderRadius: '50%', background: '#e0e7ff', flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 12, fontWeight: 700, color: '#4338ca',
};
const labelStyle: React.CSSProperties = { fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 };
