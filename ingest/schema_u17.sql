-- ============================================================
-- Pelada – FIFA U17 Women's World Cup 2024 Schema
-- Source: FIFA Unified Event Data (31 matches, .xlsx).
-- Run this ONCE in your Supabase SQL Editor before ingesting.
-- Safe to re-run: drops + recreates everything.
--
-- NOTE: FIFA taxonomy, NOT StatsBomb. There is no xG column.
--   A SHOT      = event 'attempt_at_goal'
--   A GOAL      = 'attempt_at_goal' row with outcome_additional = 'goal'
--   Scores are derived by counting goals per team per match.
--   The pseudo-team 'TEAM REFEREES' is excluded everywhere.
-- ============================================================

DROP TABLE IF EXISTS u17wwc_player_stats CASCADE;
DROP TABLE IF EXISTS u17wwc_leaderboards CASCADE;
DROP TABLE IF EXISTS u17wwc_events       CASCADE;
DROP TABLE IF EXISTS u17wwc_lineups      CASCADE;
DROP TABLE IF EXISTS u17wwc_matches      CASCADE;

-- ── Matches ───────────────────────────────────────────────────────────────────

CREATE TABLE u17wwc_matches (
  match_id          INTEGER PRIMARY KEY,   -- the matchnum from the filename (1..31)
  source_match_id   BIGINT,                -- the match_id embedded in the cell data
  match_date        DATE    NOT NULL,
  home_team         TEXT    NOT NULL,      -- 3-letter code from filename (e.g. USA)
  away_team         TEXT    NOT NULL,
  home_team_name    TEXT,                  -- full name as it appears in the data (e.g. USA)
  away_team_name    TEXT,
  home_score        INTEGER NOT NULL DEFAULT 0,   -- derived from goal events
  away_score        INTEGER NOT NULL DEFAULT 0,
  competition_stage TEXT,                  -- inferred from match number
  total_events      INTEGER DEFAULT 0
);

-- ── Lineups (per match, per player) ─────────────────────────────────────────────
-- Derived from the events: any player appearing on the ball in a match.
-- NOTE: these are NOT official starting XIs — they are everyone who recorded an
-- event for the team in the match (a reasonable proxy for an appearance).

CREATE TABLE u17wwc_lineups (
  id            SERIAL PRIMARY KEY,
  match_id      INTEGER NOT NULL REFERENCES u17wwc_matches(match_id) ON DELETE CASCADE,
  team          TEXT    NOT NULL,
  player_id     BIGINT,
  player_name   TEXT    NOT NULL,
  shirt_number  INTEGER,
  events        INTEGER DEFAULT 0          -- # of events this player recorded in the match
);
CREATE INDEX ON u17wwc_lineups(match_id);
CREATE INDEX ON u17wwc_lineups(player_name);
CREATE INDEX ON u17wwc_lineups(player_id);
CREATE INDEX ON u17wwc_lineups(team);

-- ── Events (normalized useful subset of the 65 FIFA columns) ─────────────────────

CREATE TABLE u17wwc_events (
  event_id            TEXT PRIMARY KEY,
  match_id            INTEGER NOT NULL REFERENCES u17wwc_matches(match_id) ON DELETE CASCADE,
  source_match_id     BIGINT,
  event_order         INTEGER,
  half_time           INTEGER,            -- 1 or 2
  match_time_in_ms    BIGINT,
  team_id             BIGINT,
  team_name           TEXT,
  from_player_id      BIGINT,
  from_player_name    TEXT,
  from_shirt_number   INTEGER,
  to_player_id        BIGINT,
  to_player_name      TEXT,
  category            TEXT,               -- in_possession / out_of_possession / in_contest / ...
  event_type          TEXT,
  event               TEXT,               -- the FIFA event taxonomy value
  action_type         TEXT,
  side                TEXT,
  sequence_type       TEXT,
  outcome             TEXT,
  outcome_additional  TEXT,               -- 'goal' marks a scored attempt_at_goal
  body_type           TEXT,
  direction           TEXT,
  pressure            TEXT,
  style               TEXT,
  game_state          TEXT,
  game_period         TEXT,
  origin              TEXT,
  save_type           TEXT,
  save_detail         TEXT,
  movement            TEXT,
  line_break_direction TEXT,
  line_break_outcome  TEXT,
  team_shape          TEXT,
  team_unit           TEXT,
  team_units_broken   INTEGER,
  total_team_units    INTEGER,
  opposition_touch    TEXT,
  x                   FLOAT,
  y                   FLOAT,
  x_mirrored          FLOAT,
  y_mirrored          FLOAT,
  x_location_start    FLOAT,
  y_location_start    FLOAT,
  x_location_end      FLOAT,
  y_location_end      FLOAT,
  is_shot             BOOLEAN DEFAULT FALSE,
  is_goal             BOOLEAN DEFAULT FALSE
);
CREATE INDEX ON u17wwc_events(match_id);
CREATE INDEX ON u17wwc_events(event);
CREATE INDEX ON u17wwc_events(from_player_name);
CREATE INDEX ON u17wwc_events(from_player_id);
CREATE INDEX ON u17wwc_events(team_name);
CREATE INDEX ON u17wwc_events(is_shot);
CREATE INDEX ON u17wwc_events(is_goal);

