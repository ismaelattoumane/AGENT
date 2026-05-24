'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: 'admin', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const res = await api.login(form.username, form.password);
      localStorage.setItem('mas_token', res.access_token);
      router.push('/');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: 360,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 32,
      }}>
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em' }}>MAS</div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6, fontFamily: 'var(--font-mono)' }}>
            Multi-Agent System
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {['username', 'password'].map(field => (
            <div key={field}>
              <label style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                {field}
              </label>
              <input
                type={field === 'password' ? 'password' : 'text'}
                value={(form as any)[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border-hi)',
                  borderRadius: 6,
                  color: 'var(--text)',
                  fontSize: 14,
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                }}
              />
            </div>
          ))}

          {error && (
            <div style={{ color: 'var(--red)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
              ✕ {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              marginTop: 8,
              padding: '10px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontFamily: 'var(--font-ui)',
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </div>
      </div>
    </div>
  );
}
