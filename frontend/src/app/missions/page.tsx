'use client';
import { useEffect, useState, useCallback } from 'react';
import { Sidebar, StatusBadge, Card, PageHeader, Btn } from '../../components/ui';
import { useSocket } from '../../lib/useSocket';
import api from '../../lib/api';
import Link from 'next/link';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export default function MissionsPage() {
  const { connected, on } = useSocket();
  const [missions, setMissions] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium' });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try { setMissions(await api.getMissions()); } catch {}
  }, []);

  useEffect(() => {
    load();
    const c1 = on('agent_update', load);
    const c2 = on('mission_completed', load);
    return () => { c1(); c2(); };
  }, [load, on]);

  const filtered = filter === 'all' ? missions : missions.filter(m => m.status === filter);

  async function create() {
    if (!form.title || !form.description) return;
    setCreating(true);
    try {
      await api.createMission(form);
      setForm({ title: '', description: '', priority: 'medium' });
      setShowForm(false);
      load();
    } finally { setCreating(false); }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar wsConnected={connected} />
      <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
        <PageHeader
          title="Missions"
          subtitle={`${missions.length} mission${missions.length !== 1 ? 's' : ''} au total`}
          action={<Btn onClick={() => setShowForm(v => !v)}>+ Nouvelle mission</Btn>}
        />

        {/* Create form */}
        {showForm && (
          <Card style={{ padding: 20, marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Nouvelle mission</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input placeholder="Titre" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inp} />
              <textarea placeholder="Description détaillée..." value={form.description} rows={5}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                style={{ ...inp, resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Priorité :</span>
                {PRIORITIES.map(p => (
                  <button key={p} onClick={() => setForm(f => ({ ...f, priority: p }))} style={{
                    padding: '4px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    background: form.priority === p ? 'var(--accent-lo)' : 'var(--bg)',
                    color: form.priority === p ? 'var(--accent)' : 'var(--muted)',
                    border: `1px solid ${form.priority === p ? 'var(--accent)' : 'var(--border)'}`,
                  }}>{p}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <Btn onClick={create} disabled={creating}>{creating ? 'Lancement...' : '🚀 Lancer'}</Btn>
                <Btn variant="ghost" onClick={() => setShowForm(false)}>Annuler</Btn>
              </div>
            </div>
          </Card>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {['all', 'in_progress', 'waiting', 'user_input', 'completed', 'cancelled'].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '5px 12px', borderRadius: 5, fontSize: 12, cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              background: filter === s ? 'var(--accent-lo)' : 'transparent',
              color: filter === s ? 'var(--accent)' : 'var(--muted)',
              border: `1px solid ${filter === s ? 'var(--accent)' : 'var(--border)'}`,
            }}>{s === 'all' ? `Toutes (${missions.length})` : s.replace('_', ' ')}</button>
          ))}
        </div>

        {/* Missions grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 && (
            <Card style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
              Aucune mission{filter !== 'all' ? ` avec le statut "${filter}"` : ''}
            </Card>
          )}
          {filtered.map(m => (
            <Link key={m.id} href={`/missions/${m.id}`} style={{ textDecoration: 'none' }}>
              <Card style={{
                padding: '14px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', transition: 'border-color 0.15s',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{m.title}</span>
                    <PriorityDot priority={m.priority} />
                  </div>
                  <div style={{
                    fontSize: 12, color: 'var(--muted)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: 600,
                  }}>{m.description}</div>
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                    {m.id.slice(0, 8)} · {new Date(m.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {m.tasks?.length > 0 && ` · ${m.tasks.filter((t: any) => t.status === 'completed').length}/${m.tasks.length} tâches`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {m.status === 'user_input' && (
                    <span style={{ fontSize: 11, color: 'var(--purple)', fontFamily: 'var(--font-mono)' }}>
                      ● Question en attente
                    </span>
                  )}
                  <StatusBadge status={m.status} />
                  <span style={{ color: 'var(--muted)', fontSize: 16 }}>›</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const c: Record<string, string> = {
    low: 'var(--muted)', medium: 'var(--yellow)',
    high: 'var(--accent)', urgent: 'var(--red)',
  };
  return (
    <span style={{
      width: 7, height: 7, borderRadius: '50%',
      background: c[priority] || 'var(--muted)',
      display: 'inline-block', flexShrink: 0,
    }} title={priority} />
  );
}

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  background: 'var(--bg)', border: '1px solid var(--border-hi)',
  borderRadius: 6, color: 'var(--text)', fontSize: 14,
  fontFamily: 'var(--font-ui)', outline: 'none',
};
