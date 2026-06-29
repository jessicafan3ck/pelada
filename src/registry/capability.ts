/**
 * Capability contract — the keystone of the whole-platform redesign.
 *
 * A Capability is one unit of technical contribution (a metric, ranking, model,
 * function) built on event data. Its IMPLEMENTATION is free (builtin, SQL,
 * Python, a trained model); its OUTPUT must conform to a small fixed set of
 * KINDS. Each kind has a defined adapter into both consumption surfaces, so one
 * contribution serves Create (template data-slots) AND Analyze (pro tools) with
 * zero per-capability plumbing.
 *
 *   Template spec : renderer :: Capability : execution/materialization engine
 *   "constrain the atoms, free the molecules" → "constrain the kinds, free the impls"
 *
 * Like the template spec, this is JSON-serializable, registry-stored, versioned,
 * forkable, and attributed — the same reputation/lineage engine that ranks
 * creator templates ranks technical capabilities by `attribution.usedByCount`.
 */

export type CapabilityKind =
  | 'scalar'      // one number per entity        → Create: MetricBinding option   | Analyze: sortable column
  | 'ranking'     // ordered list by a scalar     → Create: leaderboard binding     | Analyze: leaderboard view
  | 'vector'      // multi-metric profile         → Create: radar binding           | Analyze: radar/profile
  | 'relation'    // pairwise / network           → Create: network viz             | Analyze: network tools
  | 'event_tag'   // annotation on events         → (feeds other capabilities)      | Analyze: event filters
  | 'prediction'; // model score per situation    → Create: what-if template        | Analyze: predictive tool

// v1 ships scalar + ranking + vector (cover every current template + most analysis).
// relation / event_tag / prediction are declared so the type surface is complete;
// activating one is the rare, deliberate "add a new primitive atom"-style expansion.
export const ACTIVE_KINDS: CapabilityKind[] = ['scalar', 'ranking', 'vector'];

export type Entity = 'player' | 'team' | 'match' | 'event';
export type Runtime = 'builtin' | 'sql' | 'python' | 'model';
export type CapabilityStatus = 'seed' | 'published' | 'review' | 'draft';

interface CapabilityBase {
  /** Stable id — also the binding key a template references (e.g. 'line_breaks'). */
  id: string;
  version: number;
  meta: {
    name: string;            // human label, e.g. "Line Breaks"
    description: string;
    author: string;          // 'pelada' for seed caps; '@handle' for contributed ones
    forkedFrom?: string;     // lineage
  };
  entity: Entity;
  /** Where the precomputed output lives — reads stay Tier-1/2 (instant). */
  materialized: { table: string; column?: string; metricKey?: string };
  /** Sandboxed implementation pointer. Seed caps are 'builtin' (ingest precompute). */
  impl: { runtime: Runtime; ref?: string };
  attribution: { usedByCount: number };
  status: CapabilityStatus;
}

export interface ScalarCapability extends CapabilityBase {
  kind: 'scalar';
  output: { unit?: string; higherIsBetter: boolean; range?: [number, number] };
}
export interface RankingCapability extends CapabilityBase {
  kind: 'ranking';
  output: { metric: string; order: 'asc' | 'desc' };   // ranks by a scalar capability id
}
export interface VectorCapability extends CapabilityBase {
  kind: 'vector';
  output: { axes: string[] };                          // list of scalar capability ids
}
export interface RelationCapability extends CapabilityBase {
  kind: 'relation';
  output: { nodeEntity: Entity; weightMetric: string };
}
export interface EventTagCapability extends CapabilityBase {
  kind: 'event_tag';
  output: { tag: string };
}
export interface PredictionCapability extends CapabilityBase {
  kind: 'prediction';
  output: { label: string; range: [number, number] };
}

export type Capability =
  | ScalarCapability | RankingCapability | VectorCapability
  | RelationCapability | EventTagCapability | PredictionCapability;
