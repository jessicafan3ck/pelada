/**
 * Binding resolver — turns a Template's declarative bindings + the creator's
 * selections into concrete values the renderer can substitute.
 *
 * Two implementations share one interface:
 *   - MockResolver   : embedded real U17 sample values → renders with no DB (now)
 *   - SupabaseResolver: precomputed reads from u17wwc_* tables (after ingest --write)
 *
 * The renderer never knows which one it got — that's the point of the spec being
 * pure data: the same template renders identically from mock or live data.
 */
import type { Template, BindingRef, MetricKey } from '../spec';

export interface PlayerRecord {
  player_id: number;
  player_name: string;
  team: string;
  shirt_number?: number;
  position?: string;
  /** All metric values live as flat fields, keyed by MetricKey. */
  [metric: string]: number | string | undefined;
}

export interface RankEntry {
  rank: number;
  player_id: number;
  player_name: string;
  team: string;
  value: number;
}

export interface MetricInfo { key: MetricKey; label: string; }

export type ResolvedBindings = Record<string, unknown>;

/** Creator choices from the Studio pickers, keyed by binding id. */
export type Selections = Record<string, unknown>;

export interface DataResolver {
  resolve(template: Template, selections: Selections): Promise<ResolvedBindings>;
}

// Metric labels are now registry-driven (the capability registry is the source of
// truth for which scalar metrics exist and what they're called). Imported and
// re-exported so existing consumers (resolver, primitives, Studio) are unchanged.
import { METRIC_LABELS, metricLabel } from '../../registry';
export { METRIC_LABELS, metricLabel };

/** Team accent colors (country palettes) — used when style.accent derives from a team. */
export const TEAM_COLORS: Record<string, string> = {
  SPAIN: '#C60B1E', USA: '#3C3B6E', ENGLAND: '#CF142B', BRAZIL: '#009C3B',
  JAPAN: '#BC002D', 'KOREA DPR': '#024FA2', 'KOREA REPUBLIC': '#003478',
  NIGERIA: '#008751', COLOMBIA: '#FCD116', MEXICO: '#006847', POLAND: '#DC143C',
  ZAMBIA: '#198A00', KENYA: '#006600', ECUADOR: '#FFDD00',
  'NEW ZEALAND': '#00247D', 'DOMINICAN REPUBLIC': '#002D62',
};

