-- Career Crash schema v1 (docs/career-crash/01 §6.3)
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  rating INTEGER NOT NULL DEFAULT 1000,
  league TEXT NOT NULL DEFAULT 'intern',
  state TEXT NOT NULL,
  flags INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_players_rating ON players(rating);

CREATE TABLE auth_identities (
  provider TEXT NOT NULL,
  subject TEXT NOT NULL,
  player_id TEXT NOT NULL REFERENCES players(id),
  PRIMARY KEY (provider, subject)
);

CREATE TABLE wallets (
  player_id TEXT NOT NULL REFERENCES players(id),
  currency TEXT NOT NULL,
  balance INTEGER NOT NULL,
  PRIMARY KEY (player_id, currency)
);

CREATE TABLE ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL,
  currency TEXT NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  ref TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_ledger_player ON ledger(player_id, currency);

CREATE TABLE characters (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id),
  data TEXT NOT NULL,
  version INTEGER NOT NULL,
  retired INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_characters_player ON characters(player_id);

CREATE TABLE defences (
  player_id TEXT NOT NULL REFERENCES players(id),
  mode TEXT NOT NULL,
  character_ids TEXT NOT NULL,
  snapshot TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  power INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (player_id, mode)
);
CREATE INDEX idx_defences_match ON defences(mode, rating);

CREATE TABLE battles (
  id TEXT PRIMARY KEY,
  attacker_id TEXT NOT NULL,
  defender_id TEXT,
  mode TEXT NOT NULL,
  record TEXT NOT NULL,
  winner TEXT NOT NULL,
  rating_delta INTEGER NOT NULL,
  defender_rating_delta INTEGER NOT NULL DEFAULT 0,
  seen_by_defender INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_battles_defender ON battles(defender_id, created_at);
CREATE INDEX idx_battles_attacker ON battles(attacker_id, created_at);

CREATE TABLE discoveries (
  mastery_id TEXT PRIMARY KEY,
  first_player_id TEXT NOT NULL,
  first_at INTEGER NOT NULL,
  total_count INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE idempotency (
  key TEXT NOT NULL,
  player_id TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (player_id, key)
);
