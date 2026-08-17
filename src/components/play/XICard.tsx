/**
 * XICard — the 9:16 artifact for the interactive "Choose My U17 XI" format.
 *
 * One render target used three ways: the live preview while the end-user taps
 * through picks, the build-reel replay (via `revealCount`), and the offscreen
 * full-res node the exporter/sharer captures. Always renders at 1080×1920; the
 * parent scales it down for on-screen display.
 *
 * `greenScreen` re-lays-out for TikTok's Green Screen effect: solid chroma
 * background + all content pushed into the top ~64% so the lower third stays
 * clear for the creator's body when they film in front of it.
 */
import React from 'react';
import type { PlayerRecord } from '../../templates/engine/resolver';
import { SponsorLockup } from '../../templates/engine/branding';

export const FORMATION_433: Array<[number, number]> = [
  [0.5, 0.93], [0.18, 0.74], [0.39, 0.78], [0.61, 0.78], [0.82, 0.74],
  [0.3, 0.52], [0.5, 0.55], [0.7, 0.52], [0.2, 0.26], [0.5, 0.22], [0.8, 0.26],
];
export const LABELS_433 = ['GK', 'RB', 'RCB', 'LCB', 'LB', 'CM', 'CM', 'CM', 'LW', 'ST', 'RW'];

const CHROMA = '#00B140';
const last = (n: string) => n.split(' ').slice(-1)[0];

interface Props {
  picks: (PlayerRecord | null)[];
  title: string;
  handle: string;
  accent?: string;
  greenScreen?: boolean;
  /** How many slots (in pick order) to reveal — for the build-reel replay. Default: all. */
  revealCount?: number;
  /** Slot currently being picked — pulses in the editor. -1 = none. */
  activeSlot?: number;
  /** Editor-only overlays (stand-here guide) — flagged data-no-export so they never render into the file. */
  editor?: boolean;
}