-- ── Player stats — TOURNAMENT-aggregated, precomputed ───────────────────────────
-- One row per player across the whole tournament. Precomputed at ingest time so
-- creation-time reads are instant (hard product requirement).

CREATE TABLE u17wwc_player_stats (
  id                 SERIAL PRIMARY KEY,
  player_id          BIGINT,
  player_name        TEXT    NOT NULL,
  team               TEXT,
  shirt_number       INTEGER,
  appearances        INTEGER DEFAULT 0,   -- # matches with >=1 recorded event (proxy)
  minutes_estimate   FLOAT   DEFAULT 0,   -- appearances * 90 (NO real minutes in source)
  events_total       INTEGER DEFAULT 0,
  passes             INTEGER DEFAULT 0,
  passes_complete    INTEGER DEFAULT 0,
  receptions         INTEGER DEFAULT 0,
  shots              INTEGER DEFAULT 0,   -- attempt_at_goal
  goals              INTEGER DEFAULT 0,   -- attempt_at_goal w/ outcome_additional='goal'
  assists            INTEGER DEFAULT 0,
  crosses            INTEGER DEFAULT 0,
  line_breaks        INTEGER DEFAULT 0,   -- line_break_outcome='line_break_complete'
  line_break_attempts INTEGER DEFAULT 0,
  pressings          INTEGER DEFAULT 0,
  offers             INTEGER DEFAULT 0,   -- off-ball 'offer' to receive
  ball_progressions  INTEGER DEFAULT 0,
  tackles            INTEGER DEFAULT 0,
  clearances         INTEGER DEFAULT 0,
  blocks             INTEGER DEFAULT 0,
  interceptions      INTEGER DEFAULT 0,
  aerial_duels       INTEGER DEFAULT 0,
  aerial_duels_won   INTEGER DEFAULT 0,
  fouls_committed    INTEGER DEFAULT 0,
  throwins           INTEGER DEFAULT 0,
  freekicks          INTEGER DEFAULT 0,
  pass_pct           FLOAT   DEFAULT 0
);
CREATE INDEX ON u17wwc_player_stats(player_name);
CREATE INDEX ON u17wwc_player_stats(player_id);
CREATE INDEX ON u17wwc_player_stats(team);
CREATE INDEX ON u17wwc_player_stats(goals);
CREATE INDEX ON u17wwc_player_stats(line_breaks);
CREATE INDEX ON u17wwc_player_stats(pressings);

-- ── Leaderboards — precomputed per-metric top-N ─────────────────────────────────
-- Precomputed so a leaderboard read is a single indexed scan (no aggregation at
-- read time). One row per (metric, rank) holding the player + value.

CREATE TABLE u17wwc_leaderboards (
  id           SERIAL PRIMARY KEY,
  metric       TEXT    NOT NULL,          -- e.g. 'goals', 'line_breaks', 'pressings'
  rank         INTEGER NOT NULL,          -- 1 = best
  player_id    BIGINT,
  player_name  TEXT    NOT NULL,
  team         TEXT,
  value        FLOAT   NOT NULL,
  appearances  INTEGER DEFAULT 0,
  UNIQUE (metric, rank)
);
CREATE INDEX ON u17wwc_leaderboards(metric);

-- ── Row Level Security (public read) ────────────────────────────────────────────

ALTER TABLE u17wwc_matches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE u17wwc_lineups      ENABLE ROW LEVEL SECURITY;
ALTER TABLE u17wwc_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE u17wwc_player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE u17wwc_leaderboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON u17wwc_matches      FOR SELECT USING (true);
CREATE POLICY "public read" ON u17wwc_lineups      FOR SELECT USING (true);
CREATE POLICY "public read" ON u17wwc_events       FOR SELECT USING (true);
CREATE POLICY "public read" ON u17wwc_player_stats FOR SELECT USING (true);
CREATE POLICY "public read" ON u17wwc_leaderboards FOR SELECT USING (true);
