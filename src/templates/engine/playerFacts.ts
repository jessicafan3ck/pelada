/**
 * Player facts registry — factual, on-pitch/neutral bio bits that deepen name
 * recognition (age, club, hometown). Knowledge, not opinion — so it's safe under
 * the raw-stats rule. Empty by default; drop in FIFA/federation-provided facts
 * keyed by lowercased name or player_id. For minors keep it strictly neutral
 * (age, club, nation) — nothing personal.
 *
 * Example once facts exist:
 *   export const PLAYER_FACTS = {
 *     'vicky lópez': { age: 16, club: 'Barcelona', from: 'Madrid, Spain' },
 *   };
 */
export interface PlayerFacts { age?: number; club?: string; from?: string }

export const PLAYER_FACTS: Record<string, PlayerFacts> = {
  // ── factual bio bits drop in here ──
};

export function factsFor(name?: string, id?: number): PlayerFacts | null {
  if (name && PLAYER_FACTS[name.trim().toLowerCase()]) return PLAYER_FACTS[name.trim().toLowerCase()];
  if (id != null && PLAYER_FACTS[String(id)]) return PLAYER_FACTS[String(id)];
  return null;
}