// ── Resolve a BindingRef against already-resolved values ──────────────────────
export function resolveRef(resolved: ResolvedBindings, ref: BindingRef): unknown {
  let v: unknown = resolved[ref.binding];
  if (ref.index != null && Array.isArray(v)) v = v[ref.index];
  if (ref.field != null && v && typeof v === 'object') v = (v as Record<string, unknown>)[ref.field];
  return v;
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK RESOLVER — real U17 sample values so the engine renders with no database
// ─────────────────────────────────────────────────────────────────────────────

// A small, realistic fixture. Values are representative of the dry-run output.
const FIXTURE: PlayerRecord[] = [
  mk(10, 'Pau Comendador', 'SPAIN', 9, 'Center Forward',  { goals: 5, shots: 19, line_breaks: 71, pressings: 88, ball_progressions: 64, passes: 410, passes_complete: 351 }),
  mk(11, 'Jocelyn Travers', 'USA', 8, 'Center Midfield',  { goals: 2, shots: 11, line_breaks: 98, pressings: 121, ball_progressions: 90, passes: 612, passes_complete: 540 }),
  mk(12, 'Erica Parkinson', 'ENGLAND', 6, 'Defensive Mid',{ goals: 1, shots: 6,  line_breaks: 64, pressings: 186, ball_progressions: 41, passes: 498, passes_complete: 430 }),
  mk(13, 'Melina Rebimbas', 'USA', 10, 'Attacking Mid',   { goals: 3, shots: 14, line_breaks: 80, pressings: 95,  ball_progressions: 77, passes: 433, passes_complete: 372 }),
  mk(14, 'Vicky López', 'SPAIN', 11, 'Right Wing',        { goals: 4, shots: 17, line_breaks: 76, pressings: 84,  ball_progressions: 82, passes: 388, passes_complete: 333 }),
  mk(15, 'Michelle Agyemang', 'ENGLAND', 9, 'Forward',    { goals: 3, shots: 16, line_breaks: 58, pressings: 90,  ball_progressions: 55, passes: 270, passes_complete: 210 }),
  mk(16, 'Kim Yu-jin', 'KOREA DPR', 7, 'Right Wing',      { goals: 4, shots: 18, line_breaks: 69, pressings: 102, ball_progressions: 71, passes: 312, passes_complete: 255 }),
  mk(17, 'Amelia Sousa', 'BRAZIL', 8, 'Center Midfield',  { goals: 2, shots: 9,  line_breaks: 73, pressings: 110, ball_progressions: 68, passes: 540, passes_complete: 470 }),
  mk(18, 'Onome Eric', 'NIGERIA', 14, 'Forward',          { goals: 3, shots: 13, line_breaks: 52, pressings: 78,  ball_progressions: 49, passes: 233, passes_complete: 180 }),
  mk(19, 'Linda Caicedo Jr', 'COLOMBIA', 18, 'Left Wing', { goals: 2, shots: 12, line_breaks: 66, pressings: 70,  ball_progressions: 74, passes: 301, passes_complete: 244 }),
  mk(20, 'Maya Tanaka', 'JAPAN', 5, 'Center Back',        { goals: 0, shots: 2,  line_breaks: 88, pressings: 134, ball_progressions: 39, passes: 705, passes_complete: 651 }),
  mk(21, 'Sofia Kowalski', 'POLAND', 1, 'Goalkeeper',     { goals: 0, shots: 0,  line_breaks: 12, pressings: 14,  ball_progressions: 8,  passes: 188, passes_complete: 150 }),
];

function mk(id: number, name: string, team: string, shirt: number, position: string, stats: Partial<Record<MetricKey, number>>): PlayerRecord {
  const base: Record<string, number> = { goals: 0, shots: 0, passes: 0, passes_complete: 0, line_breaks: 0, pressings: 0, offers: 0, tackles: 0, clearances: 0, blocks: 0, crosses: 0, aerial_duels: 0, ball_progressions: 0 };
  Object.assign(base, stats);
  base.pass_pct = base.passes ? Math.round((base.passes_complete / base.passes) * 100) : 0;
  return { player_id: id, player_name: name, team, shirt_number: shirt, position, ...base };
}

export class MockResolver implements DataResolver {
  async resolve(template: Template, selections: Selections): Promise<ResolvedBindings> {
    const out: ResolvedBindings = {};
    for (const [id, binding] of Object.entries(template.bindings)) {
      const sel = selections[id];
      switch (binding.kind) {
        case 'text':
          out[id] = (sel as string) ?? binding.default ?? '';
          break;
        case 'metric': {
          const key = ((sel as MetricKey) ?? binding.default);
          out[id] = { key, label: METRIC_LABELS[key] } as MetricInfo;
          break;
        }
        case 'player':
          out[id] = FIXTURE.find(p => p.player_id === (sel ?? binding.default)) ?? FIXTURE[0];
          break;
        case 'team':
          out[id] = { team_id: 0, name: (sel as string) ?? 'SPAIN', primaryColor: TEAM_COLORS[(sel as string) ?? 'SPAIN'] };
          break;
        case 'lineup': {
          const ids = (sel as number[]) ?? binding.default ?? FIXTURE.slice(0, 11).map(p => p.player_id);
          out[id] = ids.map(pid => FIXTURE.find(p => p.player_id === pid)).filter(Boolean);
          break;
        }
        case 'leaderboard': {
          const metricKey = resolveLeaderboardMetric(template, binding.metric, selections);
          const ranked = [...FIXTURE]
            .sort((a, b) => (Number(b[metricKey]) - Number(a[metricKey])) * (binding.order === 'asc' ? -1 : 1))
            .slice(0, binding.limit)
            .map((p, i): RankEntry => ({ rank: i + 1, player_id: p.player_id, player_name: p.player_name, team: p.team, value: Number(p[metricKey]) }));
          out[id] = ranked;
          break;
        }
        case 'comparison': {
          const players = binding.players.map(ref => {
            const pid = selections[ref.fromBinding] ?? template.bindings[ref.fromBinding];
            return FIXTURE.find(p => p.player_id === pid) ?? FIXTURE[0];
          });
          out[id] = { players, metrics: binding.metrics };
          break;
        }
        case 'match':
          out[id] = { match_id: 31, home_team: 'USA', away_team: 'ENGLAND', home_score: 3, away_score: 0, stage: 'Final' };
          break;
      }
    }
    return out;
  }
}

function resolveLeaderboardMetric(template: Template, metric: MetricKey | { fromBinding: string }, selections: Selections): MetricKey {
  if (typeof metric === 'string') return metric;
  const b = template.bindings[metric.fromBinding];
  const sel = selections[metric.fromBinding];
  if (b && b.kind === 'metric') return (sel as MetricKey) ?? b.default;
  return 'goals';
}

export const mockResolver = new MockResolver();
