/**
 * Worked examples — the two launch templates expressed as specs.
 *
 * These exist to PROVE the spec schema in spec.ts actually holds. If both seed
 * templates serialize cleanly as data (no escape hatches, no inline code), the
 * schema is sound and the engine + Studio can be built against it.
 */
import type { Template, Scene } from './spec';

// ─────────────────────────────────────────────────────────────────────────────
// 1. BUILD YOUR XI — selection format (single animated scene, formation pitch)
//    Creator picks 11 players + a stat axis; each slot shows the player + that stat.
// ─────────────────────────────────────────────────────────────────────────────

export const BUILD_YOUR_XI: Template = {
  id: 'build-your-xi',
  version: 1,
  meta: {
    name: 'Build Your XI',
    tagline: 'Pick your U17 World Cup best XI — backed by real FIFA numbers.',
    category: 'selection',
    authorId: 'pelada',
  },
  canvas: { aspect: '9:16', width: 1080, height: 1920 },
  style: {
    accent: { fixed: '#F59E0B' },              // a neutral default; creators can re-accent
    background: { kind: 'mesh' },
    footer: { show: true },
  },
  bindings: {
    title: { kind: 'text', label: 'Title', default: 'MY U17 BEST XI', maxLength: 24 },
    lineup: {
      kind: 'lineup',
      label: 'Pick your 11',
      formation: '4-3-3',
      required: true,
    },
    metric: {
      kind: 'metric',
      label: 'Show stat',
      options: ['line_breaks', 'pressings', 'passes_complete', 'goals'],
      default: 'line_breaks',
    },
  },
  scenes: [
    {
      id: 'pitch',
      durationMs: 0,                            // static card (PNG-exportable MVP)
      transition: 'fade',
      components: [
        {
          id: 'title',
          type: 'headline',
          layout: { x: 0.06, y: 0.05, w: 0.88, h: 0.08, align: 'center' },
          data: { text: { binding: 'title' } },
          anim: { style: 'fade-in' },
        },
        {
          id: 'pitch',
          type: 'pitch',
          layout: { x: 0.04, y: 0.15, w: 0.92, h: 0.74 },
          // The pitch primitive reads the lineup binding and, for each slot,
          // shows the player's photo/name plus the chosen metric value.
          data: {
            lineup: { binding: 'lineup' },
            metric: { binding: 'metric' },
          },
          anim: { style: 'stagger', delayMs: 80 },
        },
      ],
    },
  ],
  remix: {
    remixSlots: ['lineup', 'metric'],
    captionTemplate: 'My U17 World Cup XI 🔥 who you got? {{credit}} {{hashtag}}',
    publishable: true,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. WONDERKID COUNTDOWN — ranking format (the signature; #5→#1 reveal sequence)
//    Auto-ranks U17 players by a metric from the precomputed leaderboard.
//    This is the data-backed version of Goal's editorial NXGN — nobody else can.
// ─────────────────────────────────────────────────────────────────────────────

export const WONDERKID_COUNTDOWN: Template = {
  id: 'wonderkid-countdown',
  version: 1,
  meta: {
    name: 'Wonderkid Countdown',
    tagline: 'The top 5 at the U17 World Cup — ranked by the data, not vibes.',
    category: 'ranking',
    authorId: 'pelada',
  },
  canvas: { aspect: '9:16', width: 1080, height: 1920 },
  style: {
    accent: { fixed: '#009C3B' },
    background: { kind: 'mesh' },
    footer: { show: true },
  },
  bindings: {
    title: { kind: 'text', label: 'Title', default: 'TOP 5 WONDERKIDS', maxLength: 24 },
    metric: {
      kind: 'metric',
      label: 'Rank by',
      options: ['line_breaks', 'pressings', 'goals', 'ball_progressions', 'shots'],
      default: 'line_breaks',
    },
    ranking: {
      kind: 'leaderboard',
      label: 'Leaderboard',
      metric: { fromBinding: 'metric' },        // toggling the metric re-ranks instantly
      scope: 'tournament',
      order: 'desc',
      limit: 5,
    },
  },
  // Five reveal scenes, #5 → #1. Each scene renders one leaderboard entry by index.
  // (In Studio these are generated from `limit`; written out here to show the shape.)
  scenes: [5, 4, 3, 2, 1].map((rank, i): Scene => ({
    id: `rank-${rank}`,
    durationMs: 1600,
    transition: i === 0 ? 'fade' : 'slide-up',
    components: [
      {
        id: `title-${rank}`,
        type: 'headline',
        layout: { x: 0.06, y: 0.06, w: 0.88, h: 0.07, align: 'center' },
        data: { text: { binding: 'title' } },
      },
      {
        id: `row-${rank}`,
        type: 'rankRow',
        layout: { x: 0.06, y: 0.4, w: 0.88, h: 0.3 },
        props: { rank },
        // index into the resolved leaderboard list: #5 = index 4 ... #1 = index 0
        data: {
          player: { binding: 'ranking', index: rank - 1 },
          metric: { binding: 'metric' },
        },
        anim: { style: 'count-up', delayMs: 200 },
      },
    ],
  })),
  remix: {
    remixSlots: ['metric'],
    captionTemplate: 'Top 5 U17 wonderkids by the DATA 👀 {{credit}} {{hashtag}}',
    publishable: true,
  },
};

export const SEED_TEMPLATES: Template[] = [BUILD_YOUR_XI, WONDERKID_COUNTDOWN];
