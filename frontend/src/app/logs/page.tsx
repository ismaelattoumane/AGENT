'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Sidebar, Card, PageHeader } from '../../components/ui';
import { useSocket } from '../../lib/useSocket';
import api from '../../lib/api';

const AGENT_COLORS: Record<string, string> = {
  'Chef de Projet IA':        '#4f8ef7',
  'Analyste IA':              '#22d3a0',
  'Architecte IA':            '#9b6dff',
  'Développeur Backend IA':   '#f5c542',
  'Développeur Frontend IA':  '#f87171',
  'DevOps IA':                '#fb923c',
  'Testeur QA IA':            '#34d399',
  'Rédacteur IA':             '#a78bfa',
  'Système':                  '#5a5f72',
  'Utilisateur':              '#22d3a0',
};

export default function LogsPage() {
  const { connected, on } = useSocket();
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [liveCount, setLiveCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try { setLogs(await api.getLogs(500)); } catch {}
  }, []);

  useEffect(() => {
    load();
    const c = on('agent_update', () => {
      setLiveCount(n => n + 1);
      load();
    });
    return () => c();
  }, [load, on]);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, autoScroll]);

  const agents = ['all', ...Array.from(new Set(logs.map(l => l.agent)))];

  const filtered = logs.filter(l => {
    const matchAgent = agentFilter === 'all' || l.agent === agentFilter;
    const matchText = !filter || l.message.toLowerCase().includes(filter.toLowerCase())
      || l.action.toLowerCase().includes(filter.toLowerCase());
    return matchAgent && matchText;
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar wsConnected={connected} />
      <main style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'hidden' }}>
        <PageHeader
          title="Logs"
          subtitle={`${filtered.length} entrées${liveCount > 0 ? ` · ${liveCount} nouvelles` : ''}`}
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>Auto-scroll</span>
              <button onClick={() => setAutoScroll(v => !v)} style={{
                width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: autoScroll ? 'var(--accent)' : 'var(--border-hi)',
                position: 'relative', transition: 'background 0.2s',
              }}>
                <span style={{
                  position: 'absolute', top: 2, left: autoScroll ? 18 : 2,
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
          }
        />

        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <input
            placeholder="Filtrer les logs..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{
              padding: '7px 12px', background: 'var(--surface)',
              border: '1px solid var(--border-hi)', borderRadius: 6,
              color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-mono)',
              outline: 'none', width: 240,
            }}
          />
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {agents.slice(0, 10).map(a => (
              <button key={a} onClick={() => setAgentFilter(a)} style={{
                padding: '5px 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                background: agentFilter === a ? 'var(--accent-lo)' : 'transparent',
                color: agentFilter === a ? 'var(--accent)' : 'var(--muted)',
                border: `1px solid ${agentFilter === a ? 'var(--accent)' : 'var(--border)'}`,
              }}>
                {a === 'all' ? 'Tous' : a}
              </button>
            ))}
          </div>
        </div>

        {/* Log stream */}
        <Card style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ overflowY: 'auto', flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            {filtered.map((log, i) => {
              const agentColor = AGENT_COLORS[log.agent] || 'var(--muted)';
              return (
                <div key={log.id} className="log-line" style={{
                  display: 'flex', gap: 10, padding: '5px 16px', alignItems: 'flex-start',
                  borderBottom: '1px solid rgba(255,255,255,0.025)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                }}>
                  {/* Timestamp */}
                  <span style={{ color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: 11, paddingTop: 1, minWidth: 70 }}>
                    {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                  </span>

                  {/* Agent */}
                  <span style={{ color: agentColor, whiteSpace: 'nowrap', minWidth: 180 }}>
                    {log.agent}
                  </span>

                  {/* Action */}
                  <span style={{
                    color: 'var(--purple)', whiteSpace: 'nowrap', minWidth: 160,
                    padding: '0 6px', background: 'rgba(155,109,255,0.06)',
                    borderRadius: 3,
                  }}>
                    {log.action}
                  </span>

                  {/* Message */}
                  <span style={{ color: 'var(--text)', opacity: 0.8, flex: 1, wordBreak: 'break-word' }}>
                    {log.message}
                  </span>

                  {/* Mission ID */}
                  {log.missionId && (
                    <span style={{ color: 'var(--muted)', fontSize: 10, whiteSpace: 'nowrap', paddingTop: 2 }}>
                      {log.missionId.slice(0, 6)}
                    </span>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                {filter || agentFilter !== 'all' ? 'Aucun log correspondant' : 'En attente d\'activité...'}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Footer */}
          <div style={{
            padding: '8px 16px', borderTop: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between',
            fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)',
          }}>
            <span>{filtered.length} / {logs.length} entrées</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className={connected ? 'pulse' : ''} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: connected ? 'var(--green)' : 'var(--muted)',
                display: 'inline-block',
              }} />
              {connected ? 'Flux en direct' : 'Déconnecté'}
            </span>
          </div>
        </Card>
      </main>
    </div>
  );
}
