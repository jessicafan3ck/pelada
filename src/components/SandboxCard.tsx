/**
 * SandboxCard — renders a freeform sandbox widget INLINE (bundled React +
 * Recharts + window.Babel, same as EmbedPlayer) inside a branded 9:16 frame.
 *
 * Rendering inline (not in an iframe) is what makes the sandbox output
 * exportable: html-to-image / the video recorder can capture it, so a sandbox
 * widget gets the same Save Photo / Save Video / TikTok path as a card.
 */
import React, { useMemo } from 'react';
import * as Recharts from 'recharts';
import { SponsorLockup, ClaimsDisclaimer } from '../templates/engine/branding';
import { stripFences } from './ReactRunner';

const RECHARTS_KEYS = [
  'BarChart', 'Bar', 'LineChart', 'Line', 'AreaChart', 'Area',
  'PieChart', 'Pie', 'Cell', 'XAxis', 'YAxis', 'CartesianGrid',
  'Tooltip', 'Legend', 'ResponsiveContainer',
  'RadarChart', 'Radar', 'PolarGrid', 'PolarAngleAxis', 'ScatterChart', 'Scatter',
] as const;

function compile(code: string): React.ComponentType | null {
  try {
    const Babel = (window as unknown as { Babel?: { transform: (c: string, o: object) => { code: string } } }).Babel;
    if (!Babel) return null;
    const { code: transformed } = Babel.transform(stripFences(code), {
      // classic runtime → plain React.createElement, no `import react/jsx-runtime`
      // (an import would throw "outside a module" inside `new Function`).
      presets: [['react', { runtime: 'classic' }], 'typescript'],
      sourceType: 'script', filename: 'widget.tsx',
    });
    const rechartsVals = RECHARTS_KEYS.map(k => (Recharts as Record<string, unknown>)[k]);
    const fn = new Function(
      'React', 'useState', 'useEffect', 'useMemo', 'useRef', 'useCallback', 'useReducer',
      ...RECHARTS_KEYS,
      transformed + '\nreturn typeof Widget !== "undefined" ? Widget : null;',
    );
    return fn(
      React, React.useState, React.useEffect, React.useMemo, React.useRef, React.useCallback, React.useReducer,
      ...rechartsVals,
    ) as React.ComponentType | null;
  } catch {
    return null;
  }
}

/** Just the widget, rendered inline. Used for the live preview. */
export function SandboxWidget({ code }: { code: string }) {
  const W = useMemo(() => compile(code), [code]);
  if (!W) return <div style={{ color: '#f87171', fontSize: 14, padding: 24, textAlign: 'center' }}>Couldn't render this widget — try regenerating.</div>;
  try { return <W />; } catch { return <div style={{ color: '#f87171', fontSize: 14 }}>Widget error.</div>; }
}

/** The full-res 1080×1920 branded frame the exporter captures. */
export function SandboxCard({ code, title, creatorHandle = '@you', accent = '#E8197D' }: { code: string; title: string; creatorHandle?: string; accent?: string }) {
  return (
    <div style={{ position: 'relative', width: 1080, height: 1920, overflow: 'hidden', background: '#050505', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* mesh */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '60%', height: '40%', background: `${accent}33`, filter: 'blur(120px)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: '-5%', right: '-10%', width: '55%', height: '38%', background: `${accent}22`, filter: 'blur(120px)', borderRadius: '50%' }} />

      {/* sponsor */}
      <div style={{ position: 'absolute', top: 40, right: 40 }}><SponsorLockup h={40} /></div>

      {/* title */}
      <div style={{ position: 'absolute', top: 150, left: 64, right: 64 }}>
        <div style={{ fontSize: 60, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1, textShadow: `0 4px 24px ${accent}66` }}>{title || 'U17 INSIGHT'}</div>
        <div style={{ marginTop: 12, fontSize: 24, fontWeight: 700, color: accent, letterSpacing: '0.02em' }}>FIFA U17 Women's World Cup · real data</div>
      </div>

      {/* widget panel */}
      <div style={{ position: 'absolute', top: 340, left: 56, right: 56, bottom: 320, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 36, padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%' }}><SandboxWidget code={code} /></div>
      </div>

      {/* footer */}
      <div style={{ position: 'absolute', bottom: 76, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <svg viewBox="0 0 32 32" width={40} height={40} aria-hidden>
          <rect width="32" height="32" rx="8" fill="#000" />
          <polyline points="4,9 9,15 16,9 23,15 28,9" stroke="#F59E0B" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" fill="none" />
          <polyline points="4,24 9,18 16,24 23,18 28,24" stroke="#009C3B" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" fill="none" />
        </svg>
        <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: '0.04em', color: '#fff', textTransform: 'uppercase' }}>PELADA</span>
        <span style={{ fontSize: 22, fontWeight: 700, color: accent }}>· {creatorHandle}</span>
      </div>
      <ClaimsDisclaimer />
    </div>
  );
}
