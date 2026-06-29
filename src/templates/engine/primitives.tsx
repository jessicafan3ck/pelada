/**
 * Primitive atoms — the fixed component set every template (seed or creator-authored)
 * is built from. Adding an atom here expands the whole catalog at once.
 *
 * Each primitive receives already-resolved props (the renderer substitutes
 * BindingRefs before mount) plus `accent`. Coordinates are absolute px on the
 * 1080×1920 canvas; the renderer positions the wrapper, primitives fill it.
 */
import React from 'react';
import type { Formation } from '../spec';
import { METRIC_LABELS, type PlayerRecord, type RankEntry, type MetricInfo } from './resolver';

interface BaseProps { accent: string; [k: string]: unknown; }

// ── Text atoms ────────────────────────────────────────────────────────────────
export function Headline({ text, accent }: BaseProps & { text?: string }) {
  return <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: '-0.02em', textTransform: 'uppercase', color: '#fff', textAlign: 'center', lineHeight: 1, textShadow: `0 4px 24px ${accent}66` }}>{text}</div>;
}
export function Subhead({ text }: BaseProps & { text?: string }) {
  return <div style={{ fontSize: 34, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>{text}</div>;
}
export function Caption({ text }: BaseProps & { text?: string }) {
  return <div style={{ fontSize: 26, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>{text}</div>;
}

// ── Stat atoms ────────────────────────────────────────────────────────────────
export function StatChip({ label, value, accent }: BaseProps & { label?: string; value?: number | string }) {
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.06)', border: `1px solid ${accent}55`, borderRadius: 18, padding: '10px 18px' }}>
      <span style={{ fontSize: 44, fontWeight: 900, color: accent }}>{value}</span>
      <span style={{ fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.55)' }}>{label}</span>
    </div>
  );
}
export function HeroStat({ value, label, entry, metric, accent }: BaseProps & { value?: number | string; label?: string; entry?: RankEntry; metric?: MetricInfo }) {
  const v = entry ? entry.value : value;
  const l = metric?.label ?? label;
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 240, fontWeight: 900, lineHeight: 0.85, color: accent, textShadow: `0 8px 40px ${accent}88` }}>{v}</div>
      <div style={{ fontSize: 40, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fff', marginTop: 8 }}>{l}</div>
      {entry && <div style={{ fontSize: 34, fontWeight: 700, color: 'rgba(255,255,255,0.65)', marginTop: 20 }}>{entry.player_name} · {entry.team}</div>}
    </div>
  );
}

// ── Ranking row (Wonderkid Countdown) ─────────────────────────────────────────
export function RankRow({ rank, player, metric, accent }: BaseProps & { rank?: number; player?: RankEntry; metric?: MetricInfo }) {
  if (!player) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 28, width: '100%', height: '100%' }}>
      <div style={{ fontSize: 200, fontWeight: 900, color: accent, width: 240, textAlign: 'center', lineHeight: 0.9 }}>#{rank ?? player.rank}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 60, fontWeight: 900, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.player_name}</div>
        <div style={{ fontSize: 32, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{player.team}</div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ fontSize: 72, fontWeight: 900, color: accent }}>{player.value}</span>
          <span style={{ fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>{metric?.label ?? ''}</span>
        </div>
      </div>
    </div>
  );
}

// ── Formation pitch (Build Your XI) ───────────────────────────────────────────
const FORMATIONS: Record<Formation, Array<[number, number]>> = {
  '4-3-3': [[0.5, 0.93], [0.18, 0.74], [0.39, 0.78], [0.61, 0.78], [0.82, 0.74], [0.3, 0.52], [0.5, 0.55], [0.7, 0.52], [0.2, 0.26], [0.5, 0.22], [0.8, 0.26]],
  '4-4-2': [[0.5, 0.93], [0.18, 0.74], [0.39, 0.78], [0.61, 0.78], [0.82, 0.74], [0.18, 0.5], [0.39, 0.52], [0.61, 0.52], [0.82, 0.5], [0.38, 0.24], [0.62, 0.24]],
  '3-5-2': [[0.5, 0.93], [0.3, 0.78], [0.5, 0.8], [0.7, 0.78], [0.14, 0.54], [0.34, 0.55], [0.5, 0.5], [0.66, 0.55], [0.86, 0.54], [0.38, 0.24], [0.62, 0.24]],
  '4-2-3-1': [[0.5, 0.93], [0.18, 0.76], [0.39, 0.79], [0.61, 0.79], [0.82, 0.76], [0.38, 0.58], [0.62, 0.58], [0.22, 0.38], [0.5, 0.36], [0.78, 0.38], [0.5, 0.18]],
  '3-4-3': [[0.5, 0.93], [0.3, 0.78], [0.5, 0.8], [0.7, 0.78], [0.16, 0.54], [0.4, 0.55], [0.6, 0.55], [0.84, 0.54], [0.22, 0.26], [0.5, 0.22], [0.78, 0.26]],
}; // eslint-disable-line

export function Pitch({ lineup, metric, accent, formation = '4-3-3' }: BaseProps & { lineup?: PlayerRecord[]; metric?: MetricInfo; formation?: Formation }) {
  const coords = FORMATIONS[formation] ?? FORMATIONS['4-3-3'];
  const players = lineup ?? [];
  const mkey = metric?.key ?? 'goals';
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 28, overflow: 'hidden', background: 'linear-gradient(180deg,#0a3d1f,#072a16)', border: '2px solid rgba(255,255,255,0.12)' }}>
      {/* pitch markings */}
      <svg viewBox="0 0 100 150" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.35 }}>
        <rect x="2" y="2" width="96" height="146" fill="none" stroke="#fff" strokeWidth="0.4" />
        <line x1="2" y1="75" x2="98" y2="75" stroke="#fff" strokeWidth="0.4" />
        <circle cx="50" cy="75" r="11" fill="none" stroke="#fff" strokeWidth="0.4" />
        <rect x="28" y="2" width="44" height="20" fill="none" stroke="#fff" strokeWidth="0.4" />
        <rect x="28" y="128" width="44" height="20" fill="none" stroke="#fff" strokeWidth="0.4" />
      </svg>
      {coords.map(([cx, cy], i) => {
        const p = players[i];
        return (
          <div key={i} style={{ position: 'absolute', left: `${cx * 100}%`, top: `${cy * 100}%`, transform: 'translate(-50%,-50%)', textAlign: 'center', width: 150 }}>
            <div style={{ width: 76, height: 76, borderRadius: '50%', margin: '0 auto', background: p ? accent : 'rgba(255,255,255,0.12)', border: '3px solid rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 30, color: '#fff' }}>
              {p?.shirt_number ?? '+'}
            </div>
            {p && <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lastName(p.player_name)}</div>}
            {p && <div style={{ fontSize: 24, fontWeight: 900, color: accent }}>{p[mkey] as number} <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{METRIC_LABELS[mkey].split(' ')[0]}</span></div>}
          </div>
        );
      })}
    </div>
  );
}

