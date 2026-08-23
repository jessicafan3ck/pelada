/**
 * Prompt-to-Card (client) — turn a fan's sentence into a real, provable card.
 *
 * This is the front-door magic AND the claims gate in one. The model never
 * writes card copy or stats; it only routes to one of our seed templates and
 * returns a structured draft (approved metric + real player ids). We then:
 *   1. screen the prompt locally for out-of-bounds asks (superlatives,
 *      predictions, off-pitch/subjective) → deterministic refusal, so the
 *      safety guarantee never depends on the model behaving;
 *   2. validate the returned draft against the registry + live player pool,
 *      repairing anything invalid to a safe default.
 * The result maps 1:1 onto Studio's existing `selections` shape.
 */
import { SEED_TEMPLATES } from '../examples';
import type { Template, MetricBinding, TextBinding, PlayerBinding } from '../spec';
import { listMetrics, metricLabel, isMetric } from '../../registry';
import type { PlayerRecord } from './resolver';

export type DraftResult =
  | { ok: true; template: Template; selections: Record<string, unknown>; note?: string }
  | { ok: false; refusal: string };

// The card can only ever state what the data proves. These are the asks we
// refuse before we even call the model — the structural "脱敏" guarantee.
// NOTE on scope: a fan's OWN selection — "best XI", "dream team", "my tier
// list", "my ranking" — is allowed. It's explicitly their opinion (the locked
// disclaimer already says so), and it's the core of the product. We only refuse
// an OBJECTIVE verdict crowning a specific player, a prediction, or an off-pitch
// / disparaging claim. So "best XI" passes; "best player ever" does not.
const OUT_OF_BOUNDS: { re: RegExp; why: string }[] = [
  { re: /\b(goat|greatest ever|greatest of all time|greatest (player|footballer)|best (player|footballer)( ever| of all time| in the world| alive)?|best (ever|of all time|in the world|alive) (player|footballer)|single best player|better than|more talented than)\b/i,
    why: 'crown one specific player as the objective best/greatest, or rank a named player above another as fact — but I can build YOUR pick (a best XI, tier list, or ranking) and back each choice with the data' },
  { re: /\b(will win|gonna win|going to win|who wins|who will win|predict|prediction|future (star|goat)|will (she|he|they) be the|next messi|next ronaldo)\b/i,
    why: 'predict what will happen' },
  { re: /\b(prettier|hotter|boyfriend|girlfriend|dating|religion|hate|trash|sucks|flop|worst player|overrated|underrated)\b/i,
    why: 'make an off-pitch, negative, or personal claim about a player' },
];

/** Local guardrail. Returns a friendly refusal string, or null if the ask is fine. */
export function screenPrompt(prompt: string): string | null {
  const hit = OUT_OF_BOUNDS.find(o => o.re.test(prompt));
  if (!hit) return null;
  return `I can only build cards from what the FIFA data proves, so I can't ${hit.why} — these are real, often underage, athletes. But I can rank the top players by a real stat like line-breaks, or drop one standout number. Want that instead?`;
}

const TEMPLATES_BY_ID = new Map(SEED_TEMPLATES.map(t => [t.id, t]));

// Hard-coded backup so the live demo NEVER fails: if the AI backend is slow or
// unreachable, keyword-map the prompt to an ideal template + metric + title.
// This is the "most perfect execution" safety net — the real AI call is still
// tried first; this only catches failures. (The technical team replaces this
// with the live model in production.)
function localDraft(prompt: string): { can_fulfill: true; template_id: string; metric: string; title: string } {
  const p = prompt.toLowerCase();
  const has = (...w: string[]) => w.some(x => p.includes(x));
  const metric =
    has('press') ? 'pressings' :
    has('goal') ? 'goals' :
    has('progress', 'carr') ? 'ball_progressions' :
    has('pass') ? 'passes_complete' :
    'line_breaks';
  if (has('player card', 'collectible', 'sticker', 'fut card', 'fifa card', 'card for', 'card of'))
    return { can_fulfill: true, template_id: 'player-card', metric, title: 'PLAYER CARD' };
  if (has(' xi', 'eleven', 'lineup', 'line up', 'line-up', 'squad', 'starting 11', 'dream team', 'best team'))
    return { can_fulfill: true, template_id: 'build-your-xi', metric, title: 'MY BEST XI' };
  if (has('tier'))
    return { can_fulfill: true, template_id: 'tier-list', metric, title: 'U17 TIER LIST' };
  if (has('compare', ' vs', 'versus', 'head to head', 'head-to-head', 'who ya got'))
    return { can_fulfill: true, template_id: 'head-to-head', metric, title: 'WHO YA GOT?' };
  if (has('stat', 'drop', 'one number', 'crazy', 'did you know', 'nobody'))
    return { can_fulfill: true, template_id: 'stat-drop', metric, title: 'STAT DROP' };
  return { can_fulfill: true, template_id: 'wonderkid-countdown', metric, title: 'TOP 5 WONDERKIDS' };
}

