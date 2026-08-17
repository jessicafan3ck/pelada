/**
 * Creator Leaderboard — the demo closer.
 *
 * Framed as a board living ON FIFA's TikTok account: fan-made cards ranked by the
 * engagement they drive (interactions, remixes, reach). The point for Lenovo is
 * that this isn't one post — it's a self-propagating machine, and their mark is
 * baked into every unit of it. Data here is a styled seed (the flywheel that
 * feeds it — real attribution counts — is the next build, not this demo).
 */
import { useEffect, useState } from 'react';
import { Trophy, Heart, Repeat2, Eye, Flame, BadgeCheck, TrendingUp } from 'lucide-react';

type Row = {
  handle: string;
  format: string;
  metric: string;
  accent: string;
  interactions: number;   // likes + comments
  remixes: number;
  reach: number;          // impressions
  pick?: boolean;         // FIFA "Analyst Pick"
};

const SEED: Row[] = [
  { handle: '@laroja.futfem', format: 'Top 5 Wonderkids', metric: 'by line-breaks', accent: '#F59E0B', interactions: 184200, remixes: 3120, reach: 2410000, pick: true },
  { handle: '@midfield.lab',  format: 'U17 Tier List',    metric: 'by pressings',   accent: '#3b82f6', interactions: 141880, remixes: 2604, reach: 1980000 },
  { handle: '@golazo.scout',  format: 'Stat Drop',        metric: 'ball progressions', accent: '#a855f7', interactions: 98760,  remixes: 1890, reach: 1420000 },
  { handle: '@vivenlacancha', format: 'Best XI',          metric: '4-3-3',          accent: '#009C3B', interactions: 76540,  remixes: 4310, reach: 1180000, pick: true },
  { handle: '@debate.futfem', format: 'Head-to-Head',     metric: '6 metrics',      accent: '#22d3ee', interactions: 61230,  remixes: 1502, reach: 940000 },
  { handle: '@u17.daily',     format: 'Wonderkid Countdown', metric: 'by goals',    accent: '#ef4444', interactions: 44900,  remixes: 980,  reach: 720000 },
];

const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : `${n}`;

// Count-up so the board feels live when it opens.
function useCountUp(target: number, ms = 900) {
  const [v, setV] = useState(target);   // seed to target so a static frame is never blank
  useEffect(() => {
    let raf = 0; const start = performance.now();
    setV(0);
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function StatPill({ icon: Icon, value, label }: { icon: typeof Heart; value: number; label: string }) {
  const v = useCountUp(value);
  return (
    <div className="flex items-center gap-1.5 min-w-[92px]">
      <Icon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
      <div className="leading-none">
        <div className="text-sm font-black text-white tabular-nums">{fmt(v)}</div>
        <div className="text-[9px] uppercase tracking-widest text-zinc-600">{label}</div>
      </div>
    </div>
  );
}

/** The board itself (FIFA account header + ribbon + rows) — embeddable on the
 *  Dashboard landing page as well as the standalone Leaderboard view. */
export function LeaderboardBoard() {
  const totalReach = SEED.reduce((s, r) => s + r.reach, 0);
  const totalRemix = SEED.reduce((s, r) => s + r.remixes, 0);

  return (
    <div className="space-y-6">
      {/* FIFA TikTok account header */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center border border-white/15">
            <span className="text-white font-black italic text-lg tracking-wide">FIFA</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-white font-black">@fifawwc</span>
              <BadgeCheck className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-xs text-zinc-500">14.2M followers · Official FIFA Women's football</div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/25">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] font-bold text-red-300 uppercase tracking-widest">Live</span>
          </div>
        </div>
      </div>

      {/* Aggregate ribbon — the "recurring reach" story */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Eye, label: 'Sponsor impressions', value: totalReach, tint: 'text-emerald-400' },
          { icon: Repeat2, label: 'Total remixes', value: totalRemix, tint: 'text-cyan-400' },
          { icon: Flame, label: 'Active formats', value: SEED.length, tint: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <s.icon className={`w-4 h-4 ${s.tint} mb-2`} />
            <div className="text-2xl font-black text-white tabular-nums">{fmt(s.value)}</div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-600 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Leaderboard rows */}
      <div className="space-y-2.5">
        {SEED.map((r, i) => (
          <div key={r.handle}
            className={`flex items-center gap-4 rounded-2xl border p-4 transition-all ${i === 0 ? 'border-yellow-500/40 bg-gradient-to-r from-yellow-500/[0.08] to-transparent' : 'border-white/8 bg-white/[0.02]'}`}>
            <div className={`w-9 text-center text-2xl font-black tabular-nums ${i === 0 ? 'text-yellow-400' : i < 3 ? 'text-white' : 'text-zinc-600'}`}>{i + 1}</div>
            <div className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center font-black text-white" style={{ background: `linear-gradient(150deg, ${r.accent}, ${r.accent}66)` }}>
              {r.format[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white truncate">{r.handle}</span>
                {r.pick && <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/15 text-[9px] font-bold text-sky-300 uppercase tracking-wider"><BadgeCheck className="w-2.5 h-2.5" /> FIFA Pick</span>}
              </div>
              <div className="text-[11px] text-zinc-500 truncate">{r.format} · <span className="text-zinc-600">{r.metric}</span></div>
            </div>
            <div className="flex items-center gap-3 sm:gap-5">
              <StatPill icon={Heart} value={r.interactions} label="likes" />
              <StatPill icon={Repeat2} value={r.remixes} label="remixes" />
              <StatPill icon={Eye} value={r.reach} label="reach" />
            </div>
            <TrendingUp className="hidden sm:block w-4 h-4 text-emerald-400/70 shrink-0" />
          </div>
        ))}
      </div>

      <p className="text-[11px] text-zinc-600 leading-relaxed">
        Every card is a fan's opinion, built on FIFA match data — and a Lenovo + FIFA billboard that travels through each remix. The leaderboard turns one-off posts into a recurring, measurable reach engine.
      </p>
    </div>
  );
}

/** Standalone Leaderboard view (?view=leaderboard). */
export default function FifaLeaderboard() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20"><Trophy className="w-5 h-5 text-yellow-400" /></div>
        <div>
          <h1 className="text-xl font-black text-white">Creator Leaderboard</h1>
          <p className="text-xs text-zinc-500">Fan-made cards ranked by the engagement they drive on TikTok — every one carrying <span className="text-red-400/80 font-semibold">Lenovo</span> + <span className="text-white/70 font-semibold">FIFA</span>.</p>
        </div>
      </div>
      <LeaderboardBoard />
    </div>
  );
}
