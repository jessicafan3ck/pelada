/**
 * Unified attribution — one reputation system across Creators and Technicals.
 *
 * Generalizes the "early-TikTok dance-credit engine" (credit travels with reuse)
 * from a single type (templates) to a multi-type lineage DAG:
 *
 *   Capability ──used by──▶ Template ──forked──▶ Template' ──deployed──▶ reach
 *        ▲                                                                 │
 *        └──────────── credit flows UP the dependency chain ◀─────────────┘
 *
 * So a technical whose "line_breaks" metric powers 1,000 viral templates earns
 * reputation from those templates' reach — the supply chain of credit. Credit is
 * recognition, not a fixed pie: assist credit is ADDITIVE, never subtracted from
 * the primary author (reputation isn't zero-sum).
 *
 * This is the data model the attribution backend (today's /attribution-api +
 * format_id/#hashtag) should adopt: a `format` becomes a Contribution of type
 * 'template'; a registry capability is a Contribution of type 'capability'.
 */
import type { Template, MetricKey } from '../templates/spec';
import { getCapability, isMetric } from '../registry';

export type ContributionType = 'template' | 'capability';

export interface ReputationStats {
  uses: number;        // direct uses (template used to create / capability referenced)
  forks: number;       // derivatives created from it
  reach: number;       // downstream social reach attributed (incl. assist credit)
  appliedBy: number;   // capability only: analysts/teams who applied it (Analyze side)
}

export interface Contribution {
  type: ContributionType;
  id: string;
  name: string;
  author: string;      // '@handle' | team id | 'pelada'
  forkedFrom?: string; // lineage parent (same type)
  stats: ReputationStats;
}

// ── Bill of materials: what an artifact credits ───────────────────────────────

export interface AttributionBill {
  primary: { type: 'template'; id: string; name: string; author: string };
  dependencies: { type: 'capability'; id: string; name: string; author: string }[];
}

/** The scalar capabilities a template actually renders, given the creator's
 *  current selections (the chosen metric, leaderboard metric, comparison axes). */
export function capabilitiesUsed(template: Template, selections: Record<string, unknown> = {}): string[] {
  const ids = new Set<string>();
  const fromMetricBinding = (bindingId: string) => {
    const b = template.bindings[bindingId];
    const sel = selections[bindingId] as string | undefined;
    const v = sel ?? (b && b.kind === 'metric' ? b.default : undefined);
    if (v) ids.add(v);
  };
  const pickMetric = (m: MetricKey | { fromBinding: string }) => {
    if (typeof m === 'string') ids.add(m);
    else fromMetricBinding(m.fromBinding);
  };

  for (const [id, b] of Object.entries(template.bindings)) {
    if (b.kind === 'metric') fromMetricBinding(id);
    else if (b.kind === 'leaderboard') pickMetric(b.metric);
    else if (b.kind === 'comparison') b.metrics.forEach(mk => ids.add(mk));
  }
  return [...ids].filter(isMetric); // only real registry capabilities count
}

export function attributionBill(template: Template, selections: Record<string, unknown> = {}): AttributionBill {
  const dependencies = capabilitiesUsed(template, selections).map(cid => {
    const cap = getCapability(cid);
    return { type: 'capability' as const, id: cid, name: cap?.meta.name ?? cid, author: cap?.meta.author ?? 'unknown' };
  });
  return {
    primary: { type: 'template', id: template.id, name: template.meta.name, author: template.meta.authorId },
    dependencies,
  };
}

/** Human credit string for captions / the Studio credits panel. */
export function creditLine(bill: AttributionBill): string {
  if (!bill.dependencies.length) return `by ${bill.primary.author}`;
  const capNames = bill.dependencies.map(d => d.name);
  const capAuthors = [...new Set(bill.dependencies.map(d => d.author))];
  return `by ${bill.primary.author} · powered by ${capNames.join(', ')} (${capAuthors.join(', ')})`;
}

// ── Credit propagation: reach flows up the dependency chain ────────────────────

export interface CreditAllocation { author: string; role: 'primary' | 'assist'; reach: number; }

/** When an artifact earns `reach`, the primary author gets it all, and the distinct
 *  capability authors split an ADDITIVE assist pool (default 20%). Self/seed
 *  ('pelada') authors are excluded from assist so credit goes to contributors. */
export function distributeReach(bill: AttributionBill, reach: number, assistPool = 0.2): CreditAllocation[] {
  const out: CreditAllocation[] = [{ author: bill.primary.author, role: 'primary', reach }];
  const depAuthors = [...new Set(bill.dependencies.map(d => d.author))]
    .filter(a => a !== 'pelada' && a !== bill.primary.author);
  if (depAuthors.length) {
    const share = Math.round((reach * assistPool) / depAuthors.length);
    depAuthors.forEach(a => out.push({ author: a, role: 'assist', reach: share }));
  }
  return out;
}

// ── Reputation rollup (contributor profile / leaderboard) ─────────────────────

export interface AuthorReputation extends ReputationStats { author: string; contributions: number; }

/** Aggregate a set of contributions into per-author reputation — feeds the unified
 *  contributor leaderboard (creators + technicals ranked in one system). */
export function reputationFrom(contributions: Contribution[]): AuthorReputation[] {
  const byAuthor = new Map<string, AuthorReputation>();
  for (const c of contributions) {
    const r = byAuthor.get(c.author) ?? { author: c.author, contributions: 0, uses: 0, forks: 0, reach: 0, appliedBy: 0 };
    r.contributions += 1;
    r.uses += c.stats.uses; r.forks += c.stats.forks; r.reach += c.stats.reach; r.appliedBy += c.stats.appliedBy;
    byAuthor.set(c.author, r);
  }
  return [...byAuthor.values()].sort((a, b) => b.reach - a.reach);
}
