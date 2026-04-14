/**
 * Grudge Studio Backend API Client — Warlords RTS
 *
 * Lightweight typed client for Grudge backend services.
 * All calls go through /api/grudge/* Vercel rewrites → grudge-studio.com services.
 *
 * Auth tokens are shared across all Grudge apps via localStorage key
 * 'grudge_auth_token' (SSO compatible with GDevelop, Arena, etc).
 *
 * Reference: GDevelopAssistant-full/docs/BACKEND_CONNECTION_GUIDE.md
 */

// ── Proxy base paths (Vercel rewrites to backend) ──
const GAME = '/api/grudge/game';       // → api.grudge-studio.com
const ID   = '/api/grudge/id';         // → id.grudge-studio.com

// ── Auth token management (shared across Grudge apps) ──
const AUTH_TOKEN_KEY   = 'grudge_auth_token';
const SESSION_TOKEN_KEY = 'grudge_session_token';
const DEVICE_ID_KEY     = 'grudge_device_id';

export function getToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(SESSION_TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(SESSION_TOKEN_KEY, token);
}

export function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem('grudge_user');
  localStorage.removeItem('grudge_id');
}

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = 'rts_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function getGrudgeId(): string | null {
  return localStorage.getItem('grudge_id');
}

export function getUser(): any | null {
  try {
    return JSON.parse(localStorage.getItem('grudge_user') || 'null');
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

// ── Typed fetch wrapper ──
function authHeaders(): Record<string, string> {
  const token = getToken();
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function apiFetch<T = any>(url: string, opts: RequestInit = {}): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...opts,
      headers: { ...authHeaders(), ...(opts.headers as Record<string, string> || {}) },
    });
    if (res.status === 401) {
      console.warn('[grudgeApi] 401 — token may be expired');
      return null;
    }
    if (!res.ok) {
      console.warn(`[grudgeApi] ${res.status} ${res.statusText} — ${url}`);
      return null;
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return null;
  } catch (err: any) {
    console.warn(`[grudgeApi] fetch error (${url}):`, err.message);
    return null;
  }
}

// ── Auth endpoints ──
export const grudgeAuth = {
  /** Login with existing credentials */
  async login(username: string, password: string) {
    return apiFetch<{ token: string; grudgeId: string; username: string }>(`${ID}/auth/login`, {
      method: 'POST', body: JSON.stringify({ username, password }),
    });
  },

  /** Create guest account (puter-compatible) */
  async guest() {
    return apiFetch<{ token: string; grudgeId: string; username: string }>(`${ID}/auth/puter`, {
      method: 'POST',
      body: JSON.stringify({ puterUuid: 'guest_' + getDeviceId(), puterUsername: 'Guest' }),
    });
  },

  /** Verify current token is valid */
  async verify() {
    const token = getToken();
    if (!token) return false;
    const res = await apiFetch<{ valid: boolean }>(`${ID}/auth/verify`, {
      method: 'POST', body: JSON.stringify({ token }),
    });
    return res?.valid === true;
  },

  /** Get current user profile */
  async me() {
    return apiFetch(`${ID}/auth/user`, { method: 'GET' });
  },
};

// ── RTS Design save/load (server-side persistence) ──
// Designs are stored as JSON blobs per grudge_id on the game API.
// Falls back to localStorage if the backend is unreachable.

export interface DesignPayload {
  faction: string;
  nodes: any[];
  connections: any[];
  updatedAt: string;
}

export const grudgeDesignApi = {
  /** Save an RTS faction design to the backend */
  async saveDesign(faction: string, nodes: any[], connections: any[]): Promise<boolean> {
    const grudgeId = getGrudgeId();
    if (!grudgeId) return false;
    const res = await apiFetch(`${GAME}/rts/designs/${faction}`, {
      method: 'PUT',
      body: JSON.stringify({ nodes, connections, updatedAt: new Date().toISOString() }),
    });
    return res !== null;
  },

  /** Load an RTS faction design from the backend */
  async loadDesign(faction: string): Promise<DesignPayload | null> {
    const grudgeId = getGrudgeId();
    if (!grudgeId) return null;
    return apiFetch<DesignPayload>(`${GAME}/rts/designs/${faction}`);
  },

  /** Load all faction designs at once */
  async loadAllDesigns(): Promise<Record<string, DesignPayload> | null> {
    const grudgeId = getGrudgeId();
    if (!grudgeId) return null;
    return apiFetch<Record<string, DesignPayload>>(`${GAME}/rts/designs`);
  },
};

// ── ObjectStore Game Data ──────────────────────────────────────────────────

const OBJECTSTORE_WORKER = 'https://objectstore.grudge-studio.com';
const OBJECTSTORE_PAGES  = 'https://molochdagod.github.io/ObjectStore/api/v1';

const _osCache = new Map<string, { data: any; at: number }>();
const _OS_TTL = 10 * 60 * 1000;

async function fetchObjectStore<T = any>(workerPath: string, pagesFile: string): Promise<T | null> {
  const cached = _osCache.get(workerPath);
  if (cached && Date.now() - cached.at < _OS_TTL) return cached.data as T;
  try {
    const res = await fetch(`${OBJECTSTORE_WORKER}${workerPath}`);
    if (res.ok) { const d = await res.json(); _osCache.set(workerPath, { data: d, at: Date.now() }); return d as T; }
  } catch { /* fall through */ }
  try {
    const res = await fetch(`${OBJECTSTORE_PAGES}/${pagesFile}`);
    if (res.ok) { const d = await res.json(); _osCache.set(workerPath, { data: d, at: Date.now() }); return d as T; }
  } catch { /* fall through */ }
  return (cached?.data as T) ?? null;
}

export const grudgeObjectStore = {
  /** Fetch all weapon skills (17 types, 207 skills) */
  fetchWeaponSkills: () => fetchObjectStore('/v1/weapon-skills', 'weaponSkills.json'),
  /** Fetch weapon skill tree for a specific type */
  fetchWeaponType: (type: string) => fetchObjectStore(`/v1/weapon-skills/${type}`, 'weaponSkills.json'),
  /** Fetch any game data collection */
  fetchGameData: (name: string) => fetchObjectStore(`/v1/game-data/${name}`, `${name}.json`),
  /** Fetch enemies */
  fetchEnemies: () => fetchObjectStore('/v1/game-data/enemies', 'enemies.json'),
  /** Fetch classes */
  fetchClasses: () => fetchObjectStore('/v1/game-data/classes', 'classes.json'),
  /** List available collections */
  fetchCollections: () => fetchObjectStore<{ count: number; collections: any[] }>('/v1/game-data', ''),
  /** Prefetch core RTS data */
  async prefetch() {
    await Promise.allSettled([
      this.fetchWeaponSkills(),
      this.fetchEnemies(),
      this.fetchClasses(),
      this.fetchGameData('factionUnits'),
    ]);
    console.log('[ObjectStore] RTS data prefetched');
  },
};

// ── Combined export ──
const grudgeApi = {
  auth: grudgeAuth,
  designs: grudgeDesignApi,
  objectStore: grudgeObjectStore,
  getToken,
  setToken,
  clearAuth,
  isLoggedIn,
  getUser,
  getGrudgeId,
};

export default grudgeApi;
