/**
 * Sponsor co-brand lockup — the whole ROI of the creator flywheel.
 *
 * Every card a fan builds and shares is a Lenovo + FIFA billboard that travels
 * into their followers' feeds for free, and rides along through every remix.
 * So the lockup is rendered by the ENGINE (like the Pelada footer), never as a
 * deletable component — a creator can't strip the sponsors out.
 *
 * NOTE: these are PLACEHOLDER wordmarks so the layout is real and swap-ready.
 * Drop the official Lenovo / FIFA SVG (or PNG data-URI) assets in at the marked
 * spots to ship for real.
 */
import React from 'react';

function LenovoMark({ h = 40 }: { h?: number }) {
  // ── swap for official Lenovo logo ──
  return (
    <div
      style={{
        height: h,
        display: 'flex',
        alignItems: 'center',
        padding: `0 ${h * 0.34}px`,
        background: '#E2231A',
        borderRadius: h * 0.18,
        fontWeight: 800,
        fontSize: h * 0.52,
        letterSpacing: '0.01em',
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      Lenovo
    </div>
  );
}

function FifaMark({ h = 40 }: { h?: number }) {
  // ── swap for official FIFA logo ──
  return (
    <div
      style={{
        height: h,
        display: 'flex',
        alignItems: 'center',
        fontWeight: 900,
        fontSize: h * 0.62,
        letterSpacing: '0.06em',
        color: '#fff',
        fontStyle: 'italic',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      FIFA
    </div>
  );
}

/**
 * Locked claims disclaimer — rendered by the ENGINE onto every card as pixels,
 * so it survives screen-records and re-shares (a caption-only line would not).
 *
 * This is the guarantee FIFA/Lenovo require: the brands supply match data and the
 * creation tool only; every opinion or ranking is the fan's own. Bilingual so it
 * reads for both the global audience and the domestic (中文) one.
 */
export function ClaimsDisclaimer() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        left: 0,
        right: 0,
        textAlign: 'center',
        lineHeight: 1.35,
        padding: '0 40px',
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.01em' }}>
        Match data &amp; tools by FIFA · Lenovo. All opinions are the fan creator&apos;s own.
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.34)' }}>
        比赛数据与制作工具由 FIFA · 联想提供，所有观点均为创作者个人意见。
      </div>
    </div>
  );
}

/**
 * The locked sponsor lockup. Position it with the caller's wrapper.
 * `h` scales the whole lockup so it reads on both the full-res card and preview.
 */
export function SponsorLockup({ h = 40, label = true }: { h?: number; label?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: h * 0.4,
        padding: `${h * 0.32}px ${h * 0.46}px`,
        background: 'rgba(0,0,0,0.42)',
        border: '1px solid rgba(255,255,255,0.16)',
        borderRadius: h * 0.5,
        backdropFilter: 'blur(6px)',
      }}
    >
      {label && (
        <span
          style={{
            fontSize: h * 0.3,
            fontWeight: 800,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          Presented&nbsp;by
        </span>
      )}
      <LenovoMark h={h} />
      <span style={{ width: 1, height: h * 0.7, background: 'rgba(255,255,255,0.22)' }} />
      <FifaMark h={h} />
    </div>
  );
}
