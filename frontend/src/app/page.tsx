'use client';
import { useEffect, useState, useCallback } from 'react';
import { Sidebar, StatusBadge, Card, PageHeader, Btn } from '../components/ui';
import { useSocket } from '../lib/useSocket';
import api from '../lib/api';
import Link from 'next/link';

export default function Dashboard() {
  const { connected, on } = useSocket();
  const [missions, setMissions] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [llmStatus, setLLMStatus] = useState<Record<string, boolean>>({});
  const [msgStatus, setMsgStatus] = useState<any>({});
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [newMission, setNewMission] = useState({ title: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const [m, a, llm, msg, logs] = await Promise.allSettled([
        api.getMissions(),
        api.getAgents(),
        api.getLLMStatus(),
        api.getMessagingStatus(),
        api.getLogs(20),
      ]);
      if (m.status === 'fulfilled') setMissions(m.value);
      if (a.status === 'fulfilled') setAgents(a.value);
      if (llm.status === 'fulfilled') setLLMStatus(llm.value);
      if (msg.status === 'fulfilled') setMsgStatus(msg.value);
      if (logs.status === 'fulfilled') setRecentLogs(logs.value);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const cleanup1 = on('agent_update', () => load());
    const cleanup2 = on('mission_completed', () => load());
    return () => { cleanup1(); cleanup2(); };
  }, [load, on]);

  async function createMission() {
    if (!newMission.title || !newMission.description) return;
    setCreating(true);
    try {
      await api.createMission(newMission);
      setNewMission({ title: '', description: '' });
      setShowForm(false);
      load();
    } finally {
      setCreating(false);
    }
  }

  const stats = {
    total: missions.length,
    active: missions.filter(m => m.status === 'in_progress').length,
    waiting: missions.filter(m => m.status === 'user_input').length,
    done: missions.filter(m => m.status === 'completed').length,
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar wsConnected={connected} />

      <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
        <PageHeader
          title="Dashboard"
          subtitle="Vue d'ensemble du système multi-agents"
          action={
            <Btn onClick={() => setShowForm(v => !v)}>
              {showForm ? '✕ Annuler' : '+ Nouvelle mission'}
            </Btn>
          }
        />

        {/* New mission form */}
        {showForm && (
          <Card style={{ padding: 20, marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Nouvelle mission</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                placeholder="Titre de la mission"
                value={newMission.title}
                onChange={e => setNewMission(f => ({ ...f, title: e.target.value }))}
                style={inputStyle}
              />
              <textarea
                placeholder="Description détaillée de la mission..."
                value={newMission.description}
                onChange={e => setNewMission(f => ({ ...f, description: e.target.value }))}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn onClick={createMission} disabled={creating}>
                  {creating ? 'Lancement...' : '🚀 Lancer'}
                </Btn>
                <Btn variant="ghost" onClick={() => setShowForm(false)}>Annuler</Btn>
              </div>
            </div>
          </Card>
        )}

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total', value: stats.total, color: 'var(--text)' },
            { label: 'En cours', value: stats.active, color: 'var(--accent)' },
            { label: 'En attente', value: stats.waiting, color: 'var(--purple)' },
            { label: 'Terminées', value: stats.done, color: 'var(--green)' },
          ].map(s => (
            <Card key={s.label} style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: 'var(--font-mono)' }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{s.label}</div>
            </Card>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

          {/* Missions list */}
          <Card>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Missions récentes
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {missions.length === 0 && (
                <div style={{ padding: 24, color: 'var(--muted)', textAlign: 'center', fontSize: 13 }}>
                  Aucune mission
                </div>
              )}
              {missions.slice(0, 8).map(m => (
                <Link key={m.id} href={`/missions/${m.id}`} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border)',
                  textDecoration: 'none',
                  color: 'var(--text)',
                  transition: 'background 0.1s',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                      {m.id.slice(0, 8)}
                    </div>
                  </div>
                  <StatusBadge status={m.status} />
                </Link>
              ))}
            </div>
          </Card>

          {/* Right column - Agents + LLM status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* LLM providers */}
            <Card style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                Providers LLM
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {Object.entries(llmStatus).map(([provider, ok]) => (
                  <div key={provider} style={{
                    flex: 1,
                    padding: '8px 10px',
                    background: ok ? 'rgba(34,211,160,0.06)' : 'rgba(240,82,82,0.06)',
                    border: `1px solid ${ok ? 'rgba(34,211,160,0.2)' : 'rgba(240,82,82,0.2)'}`,
                    borderRadius: 6,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 18 }}>{ok ? '✓' : '✕'}</div>
                    <div style={{ fontSize: 11, color: ok ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                      {provider}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Bots status */}
            <Card style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                Bots Messagerie
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { name: 'Discord', key: 'discord', icon: '◈' },
                  { name: 'Telegram', key: 'telegram', icon: '✈' },
                ].map(b => (
                  <div key={b.key} style={{
                    flex: 1, padding: '8px 10px', textAlign: 'center',
                    background: msgStatus[b.key] ? 'rgba(34,211,160,0.06)' : 'rgba(90,95,114,0.1)',
                    border: `1px solid ${msgStatus[b.key] ? 'rgba(34,211,160,0.2)' : 'var(--border)'}`,
                    borderRadius: 6,
                  }}>
                    <div style={{ fontSize: 18 }}>{b.icon}</div>
                    <div style={{ fontSize: 11, color: msgStatus[b.key] ? 'var(--green)' : 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                      {b.name}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Agents */}
            <Card style={{ flex: 1, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                Agents ({agents.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {agents.map((a: any) => (
                  <span key={a.role} style={{
                    padding: '3px 8px',
                    background: 'var(--bg)',
                    border: '1px solid var(--border-hi)',
                    borderRadius: 4,
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--muted)',
                  }}>
                    {a.name}
                  </span>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Recent logs */}
        <Card>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Logs temps réel
            </span>
            <Link href="/logs" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
              Tout voir →
            </Link>
          </div>
          <div style={{ padding: '4px 0', maxHeight: 220, overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            {recentLogs.map(log => (
              <div key={log.id} className="log-line" style={{
                display: 'flex',
                gap: 12,
                padding: '5px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
              }}>
                <span style={{ color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: 11 }}>
                  {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                </span>
                <span style={{ color: 'var(--accent)', minWidth: 100 }}>{log.agent}</span>
                <span style={{ color: 'var(--purple)', minWidth: 120 }}>{log.action}</span>
                <span style={{ color: 'var(--text)', opacity: 0.8, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.message}
                </span>
              </div>
            ))}
            {recentLogs.length === 0 && (
              <div style={{ padding: '16px', color: 'var(--muted)', textAlign: 'center' }}>
                En attente d'activité...
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  background: 'var(--bg)',
  border: '1px solid var(--border-hi)',
  borderRadius: 6,
  color: 'var(--text)',
  fontSize: 14,
  fontFamily: 'var(--font-ui)',
  outline: 'none',
};
