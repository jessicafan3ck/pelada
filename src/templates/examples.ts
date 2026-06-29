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

// ─────────────────────────────────────────────────────────────────────────────
// 3. PLAYER TIER LIST — ranking format (S/A/B/C/D, the most-validated viral shape)
//    Auto-tiers the top players by a metric from the precomputed leaderboard.
// ─────────────────────────────────────────────────────────────────────────────

export const TIER_LIST: Template = {
  id: 'tier-list',
  version: 1,
  meta: {
    name: 'Player Tier List',
    tagline: 'Rank the U17 standouts S–A–B–C–D — backed by the data, not vibes.',
    category: 'ranking',
    authorId: 'pelada',
  },
  canvas: { aspect: '9:16', width: 1080, height: 1920 },
  style: { accent: { fixed: '#3b82f6' }, background: { kind: 'mesh' }, footer: { show: true } },
  bindings: {
    title: { kind: 'text', label: 'Title', default: 'U17 TIER LIST', maxLength: 24 },
    metric: {
      kind: 'metric',
      label: 'Tier by',
      options: ['line_breaks', 'pressings', 'goals', 'ball_progressions'],
      default: 'line_breaks',
    },
    ranking: {
      kind: 'leaderboard',
      label: 'Players',
      metric: { fromBinding: 'metric' },
      scope: 'tournament',
      order: 'desc',
      limit: 14,
    },
  },
  scenes: [
    {
      id: 'grid',
      durationMs: 0,
      transition: 'fade',
      components: [
        { id: 'title', type: 'headline', layout: { x: 0.06, y: 0.05, w: 0.88, h: 0.08, align: 'center' }, data: { text: { binding: 'title' } } },
        { id: 'tiers', type: 'tierGrid', layout: { x: 0.05, y: 0.16, w: 0.9, h: 0.72 }, data: { entries: { binding: 'ranking' }, metric: { binding: 'metric' } } },
      ],
    },
  ],
  remix: {
    remixSlots: ['metric'],
    captionTemplate: 'My U17 tier list 🔥 agree or fight me? {{credit}} {{hashtag}}',
    publishable: true,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. STAT DROP — reveal format (one jaw-dropping number, scroll-stopper)
//    The tournament leader in the chosen metric, shown as a giant stat.
// ─────────────────────────────────────────────────────────────────────────────

export const STAT_DROP: Template = {
  id: 'stat-drop',
  version: 1,
  meta: {
    name: 'Stat Drop',
    tagline: 'One jaw-dropping U17 number — the kind that stops the scroll.',
    category: 'reveal',
    authorId: 'pelada',
  },
  canvas: { aspect: '9:16', width: 1080, height: 1920 },
  style: { accent: { fixed: '#a855f7' }, background: { kind: 'mesh' }, footer: { show: true } },
  bindings: {
    title: { kind: 'text', label: 'Hook', default: 'NOBODY IS TALKING ABOUT THIS', maxLength: 30 },
    metric: {
      kind: 'metric',
      label: 'Stat',
      options: ['pressings', 'line_breaks', 'goals', 'ball_progressions', 'tackles'],
      default: 'pressings',
    },
    ranking: {
      kind: 'leaderboard',
      label: 'Leader',
      metric: { fromBinding: 'metric' },
      scope: 'tournament',
      order: 'desc',
      limit: 1,
    },
  },
  scenes: [
    {
      id: 'card',
      durationMs: 0,
      transition: 'pop',
      components: [
        { id: 'hook', type: 'headline', layout: { x: 0.06, y: 0.1, w: 0.88, h: 0.12, align: 'center' }, data: { text: { binding: 'title' } }, anim: { style: 'fade-in' } },
        { id: 'hero', type: 'heroStat', layout: { x: 0.06, y: 0.34, w: 0.88, h: 0.4 }, data: { entry: { binding: 'ranking', index: 0 }, metric: { binding: 'metric' } }, anim: { style: 'count-up' } },
        { id: 'sub', type: 'subhead', layout: { x: 0.06, y: 0.78, w: 0.88, h: 0.06, align: 'center' }, props: { text: "FIFA U17 Women's World Cup" } },
      ],
    },
  ],
  remix: {
    remixSlots: ['metric'],
    captionTemplate: 'U17 stat drop 🤯 did you know? {{credit}} {{hashtag}}',
    publishable: true,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. HEAD-TO-HEAD — comparison format (Messi-vs-Ronaldo radar, data-backed)
//    Two players compared across our exclusive U17 metrics on a radar.
// ─────────────────────────────────────────────────────────────────────────────

export const HEAD_TO_HEAD: Template = {
  id: 'head-to-head',
  version: 1,
  meta: {
    name: 'Head-to-Head',
    tagline: 'Two U17 stars, one radar — settle the debate with the data.',
    category: 'comparison',
    authorId: 'pelada',
  },
  canvas: { aspect: '9:16', width: 1080, height: 1920 },
  style: { accent: { fixed: '#22d3ee' }, background: { kind: 'mesh' }, footer: { show: true } },
  bindings: {
    title: { kind: 'text', label: 'Title', default: 'WHO YA GOT?', maxLength: 24 },
    playerA: { kind: 'player', label: 'Player A' },
    playerB: { kind: 'player', label: 'Player B' },
    compare: {
      kind: 'comparison',
      label: 'Compare',
      players: [{ fromBinding: 'playerA' }, { fromBinding: 'playerB' }],
      metrics: ['goals', 'line_breaks', 'pressings', 'passes_complete', 'ball_progressions', 'tackles'],
    },
  },
  scenes: [
    {
      id: 'radar',
      durationMs: 0,
      transition: 'fade',
      components: [
        { id: 'title', type: 'headline', layout: { x: 0.06, y: 0.06, w: 0.88, h: 0.08, align: 'center' }, data: { text: { binding: 'title' } } },
        { id: 'radar', type: 'radar', layout: { x: 0.04, y: 0.18, w: 0.92, h: 0.68 }, data: { comparison: { binding: 'compare' } } },
      ],
    },
  ],
  remix: {
    remixSlots: ['playerA', 'playerB'],
    captionTemplate: 'U17 head-to-head 🔥 who ya got? {{credit}} {{hashtag}}',
    publishable: true,
  },
};

export const SEED_TEMPLATES: Template[] = [BUILD_YOUR_XI, WONDERKID_COUNTDOWN, TIER_LIST, STAT_DROP, HEAD_TO_HEAD];
