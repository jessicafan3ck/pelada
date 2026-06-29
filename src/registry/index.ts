/**
 * The Capability Registry (v1 — read-only seed).
 *
 * Formalizes what already exists: the precomputed u17wwc_player_stats columns and
 * u17wwc_leaderboards rows are capability v0. Each is registered here as a `seed`
 * Capability so the rest of the platform consumes metrics through the registry,
 * not a hard-coded list. When the Build (Technical) surface ships, contributed
 * capabilities append to this registry and instantly become available to Create
 * (template MetricBindings) and Analyze — no per-metric wiring.
 *
 * This is the concrete wiring of the keystone into Create: `MetricKey` is now a
 * registry-driven string, and metric labels/validity come from here.
 */
import type { ScalarCapability, Capability } from './capability';

function scalar(id: string, name: string, description: string, higherIsBetter = true): ScalarCapability {
  return {
    id, version: 1, kind: 'scalar',
    meta: { name, description, author: 'pelada' },
    entity: 'player',
    materialized: { table: 'u17wwc_player_stats', column: id },
    impl: { runtime: 'builtin' },
    attribution: { usedByCount: 0 },
    status: 'seed',
    output: { higherIsBetter },
  };
}

/** Seed scalar capabilities — one per materialized player_stats metric. */
export const SEED_CAPABILITIES: Capability[] = [
  scalar('goals', 'Goals', 'Goals scored (attempt_at_goal with outcome goal).'),
  scalar('shots', 'Shots', 'Attempts at goal.'),
  scalar('assists', 'Assists', 'Passes leading directly to a goal.'),
  scalar('passes', 'Passes', 'Total passes attempted.'),
  scalar('passes_complete', 'Passes Cmp', 'Completed passes.'),
  scalar('pass_pct', 'Pass %', 'Pass completion percentage.'),
  scalar('line_breaks', 'Line Breaks', 'Passes/carries that break a defensive line — a Pelada-exclusive FIFA metric.'),
  scalar('pressings', 'Pressings', 'Pressing actions applied — off-ball defensive work.'),
  scalar('offers', 'Off-ball Offers', 'Times the player offered to receive — off-ball movement.'),
  scalar('ball_progressions', 'Ball Progressions', 'Actions that progress the ball upfield.'),
  scalar('crosses', 'Crosses', 'Crosses delivered.'),
  scalar('tackles', 'Tackles', 'Tackles made.'),
  scalar('clearances', 'Clearances', 'Clearances made.'),
  scalar('blocks', 'Blocks', 'Blocks made.'),
  scalar('interceptions', 'Interceptions', 'Interceptions made.'),
  scalar('aerial_duels', 'Aerial Duels', 'Aerial duels contested.'),
  scalar('receptions', 'Receptions', 'Passes received.'),
];

// ── Registry API (what the rest of the platform calls) ────────────────────────

const BY_ID = new Map(SEED_CAPABILITIES.map(c => [c.id, c]));

export function getCapability(id: string): Capability | undefined { return BY_ID.get(id); }

export function listCapabilities(kind?: Capability['kind']): Capability[] {
  return kind ? SEED_CAPABILITIES.filter(c => c.kind === kind) : SEED_CAPABILITIES;
}

/** Scalar capability ids — the universe a template MetricBinding may offer. */
export function listMetrics(): string[] {
  return listCapabilities('scalar').map(c => c.id);
}

export function isMetric(id: string): boolean {
  return BY_ID.get(id)?.kind === 'scalar';
}

export function metricLabel(id: string): string {
  return BY_ID.get(id)?.meta.name ?? id;
}

/** Back-compat record (resolver/primitives/Studio import this). */
export const METRIC_LABELS: Record<string, string> = Object.fromEntries(
  listCapabilities('scalar').map(c => [c.id, c.meta.name])
);