/** Map a validated draft onto Studio's selections shape for a given template. */
function mapDraftToSelections(
  template: Template,
  draft: { metric?: string; title?: string; player_a?: number; player_b?: number },
  players: PlayerRecord[]
): Record<string, unknown> {
  const sel: Record<string, unknown> = {};
  const poolIds = new Set(players.map(p => p.player_id));

  const entries = Object.entries(template.bindings);
  const textKey = entries.find(([, b]) => b.kind === 'text')?.[0];
  const metricEntry = entries.find(([, b]) => b.kind === 'metric') as [string, MetricBinding] | undefined;
  const playerKeys = entries.filter(([, b]) => b.kind === 'player').map(([id]) => id);

  // Title: neutral hook, clamped to the binding's maxLength.
  if (textKey && draft.title) {
    const b = template.bindings[textKey] as TextBinding;
    sel[textKey] = draft.title.slice(0, b.maxLength ?? 24).toUpperCase();
  }
  // Metric: only if it's a real registry metric AND allowed by this template.
  if (metricEntry && draft.metric && isMetric(draft.metric) && metricEntry[1].options.includes(draft.metric)) {
    sel[metricEntry[0]] = draft.metric;
  }
  // Players (head-to-head): assign a/b in binding order, only if real pool ids.
  const chosen = [draft.player_a, draft.player_b].filter((id): id is number => typeof id === 'number' && poolIds.has(id));
  playerKeys.forEach((key, i) => { if (chosen[i] != null) sel[key] = chosen[i]; });

  return sel;
}

export async function draftCard(prompt: string, players: PlayerRecord[]): Promise<DraftResult> {
  // 1. Local guardrail — refuse before the network call.
  const localRefusal = screenPrompt(prompt);
  if (localRefusal) return { ok: false, refusal: localRefusal };

  // 2. Build the catalog the model is constrained to.
  const templateCatalog = SEED_TEMPLATES.map(t => ({
    id: t.id, name: t.meta.name, category: t.meta.category, tagline: t.meta.tagline,
  }));
  const metricCatalog = listMetrics().map(id => ({ id, label: metricLabel(id) }));
  const playerPool = [...players]
    .sort((a, b) => Number(b.line_breaks ?? 0) - Number(a.line_breaks ?? 0))
    .slice(0, 40)
    .map(p => ({ id: p.player_id, name: p.player_name, position: p.position, team: p.team }));

  let draft: any;
  try {
    const res = await fetch('/api/langgraph', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'template', message: prompt, templateCatalog, metricCatalog, playerPool }),
    });
    const json = await res.json();
    draft = json.draft;
  } catch {
    draft = null;   // fall through to the hard-coded backup
  }

  // Hard-coded backup: if the backend is slow/unreachable or returns nothing,
  // keyword-map the prompt to an ideal card so the demo never dead-ends.
  if (!draft) draft = localDraft(prompt);

  // 3. Model-side refusal (superlatives/predictions it caught that we didn't).
  if (draft.can_fulfill === false) {
    return { ok: false, refusal: draft.refusal_reason || 'That one I can\'t make into a data-backed card — try asking for a ranking or a single stat.' };
  }

  // 4. Validate/repair the template choice; fall back to the signature template.
  const template = TEMPLATES_BY_ID.get(draft.template_id) ?? TEMPLATES_BY_ID.get('wonderkid-countdown')!;
  const selections = mapDraftToSelections(template, draft, players);
  return { ok: true, template, selections };
}
