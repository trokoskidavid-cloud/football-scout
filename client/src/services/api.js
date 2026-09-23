/**
 * Service 1: access to our own REST API (/api).
 * Attaches the JWT, parses JSON and converts error responses into ApiError.
 */
import { User, Club, Player, Match, Report, Comment, Activity, toPage } from '../models';

export const TOKEN_KEY = 'footballscout-token';

export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors || {};
  }
}

const qs = (params = {}) => {
  const clean = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return clean.length ? `?${new URLSearchParams(clean).toString()}` : '';
};

class ApiService {
  constructor(base = '/api') {
    this.base = base;
  }

  get token() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }

  async request(method, url, body, { raw = false } = {}) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    let res;
    try {
      res = await fetch(this.base + url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    } catch {
      throw new ApiError(0, 'Серверот не е достапен. Проверете ја врската.');
    }
    if (res.status === 401 && this.token) window.dispatchEvent(new Event('auth:expired'));
    if (raw && res.ok) return res;
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, data.message || `Грешка ${res.status}`, data.errors);
    return data;
  }

  get(url) { return this.request('GET', url); }
  post(url, body) { return this.request('POST', url, body ?? {}); }
  put(url, body) { return this.request('PUT', url, body); }
  delete(url) { return this.request('DELETE', url); }

  // ---------- auth ----------
  login(email, password) { return this.post('/auth/login', { email, password }); }
  register(data) { return this.post('/auth/register', data); }
  me() { return this.get('/auth/me').then((u) => new User(u)); }

  // ---------- users ----------
  getUsers() { return this.get('/users').then((l) => l.map((u) => new User(u))); }
  updateUser(id, data) { return this.put(`/users/${id}`, data).then((u) => new User(u)); }
  deleteUser(id) { return this.delete(`/users/${id}`); }

  // ---------- clubs ----------
  getClubs(params) { return this.get(`/clubs${qs(params)}`).then((l) => l.map((c) => new Club(c))); }
  getClub(id) { return this.get(`/clubs/${id}`).then((c) => new Club(c)); }
  saveClub(club) {
    return (club._id ? this.put(`/clubs/${club._id}`, club.toPayload()) : this.post('/clubs', club.toPayload())).then((c) => new Club(c));
  }
  deleteClub(id) { return this.delete(`/clubs/${id}`); }

  // ---------- players ----------
  getPlayers(params) { return this.get(`/players${qs(params)}`).then((p) => toPage(p, Player)); }
  getPlayer(id) { return this.get(`/players/${id}`).then((p) => new Player(p)); }
  getPlayerStats(id) { return this.get(`/players/${id}/stats`); }
  getPlayerDependencies(id) { return this.get(`/players/${id}/dependencies`); }
  savePlayer(player) {
    return (player._id ? this.put(`/players/${player._id}`, player.toPayload()) : this.post('/players', player.toPayload())).then((p) => new Player(p));
  }
  deletePlayer(id) { return this.delete(`/players/${id}`); }

  // ---------- matches ----------
  getMatches(params) { return this.get(`/matches${qs(params)}`).then((p) => toPage(p, Match)); }
  saveMatch(id, payload) { return (id ? this.put(`/matches/${id}`, payload) : this.post('/matches', payload)).then((m) => new Match(m)); }
  deleteMatch(id) { return this.delete(`/matches/${id}`); }

  // ---------- reports & comments ----------
  getReports(params) { return this.get(`/reports${qs(params)}`).then((p) => toPage(p, Report)); }
  getReport(id) { return this.get(`/reports/${id}`).then((r) => new Report(r)); }
  saveReport(report) {
    return (report._id ? this.put(`/reports/${report._id}`, report.toPayload()) : this.post('/reports', report.toPayload())).then((r) => new Report(r));
  }
  deleteReport(id) { return this.delete(`/reports/${id}`); }
  async downloadReportsCsv(params) {
    const res = await this.request('GET', `/reports/export.csv${qs(params)}`, undefined, { raw: true });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `footballscout-izvestai-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  getComments(reportId) { return this.get(`/reports/${reportId}/comments`).then((l) => l.map((c) => new Comment(c))); }
  addComment(reportId, text) { return this.post(`/reports/${reportId}/comments`, { text }).then((c) => new Comment(c)); }
  updateComment(id, text) { return this.put(`/comments/${id}`, { text }).then((c) => new Comment(c)); }
  deleteComment(id) { return this.delete(`/comments/${id}`); }

  // ---------- activities / stats / db ----------
  getActivities(params) { return this.get(`/activities${qs(params)}`).then((p) => toPage(p, Activity)); }
  getOverview() { return this.get('/stats/overview'); }
  dbStatus() { return this.get('/db'); }
  dbClear() { return this.delete('/db'); }
  dbSeed() { return this.post('/db/seed'); }

  // ---------- import from the external source (server side) ----------
  importExternalPlayer(data) { return this.post('/external/import', data).then((p) => new Player(p)); }
}

export const api = new ApiService();
export default api;
