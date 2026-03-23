import React, { useEffect, useState } from 'react';
import { supabase } from '@rideshare/shared';

interface PendingDriver {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  vehicle_type: string;
  vehicle_model: string;
  vehicle_color: string;
  vehicle_plate: string;
  documents: { license_url?: string; id_card_url?: string };
  created_at: string;
}

export default function ApprovalsPage() {
  const [drivers, setDrivers] = useState<PendingDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [docUrls, setDocUrls] = useState<Record<string, { license?: string; id_card?: string }>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('drivers')
      .select('id, user_id, full_name, phone, vehicle_type, vehicle_model, vehicle_color, vehicle_plate, documents, created_at')
      .eq('approved', false)
      .order('created_at', { ascending: true });
    setDrivers(data ?? []);
    setLoading(false);
  };

  const loadDocUrls = async (driver: PendingDriver) => {
    if (docUrls[driver.id]) return;
    const { license_url, id_card_url } = driver.documents ?? {};
    const [licRes, idRes] = await Promise.all([
      license_url ? supabase.storage.from('driver-documents').createSignedUrl(license_url, 3600) : null,
      id_card_url ? supabase.storage.from('driver-documents').createSignedUrl(id_card_url, 3600) : null,
    ]);
    setDocUrls((prev) => ({
      ...prev,
      [driver.id]: {
        license: licRes?.data?.signedUrl,
        id_card: idRes?.data?.signedUrl,
      },
    }));
  };

  useEffect(() => { fetchPending(); }, []);
  useEffect(() => {
    drivers.forEach(loadDocUrls);
  }, [drivers]);

  const approve = async (driver: PendingDriver) => {
    setProcessing(driver.id);
    await supabase.from('drivers').update({ approved: true }).eq('id', driver.id);
    setDrivers((prev) => prev.filter((d) => d.id !== driver.id));
    setProcessing(null);
  };

  const reject = async (driver: PendingDriver) => {
    if (!confirm(`Respingi contul lui ${driver.full_name}? Aceasta actiune va sterge inregistrarea soferului.`)) return;
    setProcessing(driver.id);
    await supabase.from('drivers').delete().eq('id', driver.id);
    setDrivers((prev) => prev.filter((d) => d.id !== driver.id));
    setProcessing(null);
  };

  if (loading) return <p style={{ color: '#bbb' }}>Se incarca...</p>;

  if (!drivers.length) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#bbb' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <p style={{ fontSize: 15 }}>Niciun sofer in asteptare.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {drivers.map((driver) => {
        const urls = docUrls[driver.id];
        const isProcessing = processing === driver.id;
        return (
          <div key={driver.id} style={cardStyle}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={avatarStyle}>
                  {driver.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#111' }}>{driver.full_name}</div>
                  <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{driver.phone}</div>
                  <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
                    Inregistrat la {new Date(driver.created_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => reject(driver)}
                  disabled={isProcessing}
                  style={{ ...btnStyle, background: '#fff', color: '#ef4444', border: '1px solid #fca5a5' }}
                >
                  Respinge
                </button>
                <button
                  onClick={() => approve(driver)}
                  disabled={isProcessing}
                  style={{ ...btnStyle, background: '#111', color: '#fff', border: 'none' }}
                >
                  {isProcessing ? 'Se proceseaza...' : 'Aproba'}
                </button>
              </div>
            </div>

            {/* Vehicle info */}
            <div style={sectionStyle}>
              <div style={labelStyle}>Vehicul</div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <Field label="Tip" value={driver.vehicle_type} />
                <Field label="Model" value={driver.vehicle_model} />
                <Field label="Culoare" value={driver.vehicle_color} />
                <Field label="Nr. inmatriculare" value={driver.vehicle_plate} />
              </div>
            </div>

            {/* Documents */}
            <div style={sectionStyle}>
              <div style={labelStyle}>Documente</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <DocPreview label="Permis de conducere" url={urls?.license} />
                <DocPreview label="Carte de identitate" url={urls?.id_card} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#111', fontWeight: 500, textTransform: 'capitalize' }}>{value ?? '—'}</div>
    </div>
  );
}

function DocPreview({ label, url }: { label: string; url?: string }) {
  return (
    <div style={{ flex: 1, minWidth: 200 }}>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{label}</div>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
          <img
            src={url}
            alt={label}
            style={{ width: '100%', maxWidth: 280, height: 160, objectFit: 'cover', borderRadius: 10, border: '1px solid #efefef', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 11, color: '#888', marginTop: 4, display: 'block' }}>Click pentru a mari</span>
        </a>
      ) : (
        <div style={{ width: 280, height: 160, borderRadius: 10, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 13 }}>
          Se incarca...
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 14, border: '1px solid #efefef', padding: '24px 28px',
};
const avatarStyle: React.CSSProperties = {
  width: 46, height: 46, borderRadius: '50%', background: '#e0e7ff',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 15, fontWeight: 700, color: '#4338ca', flexShrink: 0,
};
const btnStyle: React.CSSProperties = {
  padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const sectionStyle: React.CSSProperties = {
  borderTop: '1px solid #f5f5f5', paddingTop: 16, marginTop: 4,
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12,
};
