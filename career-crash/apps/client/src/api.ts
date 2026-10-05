import type {
  AllocateRequest,
  ApplicantDTO,
  AttackRequest,
  AttackResponse,
  AuthResponse,
  BattleRecord,
  CareerOfferResponse,
  ChooseCareerResponse,
  JobBoardDTO,
  LeaderboardDTO,
  MeResponse,
  OpponentDTO,
  ReportDTO,
  ShopDTO,
} from '@cc/protocol';
import type { Character } from '@cc/game-rules';
import type { BattleMode } from '@cc/sim';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';
const TOKEN_KEY = 'cc.token';
const DEVICE_KEY = 'cc.device';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function deviceSecret(): string {
  const s = store();
  let secret = s?.getItem(DEVICE_KEY) ?? null;
  if (!secret) {
    const b = new Uint8Array(24);
    crypto.getRandomValues(b);
    secret = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
    s?.setItem(DEVICE_KEY, secret);
  }
  return secret;
}

let token: string | null = store()?.getItem(TOKEN_KEY) ?? null;

async function request<T>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (method !== 'GET') headers['Idempotency-Key'] = crypto.randomUUID();
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (res.status === 401 && retry && path !== '/auth/device') {
    await signIn();
    return request<T>(method, path, body, false);
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; code?: string };
  if (!res.ok) throw new ApiError(res.status, data.code ?? 'error', data.error ?? res.statusText);
  return data;
}

export async function signIn(displayName?: string): Promise<AuthResponse> {
  const r = await request<AuthResponse>('POST', '/auth/device', { deviceSecret: deviceSecret(), displayName }, false);
  token = r.token;
  store()?.setItem(TOKEN_KEY, r.token);
  return r;
}

export function hasSession(): boolean {
  return !!token || !!store()?.getItem(DEVICE_KEY);
}

export const api = {
  me: () => request<MeResponse>('GET', '/me'),
  collect: () => request<{ collected: MeResponse['pending'] }>('POST', '/rewards/collect'),
  offer: (id: string, reroll = false) => request<CareerOfferResponse>('POST', `/characters/${id}/offer`, { reroll }),
  chooseCareer: (id: string, careerId: string) => request<ChooseCareerResponse>('POST', `/characters/${id}/career`, { careerId }),
  allocate: (id: string, alloc: AllocateRequest) => request<{ character: Character }>('POST', `/characters/${id}/allocate`, alloc),
  equip: (id: string, slots: { held?: string | null; accessory?: string | null }) => request<{ character: Character }>('POST', `/characters/${id}/equip`, slots),
  lockTrait: (id: string, traitId: string, locked: boolean) => request<{ character: Character }>('POST', `/characters/${id}/traits/lock`, { traitId, locked }),
  retire: (id: string) => request<{ payout: number }>('POST', `/characters/${id}/retire`),
  recruits: () => request<{ applicants: ApplicantDTO[] }>('GET', '/recruits'),
  hire: (index: number) => request<{ character: Character }>('POST', `/recruits/${index}/hire`),
  buySlot: () => request<{ rosterSlots: number }>('POST', '/roster/slots'),
  jobs: () => request<JobBoardDTO>('GET', '/jobs'),
  unlockJob: (careerId: string) => request<{ unlockedCareers: string[] }>('POST', `/jobs/${careerId}/unlock`),
  shop: () => request<ShopDTO>('GET', '/shop'),
  buy: (id: string) => request<{ inventory: string[] }>('POST', `/shop/${id}/buy`),
  setDefence: (mode: BattleMode, characterIds: string[]) => request('PUT', `/defence/${mode}`, { characterIds }),
  opponents: (mode: BattleMode, refresh = false) => request<{ opponents: OpponentDTO[] }>('GET', `/opponents/${mode}${refresh ? '?refresh=1' : ''}`),
  attack: (req: AttackRequest) => request<AttackResponse>('POST', '/battles/attack', req),
  battle: (id: string) => request<BattleRecord>('GET', `/battles/${id}`),
  reports: () => request<{ reports: ReportDTO[] }>('GET', '/reports'),
  history: () => request<{ battles: { id: string; createdAt: number; defenderName: string; outcome: string; ratingDelta: number; headline: string | null }[] }>('GET', '/history'),
  leaderboard: () => request<LeaderboardDTO>('GET', '/leaderboard'),
};