function Pitch({ picks, accent, revealCount, activeSlot }: Required<Pick<Props, 'picks' | 'accent'>> & { revealCount: number; activeSlot: number }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 36, overflow: 'hidden', background: 'linear-gradient(180deg,#0a3d1f,#062715)', border: '2px solid rgba(255,255,255,0.14)' }}>
      <svg viewBox="0 0 100 150" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.32 }}>
        <rect x="2" y="2" width="96" height="146" fill="none" stroke="#fff" strokeWidth="0.4" />
        <line x1="2" y1="75" x2="98" y2="75" stroke="#fff" strokeWidth="0.4" />
        <circle cx="50" cy="75" r="11" fill="none" stroke="#fff" strokeWidth="0.4" />
        <rect x="28" y="2" width="44" height="20" fill="none" stroke="#fff" strokeWidth="0.4" />
        <rect x="28" y="128" width="44" height="20" fill="none" stroke="#fff" strokeWidth="0.4" />
      </svg>
      {FORMATION_433.map(([cx, cy], i) => {
        const p = picks[i];
        const revealed = i < revealCount && !!p;
        const isActive = i === activeSlot;
        return (
          <div key={i} style={{ position: 'absolute', left: `${cx * 100}%`, top: `${cy * 100}%`, transform: 'translate(-50%,-50%)', textAlign: 'center', width: 168 }}>
            <div style={{
              width: 96, height: 96, borderRadius: '50%', margin: '0 auto',
              background: revealed ? accent : 'rgba(255,255,255,0.08)',
              border: isActive ? '4px solid #fff' : `4px solid rgba(255,255,255,${revealed ? 0.9 : 0.35})`,
              boxShadow: isActive ? '0 0 0 8px rgba(255,255,255,0.18)' : revealed ? `0 8px 28px ${accent}88` : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: revealed ? 40 : 30, color: '#fff',
            }}>
              {revealed ? (p!.shirt_number ?? '★') : (isActive ? '?' : LABELS_433[i])}
            </div>
            {revealed && (
              <>
                <div style={{ fontSize: 27, fontWeight: 800, color: '#fff', marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>{last(p!.player_name)}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: accent }}>{Number(p!.line_breaks ?? 0)} <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)' }}>LB</span></div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PeladaMark({ small }: { small?: boolean }) {
  const s = small ? 30 : 40;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: s * 0.35 }}>
      <svg viewBox="0 0 32 32" width={s} height={s} aria-hidden>
        <rect width="32" height="32" rx="8" fill="#000" />
        <polyline points="4,9 9,15 16,9 23,15 28,9" stroke="#F59E0B" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" fill="none" />
        <polyline points="4,24 9,18 16,24 23,18 28,24" stroke="#009C3B" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" fill="none" />
      </svg>
      <span style={{ fontSize: s * 0.6, fontWeight: 900, letterSpacing: '0.04em', color: '#fff', textTransform: 'uppercase' }}>PELADA</span>
    </div>
  );
}

export function XICard({ picks, title, handle, accent = '#F59E0B', greenScreen = false, revealCount, activeSlot = -1, editor = false }: Props) {
  const reveal = revealCount ?? picks.length;
  const filled = picks.filter(Boolean).length;

  // Pitch box + content zones differ between normal and green-screen layouts.
  const pitchBox = greenScreen
    ? { left: 96, top: 300, width: 888, height: 980 }   // upper ~64%, lower third clear
    : { left: 60, top: 250, width: 960, height: 1430 };

  return (
    <div style={{ position: 'relative', width: 1080, height: 1920, overflow: 'hidden', fontFamily: 'Inter, system-ui, sans-serif', background: greenScreen ? CHROMA : '#050f0a' }}>
      {/* background flourish (normal only) */}
      {!greenScreen && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <div style={{ position: 'absolute', top: '-8%', left: '-10%', width: '60%', height: '38%', background: `${accent}33`, filter: 'blur(120px)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: '2%', right: '-10%', width: '55%', height: '36%', background: '#009C3B22', filter: 'blur(120px)', borderRadius: '50%' }} />
        </div>
      )}

      {/* title */}
      <div style={{ position: 'absolute', top: 64, left: 60, right: 360 }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: greenScreen ? 'rgba(255,255,255,0.85)' : accent }}>My U17 XI</div>
        <div style={{ fontSize: 66, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 0.98, color: '#fff', textShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>{title || 'Build the best XI'}</div>
      </div>

      {/* sponsor lockup — locked, top-right */}
      <div style={{ position: 'absolute', top: 60, right: 48 }}>
        <SponsorLockup h={38} label={!greenScreen} />
      </div>

      {/* pitch */}
      <div style={{ position: 'absolute', ...pitchBox }}>
        <Pitch picks={picks} accent={accent} revealCount={reveal} activeSlot={activeSlot} />
      </div>

      {/* progress pips */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: greenScreen ? 1300 : 1710, display: 'flex', justifyContent: 'center', gap: 10 }}>
        {picks.map((_, i) => (
          <div key={i} style={{ width: 22, height: 8, borderRadius: 4, background: i < filled ? accent : 'rgba(255,255,255,0.22)' }} />
        ))}
      </div>

      {/* credit line + Pelada mark */}
      {greenScreen ? (
        <div style={{ position: 'absolute', top: 1360, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <PeladaMark small />
          <span style={{ fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{handle} · remix yours</span>
        </div>
      ) : (
        <div style={{ position: 'absolute', bottom: 54, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <PeladaMark />
          <span style={{ fontSize: 24, fontWeight: 700, color: accent }}>· {handle}</span>
        </div>
      )}

      {/* editor-only: "you stand here" guide for green-screen framing (never exported) */}
      {editor && greenScreen && (
        <div data-no-export="true" style={{ position: 'absolute', left: '50%', top: 1440, transform: 'translateX(-50%)', width: 360, height: 440, border: '3px dashed rgba(255,255,255,0.5)', borderRadius: '48% 48% 40% 40%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 24 }}>
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>You stand here</span>
        </div>
      )}
    </div>
  );
}
