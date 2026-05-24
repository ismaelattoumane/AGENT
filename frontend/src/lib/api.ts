const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('mas_token');
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('mas_token');
    window.location.href = '/login';
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  login: (username: string, password: string) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  getMissions: () => apiFetch('/missions'),
  getMission: (id: string) => apiFetch(`/missions/${id}`),
  getMissionStatus: (id: string) => apiFetch(`/missions/${id}/status`),
  createMission: (data: any) =>
    apiFetch('/missions', { method: 'POST', body: JSON.stringify(data) }),
  updateMission: (id: string, description: string) =>
    apiFetch(`/missions/${id}`, { method: 'PATCH', body: JSON.stringify({ description }) }),
  cancelMission: (id: string) =>
    apiFetch(`/missions/${id}`, { method: 'DELETE' }),
  answerQuestion: (id: string, answer: string) =>
    apiFetch(`/missions/${id}/answer`, { method: 'POST', body: JSON.stringify({ answer }) }),

  getLogs: (limit?: number) => apiFetch(`/logs${limit ? `?limit=${limit}` : ''}`),
  getMissionLogs: (missionId: string) => apiFetch(`/logs/mission/${missionId}`),

  getTasks: (missionId: string) => apiFetch(`/tasks/mission/${missionId}`),

  getAgents: () => apiFetch('/agents'),
  getLLMStatus: () => apiFetch('/agents/llm-status'),

  getMessagingStatus: () => apiFetch('/messaging/status'),
};

export default api;