function lastName(n: string) { const parts = n.split(' '); return parts[parts.length - 1]; }

// ── Misc atoms ────────────────────────────────────────────────────────────────
export function PlayerPhoto({ player, accent }: BaseProps & { player?: PlayerRecord }) {
  return <div style={{ width: '100%', height: '100%', borderRadius: 24, background: `radial-gradient(circle at 50% 30%, ${accent}44, rgba(255,255,255,0.05))`, border: `2px solid ${accent}66`, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16, fontSize: 28, fontWeight: 800, color: '#fff' }}>{player?.player_name}</div>;
}
export function Crest({ accent }: BaseProps) { return <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: accent }} />; }
export function Divider({ accent }: BaseProps) { return <div style={{ width: '100%', height: 4, background: accent, borderRadius: 2 }} />; }
export function Spacer() { return <div />; }

// Stubs to keep the type surface complete (fleshed out as their templates ship).
export function StatBar({ label, value, accent }: BaseProps & { label?: string; value?: number }) {
  return <div style={{ width: '100%' }}><div style={{ fontSize: 24, color: '#fff', marginBottom: 6 }}>{label}: {value}</div><div style={{ height: 16, background: accent, borderRadius: 8, width: `${Math.min(100, Number(value))}%` }} /></div>;
}
export function Radar({ comparison, accent }: BaseProps & { comparison?: { players: PlayerRecord[]; metrics: string[] } }) {
  const players = (comparison?.players ?? []).slice(0, 2);
  const metrics = comparison?.metrics ?? [];
  const COLORS = [accent, '#fbbf24'];
  const N = Math.max(metrics.length, 1);
  const cx = 200, cy = 190, R = 140;
  const ang = (i: number) => (Math.PI * 2 * i) / N - Math.PI / 2;
  const pt = (i: number, f: number): [number, number] => [cx + Math.cos(ang(i)) * R * f, cy + Math.sin(ang(i)) * R * f];
  const maxes = metrics.map(m => Math.max(1, ...players.map(p => Number(p[m] ?? 0))));

  return (
    <svg viewBox="0 0 400 470" width="100%" height="100%">
      {[0.25, 0.5, 0.75, 1].map(f => (
        <polygon key={f} points={metrics.map((_, i) => pt(i, f).join(',')).join(' ')} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      ))}
      {metrics.map((m, i) => {
        const [x, y] = pt(i, 1);
        const [lx, ly] = pt(i, 1.2);
        return (
          <g key={m}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.12)" />
            <text x={lx} y={ly} fill="rgba(255,255,255,0.65)" fontSize="14" fontWeight="700" textAnchor="middle" dominantBaseline="middle">{METRIC_LABELS[m]?.split(' ')[0] ?? m}</text>
          </g>
        );
      })}
      {players.map((p, pi) => (
        <polygon key={pi}
          points={metrics.map((m, i) => pt(i, Number(p[m] ?? 0) / maxes[i]).join(',')).join(' ')}
          fill={`${COLORS[pi]}33`} stroke={COLORS[pi]} strokeWidth="3" strokeLinejoin="round" />
      ))}
      {players.map((p, pi) => (
        <g key={'lg' + pi}>
          <circle cx={28} cy={420 + pi * 30} r={8} fill={COLORS[pi]} />
          <text x={46} y={420 + pi * 30} fill="#fff" fontSize="22" fontWeight="800" dominantBaseline="middle">{p.player_name} <tspan fill="rgba(255,255,255,0.5)" fontSize="16">· {p.team}</tspan></text>
        </g>
      ))}
    </svg>
  );
}
const TIERS: { key: string; color: string; lo: number; hi: number }[] = [
  { key: 'S', color: '#ef4444', lo: 1, hi: 2 },
  { key: 'A', color: '#f59e0b', lo: 3, hi: 5 },
  { key: 'B', color: '#10b981', lo: 6, hi: 9 },
  { key: 'C', color: '#3b82f6', lo: 10, hi: 13 },
  { key: 'D', color: '#a855f7', lo: 14, hi: 999 },
];

