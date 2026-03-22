import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#fafafa',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #efefef',
        padding: '40px 36px', width: '100%', maxWidth: 380,
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', marginBottom: 4 }}>RideShare</h1>
        <p style={{ fontSize: 14, color: '#888', marginBottom: 32 }}>Admin dashboard</p>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            placeholder="admin@rideshare.com"
            required
          />

          <label style={labelStyle}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            placeholder="••••••••"
            required
          />

          {error && (
            <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</p>
          )}

          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500,
  color: '#555', marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14,
  border: '1px solid #e0e0e0', background: '#fafafa', color: '#111',
  marginBottom: 16, boxSizing: 'border-box',
};
const btnStyle: React.CSSProperties = {
  width: '100%', padding: '12px', borderRadius: 10, fontSize: 15,
  fontWeight: 600, background: '#111', color: '#fff',
  border: 'none', cursor: 'pointer', marginTop: 4,
};
