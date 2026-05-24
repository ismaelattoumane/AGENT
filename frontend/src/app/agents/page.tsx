'use client';
import { useEffect, useState } from 'react';
import { Sidebar, Card, PageHeader } from '../../components/ui';
import { useSocket } from '../../lib/useSocket';
import api from '../../lib/api';

const AGENT_INFO: Record<string, { icon: string; color: string; llm: string; desc: string }> = {
  project_manager: { icon: '◈', color: '#4f8ef7', llm: 'Claude', desc: 'Planification, coordination, décisions organisationnelles' },
  analyst:         { icon: '◉', color: '#22d3a0', llm: 'Gemini', desc: 'Recherche, analyse des besoins, études de faisabilité' },
  architect:       { icon: '⬡', color: '#9b6dff', llm: 'Claude', desc: 'Architecture logicielle, choix technologiques, conception' },
  backend_dev:     { icon: '⌗', color: '#f5c542', llm: 'GPT-4o', desc: 'API, base de données, authentification, logique métier' },
  frontend_dev:    { icon: '◻', color: '#f87171', llm: 'GPT-4o', desc: 'Interface utilisateur, responsive design, intégration API' },
  devops:          { icon: '⚙', color: '#fb923c', llm: 'GPT-4o', desc: 'Docker, CI/CD, infrastructure, monitoring, serveurs' },
  qa:              { icon: '✓', color: '#34d399', llm: 'GPT-4o', desc: 'Tests fonctionnels, automatisés, revue qualité' },
  writer:          { icon: '✎', color: '#a78bfa', llm: 'Claude', desc: 'Documentation, guides, rapports, comptes-rendus' },
};

const LLM_INFO: Record<string, { color: string; badge: string }> = {
  claude:  { color: '#c084fc', badge: 'Raisonnement · Rédaction' },
  gpt:     { color: '#4ade80', badge: 'Code · Tâches générales' },
  gemini:  { color: '#60a5fa', badge: 'Gros contextes · Analyse' },
};

export default function AgentsPage() {
  const { connected } = useSocket();
  const [agents, setAgents] = useState<any[]>([]);
  const [llmStatus, setLlmStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.allSettled([api.getAgents(), api.getLLMStatus()]).then(([a, l]) => {
      if (a.status === 'fulfilled') setAgents(a.value);
      if (l.status === 'fulfilled') setLlmStatus(l.value);
    });
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar wsConnected={connected} />
      <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
        <PageHeader title="Agents" subtitle="8 agents spécialisés · 3 LLM providers" />

        {/* LLM providers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          {Object.entries(LLM_INFO).map(([name, info]) => {
            const ok = llmStatus[name];
            return (
              <Card key={name} style={{ padding: '16px 20px', borderColor: ok ? `${info.color}30` : 'var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: info.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{info.badge}</div>
                  </div>
                  <div style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 11,
                    fontFamily: 'var(--font-mono)', fontWeight: 700,
                    background: ok ? 'rgba(34,211,160,0.08)' : 'rgba(240,82,82,0.08)',
                    color: ok ? 'var(--green)' : 'var(--red)',
                    border: `1px solid ${ok ? 'rgba(34,211,160,0.2)' : 'rgba(240,82,82,0.2)'}`,
                  }}>
                    {ok === undefined ? '?' : ok ? 'OK' : 'KO'}
                  </div>
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                  Fallback auto si indisponible
                </div>
              </Card>
            );
          })}
        </div>

        {/* Agents grid */}
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          Agents spécialisés
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {agents.map((a: any) => {
            const info = AGENT_INFO[a.role] || { icon: '●', color: 'var(--muted)', llm: '?', desc: '' };
            return (
              <Card key={a.role} style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                    background: `${info.color}15`,
                    border: `1px solid ${info.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, color: info.color,
                  }}>
                    {info.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{a.name}</span>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 4,
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        color: 'var(--muted)', fontFamily: 'var(--font-mono)',
                      }}>{info.llm}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{info.desc}</div>
                    <div style={{ marginTop: 6, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--border-hi)' }}>
                      {a.role}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Fallback order */}
        <Card style={{ marginTop: 20, padding: '16px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            Ordre de fallback LLM
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
            {['Provider préféré', '→', 'Claude', '→', 'GPT-4o', '→', 'Gemini'].map((s, i) => (
              <span key={i} style={{
                color: s === '→' ? 'var(--muted)' : 'var(--text)',
                padding: s !== '→' ? '3px 10px' : '0',
                background: s !== '→' ? 'var(--bg)' : 'transparent',
                border: s !== '→' ? '1px solid var(--border)' : 'none',
                borderRadius: 4,
              }}>{s}</span>
            ))}
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>— Reprise auto après 60s</span>
          </div>
        </Card>
      </main>
    </div>
  );
}
