-- Network efficiency metrics per match per team, derived from On-Networks-for-Football-Analytics.
-- Run once in the Supabase SQL editor before running the Python ingest script.

CREATE TABLE IF NOT EXISTS wwc2023_network_metrics (
  id          BIGSERIAL PRIMARY KEY,
  match_id    BIGINT    NOT NULL,
  team_id     BIGINT    NOT NULL,
  team_name   TEXT,
  phase       TEXT      NOT NULL DEFAULT 'all',

  -- Algebraic connectivity (λ₂): higher = more connected, harder to disrupt
  lambda2_mean  DOUBLE PRECISION,
  lambda2_std   DOUBLE PRECISION,
  lambda2_max   DOUBLE PRECISION,
  lambda2_p25   DOUBLE PRECISION,
  lambda2_p75   DOUBLE PRECISION,

  -- Network fragmentation: higher = more fragmented / easier to break up
  fragmentation_mean DOUBLE PRECISION,
  fragmentation_std  DOUBLE PRECISION,

  -- Pass network density: fraction of possible connections used
  density_mean DOUBLE PRECISION,

  -- Volume counters
  possession_count INT,
  pass_count       INT,
  shot_count       INT,

  UNIQUE (match_id, team_id, phase)
);

-- Index for the common query pattern: all metrics for a given match
CREATE INDEX IF NOT EXISTS idx_network_metrics_match
  ON wwc2023_network_metrics (match_id);
