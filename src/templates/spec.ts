/**
 * Pelada Template Spec — the keystone of the creator engine.
 *
 * A Template is DECLARATIVE DATA, not code. One rendering engine interprets any
 * spec into an animated 9:16 canvas. This is what makes templates composable,
 * forkable, remixable, deep-linkable, server-renderable (Remotion), and
 * author-able by creators — none of which is safely possible with freeform
 * generated React.
 *
 * Design principle: "constrain the atoms, free the molecules."
 *   - Atoms  = ComponentSpec primitives + StyleTokens  (Pelada-designed → brand stays intact)
 *   - Molecules = infinite arrangements of atoms        (creators compose freely)
 *   - Data   = Tier-1/2 bindings only, precomputed at ingest (never complex imports)
 *
 * Everything here must be JSON-serializable (no functions). Logic is expressed
 * declaratively so a spec can travel in a URL / be stored as a row / be forked.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. TEMPLATE — the top-level document
// ─────────────────────────────────────────────────────────────────────────────

export interface Template {
  id: string;                    // stable id (also the deep-link target: /create/:id)
  version: number;               // schema version for migration
  meta: TemplateMeta;
  canvas: Canvas;                // always 9:16 for v1
  style: StyleTokens;            // brand + per-template accent
  /** The slots a creator fills. Keyed by id; components reference these ids. */
  bindings: Record<string, Binding>;
  /** Ordered scenes. A single-scene template is a static card; multi-scene = a sequence. */
  scenes: Scene[];
  /** How this template behaves in the remix/attribution loop. */
  remix: RemixConfig;
}

export interface TemplateMeta {
  name: string;                  // "Build Your XI"
  tagline: string;               // shown on the Discover card
  category: TemplateCategory;
  /** Authorship — seed templates are authored by 'pelada'; creator templates carry a handle. */
  authorId: string;             // 'pelada' | '@handle'
  forkedFrom?: string;          // parent template id, if this is a fork (lineage)
  thumbnail?: string;
}

export type TemplateCategory =
  | 'selection'   // Build XI
  | 'ranking'     // Wonderkid Countdown, Tier List
  | 'comparison'  // Head-to-Head
  | 'reveal';     // Stat Drop / Guess the Player

