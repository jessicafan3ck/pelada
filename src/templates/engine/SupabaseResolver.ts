/**
 * SupabaseResolver — the live resolver, reading the precomputed U17 tables.
 *
 * Drop-in replacement for MockResolver: same DataResolver interface, so swapping
 * it in required ZERO changes to specs, primitives, the renderer, or Studio.
 * That's the proof the declarative engine holds.
 *
 * All reads are Tier-1/2: a player is one indexed row; a leaderboard is one
 * indexed scan of the precomputed u17wwc_leaderboards table. No aggregation at
 * read time.
 */
import { supabase } from '../../lib/supabase';
import type { Template, MetricKey } from '../spec';
import {
  type DataResolver, type ResolvedBindings, type Selections,
  type PlayerRecord, type RankEntry, type MetricInfo,
  METRIC_LABELS, TEAM_COLORS, SAMPLE_PLAYERS,
} from './resolver';

/** All U17 players for the Studio pickers. Falls back to the sample set if the
 *  query fails (e.g. before the publishable key is set). */
export async function getPlayers(): Promise<PlayerRecord[]> {
  try {
    const { data, error } = await supabase.from('u17wwc_player_stats').select('*').order('player_name');
    if (error) throw new Error(error.message);
    return (data && data.length ? data : SAMPLE_PLAYERS) as PlayerRecord[];
  } catch {
    return SAMPLE_PLAYERS;
  }
}

const STATS = 'u17wwc_player_stats';
const BOARDS = 'u17wwc_leaderboards';

export class SupabaseResolver implements DataResolver {
  async resolve(template: Template, selections: Selections): Promise<ResolvedBindings> {
    const out: ResolvedBindings = {};
    for (const [id, binding] of Object.entries(template.bindings)) {
      const sel = selections[id];
      switch (binding.kind) {
        case 'text':
          out[id] = (sel as string) ?? binding.default ?? '';
          break;
        case 'metric': {
          const key = (sel as MetricKey) ?? binding.default;
          out[id] = { key, label: METRIC_LABELS[key] } as MetricInfo;
          break;
        }
        case 'player':
          out[id] = await this.player((sel as number) ?? binding.default);
          break;
        case 'team': {
          const name = (sel as string) ?? 'SPAIN';
          out[id] = { team_id: 0, name, primaryColor: TEAM_COLORS[name] ?? '#F59E0B' };
          break;
        }
        case 'lineup':
          out[id] = await this.lineup((sel as number[]) ?? binding.default);
          break;
        case 'leaderboard':
          out[id] = await this.leaderboard(resolveMetric(template, binding.metric, selections), binding.limit, binding.order);
          break;
        case 'comparison': {
          const players = await Promise.all(binding.players.map(ref => this.player(selections[ref.fromBinding] as number)));
          out[id] = { players: players.filter(Boolean), metrics: binding.metrics };
          break;
        }
        case 'match':
          out[id] = await this.match();
          break;
      }
    }
    return out;
  }

  private async player(id?: number): Promise<PlayerRecord | null> {
    if (id == null) return null;
    const { data, error } = await supabase.from(STATS).select('*').eq('player_id', id).limit(1);
    if (error) throw new Error(error.message);
    return (data?.[0] as PlayerRecord) ?? null;
  }

  private async lineup(ids?: number[]): Promise<PlayerRecord[]> {
    if (ids && ids.some(Boolean)) {
      const { data, error } = await supabase.from(STATS).select('*').in('player_id', ids.filter(Boolean));
      if (error) throw new Error(error.message);
      const byId = new Map((data ?? []).map((r: PlayerRecord) => [r.player_id, r]));
      // Preserve slot order — empty slots stay null so the pitch shows an open slot.
      return ids.map(i => byId.get(i) ?? null) as unknown as PlayerRecord[];
    }
    // No picker selection yet → default to a strong sample XI so the pitch renders.
    const { data, error } = await supabase.from(STATS).select('*').order('line_breaks', { ascending: false }).limit(11);
    if (error) throw new Error(error.message);
    return (data ?? []) as PlayerRecord[];
  }

  private async leaderboard(metric: MetricKey, limit: number, order: 'asc' | 'desc'): Promise<RankEntry[]> {
    const { data, error } = await supabase.from(BOARDS).select('rank,player_id,player_name,team,value').eq('metric', metric).order('rank').limit(limit);
    if (error) throw new Error(error.message);
    if (data && data.length) return data.map((r): RankEntry => ({ rank: r.rank, player_id: r.player_id, player_name: r.player_name, team: r.team, value: r.value }));
    // Fallback for any metric not precomputed into the leaderboard table.
    const { data: ps, error: psErr } = await supabase.from(STATS).select(`player_id,player_name,team,${metric}`).order(metric, { ascending: order === 'asc' }).limit(limit);
    if (psErr) throw new Error(psErr.message);
    return (ps ?? []).map((r: Record<string, unknown>, i: number): RankEntry => ({
      rank: i + 1, player_id: r.player_id as number, player_name: r.player_name as string,
      team: r.team as string, value: Number(r[metric]),
    }));
  }

  private async match() {
    const { data, error } = await supabase.from('u17wwc_matches').select('*').eq('match_id', 31).limit(1);
    if (error) throw new Error(error.message);
    const m = data?.[0];
    return m ? { match_id: m.match_id, home_team: m.home_team, away_team: m.away_team, home_score: m.home_score, away_score: m.away_score, stage: m.competition_stage } : null;
  }
}

function resolveMetric(template: Template, metric: MetricKey | { fromBinding: string }, selections: Selections): MetricKey {
  if (typeof metric === 'string') return metric;
  const b = template.bindings[metric.fromBinding];
  const sel = selections[metric.fromBinding];
  if (b && b.kind === 'metric') return (sel as MetricKey) ?? b.default;
  return 'goals';
}

export const supabaseResolver = new SupabaseResolver();
