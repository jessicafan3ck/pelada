import { useState, useEffect } from 'react';
import { Network, Info, Calendar, ChevronRight, Loader2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import {
  getNetworkMetricsForMatch,
  getWWCMatchById,
  type NetworkMetric,
  type WWCMatch,
} from '../services/wwcData';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeamMetrics {
  teamName: string;
  all:       NetworkMetric | null;
  byPhase:   Record<string, NetworkMetric>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<string, string> = {
  open_play: 'Open Play',
  set_piece: 'Set Piece',
  from_corner: 'Corner',
  from_free_kick: 'Free Kick',
  from_throw_in: 'Throw-In',
  counter: 'Counter',
};

function phaseLabelFor(p: string) {
  return PHASE_LABELS[p] ?? p.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function stripWomens(name: string) {
  return name.replace(/\s*Women['']s\s*/i, '').trim();
}

function fmt(v: number | null | undefined, dp = 3) {
  if (v == null) return '—';
  return v.toFixed(dp);
}

// ── Metric bar ────────────────────────────────────────────────────────────────

function MetricBar({
  label, description, metricA, metricB, nameA, nameB, colorA, colorB, low = false,
}: {
  label: string;
  description: string;
  metricA: number | null;
  metricB: number | null;
  nameA: string; nameB: string;
  colorA: string; colorB: string;
  low?: boolean; // lower = better (for fragmentation)
}) {
  const a = metricA ?? 0;
  const b = metricB ?? 0;
  const max = Math.max(a, b, 0.001);
  const pctA = (a / max) * 100;
  const pctB = (b / max) * 100;
  const winnerA = low ? a < b : a > b;
  const winnerB = low ? b < a : b > a;

  return (
    <div className="bg-black/30 border border-white/8 rounded-2xl p-5 space-y-4">
      <div>
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{description}</div>
      </div>

      {/* Team A */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className={`font-medium ${winnerA ? 'text-white' : 'text-zinc-400'}`}>{nameA}</span>
          <span className={`font-mono tabular-nums ${winnerA ? 'text-white font-bold' : 'text-zinc-500'}`}>
            {metricA != null ? metricA.toFixed(3) : '—'}
            {winnerA && <span className="ml-1 text-[10px]">▲</span>}
          </span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pctA}%`, background: colorA }} />
        </div>
      </div>

      {/* Team B */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className={`font-medium ${winnerB ? 'text-white' : 'text-zinc-400'}`}>{nameB}</span>
          <span className={`font-mono tabular-nums ${winnerB ? 'text-white font-bold' : 'text-zinc-500'}`}>
            {metricB != null ? metricB.toFixed(3) : '—'}
            {winnerB && <span className="ml-1 text-[10px]">▲</span>}
          </span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pctB}%`, background: colorB }} />
        </div>
      </div>
    </div>
  );
}

// ── Phase breakdown ────────────────────────────────────────────────────────────

function PhaseCard({
  phase, metricA, metricB, nameA, nameB, colorA, colorB,
}: {
  phase: string;
  metricA: NetworkMetric | null;
  metricB: NetworkMetric | null;
  nameA: string; nameB: string;
  colorA: string; colorB: string;
}) {
  const l2A = metricA?.lambda2_mean;
  const l2B = metricB?.lambda2_mean;

  return (
    <div className="bg-black/20 border border-white/6 rounded-xl p-4 space-y-3">
      <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{phaseLabelFor(phase)}</div>

      <div className="space-y-2">
        {[{name: nameA, val: l2A, color: colorA}, {name: nameB, val: l2B, color: colorB}].map(t => (
          <div key={t.name} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: t.color }} />
            <span className="text-xs text-zinc-400 truncate flex-1">{t.name}</span>
            <span className="text-xs font-mono text-zinc-300">{t.val != null ? t.val.toFixed(3) : '—'}</span>
          </div>
        ))}
      </div>

      {l2A != null && l2B != null && (
        <div className="text-[10px] text-zinc-600 pt-1 border-t border-white/5">
          {l2A > l2B
            ? `${nameA} more structurally connected`
            : l2B > l2A
            ? `${nameB} more structurally connected`
            : 'Equal connectivity'}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function NetworksView({ onNavigate }: { onNavigate?: (v: string) => void }) {
  const { activeMatchId } = useAppContext();
  const [match, setMatch] = useState<WWCMatch | null>(null);
  const [teamA, setTeamA] = useState<TeamMetrics | null>(null);
  const [teamB, setTeamB] = useState<TeamMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [phases, setPhases] = useState<string[]>([]);

  const COLOR_A = '#38bdf8'; // sky-400
  const COLOR_B = '#f43f5e'; // rose-500

  useEffect(() => {
    if (!activeMatchId) return;
    setLoading(true);
    setTeamA(null); setTeamB(null);

    Promise.all([
      getWWCMatchById(activeMatchId),
      getNetworkMetricsForMatch(activeMatchId),
    ]).then(([matchData, metrics]) => {
      setMatch(matchData);

      // Group by team
      const byTeam: Record<number, NetworkMetric[]> = {};
      for (const m of metrics) {
        if (!byTeam[m.team_id]) byTeam[m.team_id] = [];
        byTeam[m.team_id].push(m);
      }

      const teamIds = Object.keys(byTeam).map(Number);
      if (teamIds.length < 2) return;

      const makeTeamMetrics = (id: number, name: string): TeamMetrics => {
        const rows = byTeam[id] ?? [];
        const allRow = rows.find(r => r.phase === 'all') ?? null;
        const byPhase: Record<string, NetworkMetric> = {};
        for (const r of rows) { if (r.phase !== 'all') byPhase[r.phase] = r; }
        return { teamName: name, all: allRow, byPhase };
      };

      const nameA = stripWomens(matchData?.home_team ?? teamIds[0].toString());
      const nameB = stripWomens(matchData?.away_team ?? teamIds[1].toString());

      setTeamA(makeTeamMetrics(teamIds[0], nameA));
      setTeamB(makeTeamMetrics(teamIds[1], nameB));

      // Phases present in both teams
      const phaseSet = new Set([
        ...Object.keys(byTeam[teamIds[0]] ? byTeam[teamIds[0]].reduce((a, r) => r.phase !== 'all' ? { ...a, [r.phase]: 1 } : a, {} as Record<string, number>) : {}),
        ...Object.keys(byTeam[teamIds[1]] ? byTeam[teamIds[1]].reduce((a, r) => r.phase !== 'all' ? { ...a, [r.phase]: 1 } : a, {} as Record<string, number>) : {}),
      ]);
      const phaseOrder = ['open_play', 'set_piece', 'counter', 'from_corner', 'from_free_kick', 'from_throw_in'];
      setPhases([...phaseOrder.filter(p => phaseSet.has(p)), ...[...phaseSet].filter(p => !phaseOrder.includes(p))]);
    }).finally(() => setLoading(false));
  }, [activeMatchId]);

  // ── No match selected ──────────────────────────────────────────────────────
  if (!activeMatchId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-black/40 border border-white/8 flex items-center justify-center">
          <Network className="w-7 h-7 text-zinc-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white">No match selected</h3>
          <p className="text-sm text-zinc-500 max-w-xs">Pick a match from the Match Calendar to load its network metrics.</p>
        </div>
        <button
          onClick={() => onNavigate?.('calendar')}
          className="flex items-center gap-2 px-5 py-2.5 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 rounded-xl text-sm text-sky-300 font-medium transition-all"
        >
          <Calendar className="w-4 h-4" />
          Open Match Calendar
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] gap-3 text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading network metrics…</span>
      </div>
    );
  }

  // ── No data ────────────────────────────────────────────────────────────────
  if (!teamA || !teamB) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-center">
        <Network className="w-8 h-8 text-zinc-700" />
        <p className="text-sm text-zinc-500">No network metrics found for match {activeMatchId}.</p>
        <p className="text-xs text-zinc-600">Run the ingest script to populate the table.</p>
      </div>
    );
  }

  const nameA = teamA.teamName;
  const nameB = teamB.teamName;
  const allA = teamA.all;
  const allB = teamB.all;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-sky-400" />
            Pass Network Structure
          </h2>
          <p className="text-sm text-zinc-400 mt-0.5">
            {match
              ? `${stripWomens(match.home_team)} vs ${stripWomens(match.away_team)} · ${match.competition_stage} · ${match.match_date}`
              : `Match ${activeMatchId}`}
          </p>
        </div>

        {/* Volume pills */}
        <div className="flex items-center gap-3">
          {[{name: nameA, m: allA, color: COLOR_A}, {name: nameB, m: allB, color: COLOR_B}].map(t => (
            <div key={t.name} className="flex items-center gap-2 px-3 py-1.5 bg-black/30 border border-white/8 rounded-xl text-xs">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
              <span className="text-zinc-300 font-medium">{t.name}</span>
              {t.m && <span className="text-zinc-600">{t.m.possession_count} poss</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Main metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricBar
          label="λ₂ — Algebraic Connectivity"
          description="Second eigenvalue of the Laplacian. Higher = more robustly connected — harder to disrupt by removing a passer."
          metricA={allA?.lambda2_mean ?? null}
          metricB={allB?.lambda2_mean ?? null}
          nameA={nameA} nameB={nameB}
          colorA={COLOR_A} colorB={COLOR_B}
        />
        <MetricBar
          label="Fragmentation"
          description="Fraction of possessions where the network falls into disconnected components. Higher = more fragmented build-up."
          metricA={allA?.fragmentation_mean ?? null}
          metricB={allB?.fragmentation_mean ?? null}
          nameA={nameA} nameB={nameB}
          colorA={COLOR_A} colorB={COLOR_B}
          low
        />
        <MetricBar
          label="Network Density"
          description="Fraction of possible player-to-player connections used. Higher = more distributed, less predictable passing."
          metricA={allA?.density_mean ?? null}
          metricB={allB?.density_mean ?? null}
          nameA={nameA} nameB={nameB}
          colorA={COLOR_A} colorB={COLOR_B}
        />
      </div>

      {/* λ₂ IQR detail */}
      {(allA?.lambda2_p25 != null || allB?.lambda2_p25 != null) && (
        <div className="bg-black/20 border border-white/6 rounded-2xl p-5">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">λ₂ Distribution (IQR)</div>
          <div className="space-y-4">
            {[{name: nameA, m: allA, color: COLOR_A}, {name: nameB, m: allB, color: COLOR_B}].map(t => {
              if (!t.m) return null;
              const p25 = t.m.lambda2_p25 ?? 0;
              const p75 = t.m.lambda2_p75 ?? 0;
              const mean = t.m.lambda2_mean ?? 0;
              const max = Math.max(allA?.lambda2_max ?? 0, allB?.lambda2_max ?? 0, 0.001);
              return (
                <div key={t.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium">{t.name}</span>
                    <span className="text-zinc-500 font-mono">
                      μ={fmt(mean)} · IQR [{fmt(p25, 2)}–{fmt(p75, 2)}]
                    </span>
                  </div>
                  <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
                    {/* IQR band */}
                    <div className="absolute top-0 h-full rounded-full opacity-30"
                      style={{ left: `${(p25 / max) * 100}%`, width: `${((p75 - p25) / max) * 100}%`, background: t.color }} />
                    {/* Mean marker */}
                    <div className="absolute top-0 h-full w-0.5 rounded-full"
                      style={{ left: `${(mean / max) * 100}%`, background: t.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Phase breakdown */}
      {phases.length > 0 && (
        <div>
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">By Phase of Play</div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {phases.map(p => (
              <PhaseCard
                key={p} phase={p}
                metricA={teamA.byPhase[p] ?? null}
                metricB={teamB.byPhase[p] ?? null}
                nameA={nameA} nameB={nameB}
                colorA={COLOR_A} colorB={COLOR_B}
              />
            ))}
          </div>
        </div>
      )}

      {/* Explainer */}
      <div className="bg-sky-500/5 border border-sky-500/15 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div className="space-y-2 text-xs text-zinc-400 leading-relaxed">
            <p><span className="text-sky-300 font-semibold">λ₂ (algebraic connectivity)</span> is the second-smallest eigenvalue of the pass network's Laplacian matrix. A higher value means the team's passing structure is harder to disconnect — removing any single player creates less disruption. Statistically significant correlates: pass count (p=0.006), pressure events (p=0.022).</p>
            <p><span className="text-zinc-300 font-semibold">Fragmentation</span> measures how often possessions result in a disconnected network. Teams under high pressing pressure show elevated fragmentation — it's a structural indicator of defensive disruption, not just volume.</p>
            <p className="text-zinc-600">Metrics computed from StatsBomb 360° data via On-Networks-for-Football-Analytics.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