export function TierGrid({ entries }: BaseProps & { entries?: RankEntry[]; metric?: MetricInfo }) {
  const list = entries ?? [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', height: '100%' }}>
      {TIERS.map(t => {
        const members = list.filter(e => e.rank >= t.lo && e.rank <= t.hi);
        return (
          <div key={t.key} style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>
            <div style={{ width: 96, background: t.color, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, fontWeight: 900, color: '#000', flexShrink: 0 }}>{t.key}</div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, display: 'flex', flexWrap: 'wrap', gap: 8, alignContent: 'center', padding: '8px 14px' }}>
              {members.map(e => (
                <div key={e.player_id} style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${t.color}66`, borderRadius: 10, padding: '6px 12px', fontSize: 24, fontWeight: 700, color: '#fff' }}>
                  {lastName(e.player_name)} <span style={{ color: t.color, fontWeight: 900 }}>{e.value}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const PRIMITIVES: Record<string, React.ComponentType<BaseProps & Record<string, unknown>>> = {
  headline: Headline, subhead: Subhead, caption: Caption,
  statChip: StatChip, statBar: StatBar, heroStat: HeroStat,
  radar: Radar, pitch: Pitch, tierGrid: TierGrid, rankRow: RankRow,
  playerPhoto: PlayerPhoto, crest: Crest, divider: Divider, spacer: Spacer,
};