export interface Canvas {
  aspect: '9:16';               // locked for v1; reserved for '1:1' later
  width: 1080;
  height: 1920;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. STYLE TOKENS — the brand layer
// ─────────────────────────────────────────────────────────────────────────────

export interface StyleTokens {
  /** Accent is usually DERIVED from a team binding (country colors) but can be overridden. */
  accent: ColorRef;             // e.g. { fromBinding: 'team', field: 'primaryColor' } | { fixed: '#F59E0B' }
  background: BackgroundSpec;
  fontFamily?: string;          // defaults to Pelada brand font
  /** The locked Pelada footer (brand mark + @credit + "remix" CTA) is rendered by the
   *  engine on every template — it is NOT a component a creator can delete. */
  footer: { show: true; creatorHandle?: ColorRef | string };
}

export type ColorRef =
  | { fixed: string }
  | { fromBinding: string; field: string };   // resolve a color from a binding's record

export interface BackgroundSpec {
  kind: 'mesh' | 'solid' | 'image';
  value?: string;               // color / image url; mesh uses accent automatically
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. BINDINGS — the data slots (Tier-1 pick-&-pull, Tier-2 auto-rank/compare)
// ─────────────────────────────────────────────────────────────────────────────

export type Binding =
  | PlayerBinding
  | TeamBinding
  | MatchBinding
  | MetricBinding
  | LineupBinding
  | LeaderboardBinding
  | ComparisonBinding
  | TextBinding;

interface BindingBase {
  label: string;                // shown to creator in the Studio data picker ("Pick a player")
  required?: boolean;
}

/** Tier-1: tap an entity → engine fetches its precomputed record + stats. */
export interface PlayerBinding extends BindingBase {
  kind: 'player';
  default?: number;             // player_id
}
export interface TeamBinding extends BindingBase {
  kind: 'team';
  default?: number;             // team_id
}
export interface MatchBinding extends BindingBase {
  kind: 'match';
  default?: number;             // match_id
}

/** The optional "sort by" / "stat axis" toggle. One per template, max (by convention). */
export interface MetricBinding extends BindingBase {
  kind: 'metric';
  /** The allowed metrics a creator may toggle between (keys into precomputed player_stats). */
  options: MetricKey[];
  default: MetricKey;
}

/** Build-XI: an ordered set of player slots on a formation. */
export interface LineupBinding extends BindingBase {
  kind: 'lineup';
  formation: Formation;         // '4-3-3' | '4-4-2' | ...
  default?: number[];           // up to 11 player_ids
}

/** Tier-2: auto-ranked list from precomputed leaderboards. No live computation. */
export interface LeaderboardBinding extends BindingBase {
  kind: 'leaderboard';
  metric: MetricKey | { fromBinding: string };  // can be driven by a MetricBinding toggle
  scope: 'tournament' | 'team' | 'match';
  scopeRef?: { fromBinding: string };           // e.g. team/match binding when scope != tournament
  order: 'desc' | 'asc';
  limit: number;                // e.g. 5 for a #5→#1 countdown
}

/** Tier-2: N players × M metrics → radar / side-by-side. */
export interface ComparisonBinding extends BindingBase {
  kind: 'comparison';
  players: { fromBinding: string }[];           // usually two PlayerBindings
  metrics: MetricKey[];
}

/** Free creator text (headline/caption). Not data — but a fillable slot. */
export interface TextBinding extends BindingBase {
  kind: 'text';
  default?: string;
  maxLength?: number;
}

export type Formation = '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1' | '3-4-3';

/** A scalar Capability id from the registry (src/registry).
 *  Was a fixed union; now registry-driven, so any technical-contributed scalar
 *  metric automatically becomes usable in templates. Validate against the
 *  registry (`isMetric`) at runtime rather than relying on the type. */
export type MetricKey = string;

// ─────────────────────────────────────────────────────────────────────────────
// 4. SCENES & COMPONENTS — the visual molecules
// ─────────────────────────────────────────────────────────────────────────────

export interface Scene {
  id: string;
  durationMs: number;           // 0 = static (single-scene card)
  transition?: TransitionStyle; // how this scene enters
  /** Placed component instances. Order = z-order (later = on top). */
  components: ComponentSpec[];
}

export type TransitionStyle = 'cut' | 'fade' | 'slide-up' | 'pop' | 'reveal';

/** A component instance: a primitive `type`, a layout box, props, and data refs. */
export interface ComponentSpec {
  id: string;
  type: PrimitiveType;
  layout: LayoutBox;            // position within the 9:16 canvas (fractions 0..1)
  props?: Record<string, unknown>;
  /** Per-prop data references resolved at render: { propName: BindingRef }. */
  data?: Record<string, BindingRef>;
  anim?: { style: AnimStyle; delayMs?: number };
}

/** The Pelada-designed primitive atoms. New atoms expand the creative surface for ALL templates. */
export type PrimitiveType =
  | 'headline' | 'subhead' | 'caption'
  | 'playerPhoto' | 'crest'
  | 'statChip'      // label + value
  | 'statBar'       // horizontal metric bar (good for ranked lists)
  | 'radar'         // multi-metric, 1–2 players (Head-to-Head)
  | 'pitch'         // formation with player slots (Build XI)
  | 'tierGrid'      // S/A/B/C/D rows of slots (Tier List)
  | 'rankRow'       // one countdown entry: rank #, photo, name, club, stat
  | 'heroStat'      // one giant number (Stat Drop)
  | 'divider' | 'spacer';

export type AnimStyle = 'none' | 'fade-in' | 'count-up' | 'slide-in' | 'pop-in' | 'stagger';

export interface LayoutBox {
  x: number; y: number;         // top-left as fraction of canvas (0..1)
  w: number; h: number;         // size as fraction of canvas (0..1)
  align?: 'left' | 'center' | 'right';
}

/** A reference from a component prop into a binding, with a field selector.
 *  e.g. { binding: 'striker', field: 'player_name' } or { binding: 'metric', field: 'value' }.
 *  `index` selects an item for list-valued bindings (leaderboard). */
export interface BindingRef {
  binding: string;
  field?: string;
  index?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. REMIX / ATTRIBUTION — the trickle-down loop
// ─────────────────────────────────────────────────────────────────────────────

export interface RemixConfig {
  /** Which bindings a remixer is nudged to change first (e.g. swap the player/team). */
  remixSlots: string[];
  /** Caption template; {{ }} interpolates binding fields + the system credit/hashtag. */
  captionTemplate: string;      // "My U17 XI 🔥 {{credit}} {{hashtag}}"
  /** Whether forks of this template re-enter the community catalog. */
  publishable: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. RESOLVED DATA — what the binding resolver produces for the renderer
// ─────────────────────────────────────────────────────────────────────────────

/** The engine resolves every Binding against Supabase (precomputed reads) into this map,
 *  then the renderer walks scenes/components substituting BindingRefs with these values.
 *  Kept separate from the spec so the spec stays pure/portable. */
export type ResolvedBindings = Record<string, unknown>;

export interface RenderInput {
  template: Template;
  resolved: ResolvedBindings;
}
