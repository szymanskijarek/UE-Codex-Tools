/**
 * API contract shared by apps/client and apps/worker (01 §6.4).
 * All endpoints live under /api/v1 and exchange JSON.
 */
import type { BattleReport } from '@cc/commentary';
import type { Stats } from '@cc/content-schema';
import type { Character, Currency, Difficulty, Rarity } from '@cc/game-rules';
import type { BattleInput, BattleMode } from '@cc/sim';

export const API_PREFIX = '/api/v1';

export type Wallet = Record<Currency, number>;

export interface PlayerDTO {
  id: string;
  displayName: string;
  rating: number;
  league: string;
  wallet: Wallet;
  rosterSlots: number;
  unlockedCareers: string[];
  inventory: string[];
  winsToday: number;
  createdAt: number;
}

export interface DefenceDTO {
  mode: BattleMode;
  characterIds: string[];
  power: number;
  updatedAt: number;
}

export interface PendingRewards {
  cash: number;
  rep: number;
  offlineHours: number;
  defences: { wins: number; losses: number; draws: number };
}

export interface MeResponse {
  player: PlayerDTO;
  roster: Character[];
  defences: DefenceDTO[];
  pending: PendingRewards;
  unreadReports: number;
  contentHash: string;
  simVersion: string;
  serverTime: number;
}

export interface AuthResponse {
  token: string;
  playerId: string;
}

export interface BattleSummary {
  winner: 'attacker' | 'defender' | 'draw';
  reason: 'elimination' | 'timeout';
  seconds: number;
  attackerName: string;
  defenderName: string;
  arenaId: string;
  report: BattleReport;
}

export interface BattleRecord {
  id: string;
  input: BattleInput;
  resultHash: string;
  summary: BattleSummary;
  createdAt: number;
}

export interface OpponentDTO {
  playerId: string;
  playerName: string;
  rating: number;
  power: number;
  difficulty: Difficulty;
  ghost: boolean;
  /** One of my characters has a grudge against someone on this team. */
  rival?: boolean;
  preview: { name: string; careers: string[]; level: number }[];
}

export interface AttackRequest {
  mode: BattleMode;
  opponentId: string;
  characterIds: string[];
}

export interface CharacterProgress {
  characterId: string;
  xp: number;
  levelsGained: number;
  newTraits: string[];
  milestone: boolean;
}

export interface AttackResponse {
  record: BattleRecord;
  rewards: { cash: number; rep: number };
  ratingDelta: number;
  progress: CharacterProgress[];
  player: PlayerDTO;
}

export interface ReportDTO {
  id: string;
  createdAt: number;
  attackerName: string;
  outcome: 'win' | 'loss' | 'draw';
  ratingDelta: number;
  headline: string | null;
}

export interface ApplicantDTO {
  index: number;
  rarity: Rarity;
  cost: number;
  character: Character;
  hired: boolean;
}

export interface JobBoardDTO {
  careers: { id: string; tier: number; cost: number; unlocked: boolean; eligible: boolean }[];
}

export interface ShopDTO {
  items: { id: string; price: number; owned: boolean }[];
}

export interface CareerOfferResponse {
  characterId: string;
  offer: string[];
  rerollCost: number;
}

export interface ChooseCareerResponse {
  character: Character;
  masteries: string[];
  discoveries: string[];
}

export interface LeaderboardDTO {
  entries: { playerId: string; displayName: string; rating: number; league: string }[];
}

export type AllocateRequest = Partial<Stats>;

export interface ApiError {
  error: string;
  code: string;
}

export interface ManifestDTO {
  contentHash: string;
  simVersion: string;
}
