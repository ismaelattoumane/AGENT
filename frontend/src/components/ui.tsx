'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/',          icon: '⬡', label: 'Dashboard' },
  { href: '/missions',  icon: '◈', label: 'Missions'  },
  { href: '/agents',    icon: '◎', label: 'Agents'    },
  { href: '/logs',      icon: '≡', label: 'Logs'      },
];

export function Sidebar({ wsConnected }: { wsConnected?: boolean }) {
  const path = usePathname();
  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' }}>
          MAS
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
          Multi-Agent System
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 8px', flex: 1 }}>
        {NAV.map(({ href, icon, label }) => {
          const active = path === href;
          return (
            <Link key={href} href={href} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 6,
              marginBottom: 2,
              background: active ? 'var(--accent-lo)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--muted)',
              fontWeight: active ? 600 : 400,
              textDecoration: 'none',
              fontSize: 13,
              transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* WS status */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className={wsConnected ? 'pulse' : ''} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: wsConnected ? 'var(--green)' : 'var(--muted)',
          display: 'inline-block',
        }} />
        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
          {wsConnected ? 'Live' : 'Offline'}
        </span>
      </div>
    </aside>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    waiting: '⏳', in_progress: '▶', blocked: '⊘',
    user_input: '?', completed: '✓', cancelled: '✕',
    pending: '·', failed: '✕', in_progress_task: '▶',
  };
  return (
    <span className={`badge badge-${status}`}>
      {map[status] || '·'} {status.replace('_', ' ')}
    </span>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      ...style,
    }}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 24,
    }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{title}</h1>
        {subtitle && <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Btn({
  children, onClick, variant = 'primary', disabled, style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)' },
    ghost:   { background: 'transparent', color: 'var(--text)', border: '1px solid var(--border-hi)' },
    danger:  { background: 'transparent', color: 'var(--red)', border: '1px solid #3a1010' },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '7px 14px',
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'var(--font-ui)',
        transition: 'opacity 0.15s',
        ...styles[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}
