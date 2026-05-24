'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar, StatusBadge, Card, PageHeader, Btn } from '../../../components/ui';
import { useSocket } from '../../../lib/useSocket';
import api from '../../../lib/api';

export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { connected, on, subscribeMission } = useSocket();

  const [mission, setMission] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [answer, setAnswer] = useState('');
  const [answerLoading, setAnswerLoading] = useState(false);
  const [updateDesc, setUpdateDesc] = useState('');
  const [showUpdate, setShowUpdate] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'logs'>('tasks');
  const logsEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const [m, t, l] = await Promise.allSettled([
        api.getMissionStatus(id),
        api.getTasks(id),
        api.getMissionLogs(id),
      ]);
      if (m.status === 'fulfilled') { setStatus(m.value); setMission(m.value.mission); }
      if (t.status === 'fulfilled') setTasks(t.value);
      if (l.status === 'fulfilled') setLogs(l.value.reverse());
    } catch {}
  }, [id]);

  useEffect(() => {
    load();
    subscribeMission(id);
    const c1 = on('agent_update', (d) => { if (d.missionId === id) load(); });
    const c2 = on('agent_message', (d) => { if (d.missionId === id) load(); });
    const c3 = on('mission_completed', (d) => { if (d.missionId === id) load(); });
    return () => { c1(); c2(); c3(); };
  }, [id, load, on, subscribeMission]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  async function submitAnswer() {
    if (!answer.trim()) return;
    setAnswerLoading(true);
    try {
      await api.answerQuestion(id, answer);
      setAnswer('');
      setTimeout(load, 1000);
    } finally { setAnswerLoading(false); }
  }

  async function cancelMission() {
    if (!confirm('Annuler cette mission ?')) return;
    await api.cancelMission(id);
    router.push('/missions');
  }

  async function updateMission() {
    if (!updateDesc.trim()) return;
    await api.updateMission(id, updateDesc);
    setShowUpdate(false);
    setUpdateDesc('');
    setTimeout(load, 500);
  }

  if (!mission) return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar wsConnected={connected} />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
        Chargement...
      </main>
    </div>
  );

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const progress = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar wsConnected={connected} />
      <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
        <PageHeader
          title={mission.title}
          subtitle={`Mission · ${id.slice(0, 8)}`}
          action={
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="ghost" onClick={() => setShowUpdate(v => !v)}>Modifier</Btn>
              {mission.status !== 'completed' && mission.status !== 'cancelled' && (
                <Btn variant="danger" onClick={cancelMission}>Annuler</Btn>
              )}
            </div>
          }
        />

        {/* Update form */}
        {showUpdate && (
          <Card style={{ padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Modifier la mission</div>
            <textarea
              placeholder="Nouvelle description ou contraintes additionnelles..."
              value={updateDesc}
              onChange={e => setUpdateDesc(e.target.value)}
              rows={3}
              style={{ ...inp, resize: 'vertical', width: '100%', marginBottom: 10 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={updateMission}>Appliquer</Btn>
              <Btn variant="ghost" onClick={() => setShowUpdate(false)}>Annuler</Btn>
            </div>
          </Card>
        )}

        {/* Status + progress row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
          <Card style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Statut</div>
            <StatusBadge status={mission.status} />
            {status?.workflowNode && (
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                Node : {status.workflowNode}
              </div>
            )}
          </Card>
          <Card style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tâches</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
              {completedTasks}/{tasks.length}
            </div>
            <div style={{ marginTop: 8, height: 4, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'var(--green)', transition: 'width 0.4s' }} />
            </div>
          </Card>
          <Card style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Priorité</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{mission.priority}</div>
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              Créé {new Date(mission.createdAt).toLocaleDateString('fr-FR')}
            </div>
          </Card>
        </div>

        {/* User question block */}
        {status?.pendingQuestions?.length > 0 && (
          <Card style={{ padding: 20, marginBottom: 20, borderColor: 'rgba(155,109,255,0.3)', background: 'rgba(155,109,255,0.04)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--purple)', marginBottom: 12 }}>
              ● Question en attente de votre réponse
            </div>
            {status.pendingQuestions.map((q: string, i: number) => (
              <div key={i} style={{
                padding: '10px 14px', background: 'var(--bg)', borderRadius: 6,
                fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text)',
                marginBottom: 10, border: '1px solid var(--border)',
              }}>{q}</div>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="Votre réponse..."
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitAnswer()}
                style={{ ...inp, flex: 1 }}
              />
              <Btn onClick={submitAnswer} disabled={answerLoading}>
                {answerLoading ? '...' : 'Répondre'}
              </Btn>
            </div>
          </Card>
        )}

        {/* Description */}
        <Card style={{ padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Description</div>
          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{mission.description}</div>
        </Card>

        {/* Tabs: Tasks | Logs */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
          {(['tasks', 'logs'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              padding: '7px 16px', borderRadius: 5, fontSize: 13, cursor: 'pointer',
              fontFamily: 'var(--font-ui)', fontWeight: activeTab === t ? 700 : 400,
              background: activeTab === t ? 'var(--accent-lo)' : 'transparent',
              color: activeTab === t ? 'var(--accent)' : 'var(--muted)',
              border: `1px solid ${activeTab === t ? 'var(--accent)' : 'var(--border)'}`,
            }}>
              {t === 'tasks' ? `Tâches (${tasks.length})` : `Logs (${logs.length})`}
            </button>
          ))}
        </div>

        {/* Tasks tab */}
        {activeTab === 'tasks' && (
          <Card>
            {tasks.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
                En attente de planification...
              </div>
            ) : tasks.map((task, i) => (
              <div key={task.id} style={{
                padding: '12px 16px',
                borderBottom: i < tasks.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{task.title}</span>
                      <span style={{
                        fontSize: 11, padding: '2px 7px', borderRadius: 4,
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        color: 'var(--muted)', fontFamily: 'var(--font-mono)',
                      }}>{task.assignedRole}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: task.output ? 8 : 0 }}>
                      {task.description.slice(0, 120)}{task.description.length > 120 ? '…' : ''}
                    </div>
                    {task.output && (
                      <div style={{
                        fontSize: 12, padding: '8px 10px',
                        background: 'var(--bg)', borderRadius: 5,
                        border: '1px solid var(--border)',
                        color: 'var(--text)', opacity: 0.85,
                        fontFamily: 'var(--font-mono)',
                        maxHeight: 80, overflow: 'hidden',
                      }}>
                        {task.output.slice(0, 200)}{task.output.length > 200 ? '…' : ''}
                      </div>
                    )}
                    {task.error && (
                      <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                        ✕ {task.error}
                      </div>
                    )}
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              </div>
            ))}
          </Card>
        )}

        {/* Logs tab */}
        {activeTab === 'logs' && (
          <Card>
            <div style={{ maxHeight: 500, overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              {logs.map((log, i) => (
                <div key={log.id} className="log-line" style={{
                  display: 'flex', gap: 12, padding: '6px 16px', alignItems: 'flex-start',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                }}>
                  <span style={{ color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: 11, paddingTop: 1 }}>
                    {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                  </span>
                  <span style={{ color: 'var(--accent)', minWidth: 120, whiteSpace: 'nowrap' }}>{log.agent}</span>
                  <span style={{ color: 'var(--purple)', minWidth: 140, whiteSpace: 'nowrap' }}>{log.action}</span>
                  <span style={{ color: 'var(--text)', opacity: 0.8, flex: 1, wordBreak: 'break-word' }}>
                    {log.message}
                  </span>
                </div>
              ))}
              {logs.length === 0 && (
                <div style={{ padding: 24, color: 'var(--muted)', textAlign: 'center' }}>Aucun log</div>
              )}
              <div ref={logsEndRef} />
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

const inp: React.CSSProperties = {
  padding: '9px 12px', background: 'var(--bg)',
  border: '1px solid var(--border-hi)', borderRadius: 6,
  color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-ui)', outline: 'none',
};
