/**
 * Player photo registry — the drop-in slot for OFFICIAL Women's World Cup
 * portraits.
 *
 * Intentionally empty. We do NOT ship scraped or unlicensed images: most of the
 * players in the current dataset are U17 minors, so faces are a safety and
 * licensing issue. When FIFA/the federations provide official portraits, add
 * them here keyed by the player's lowercased name (or player_id) and every
 * Player Card picks them up automatically.
 *
 * IMPORTANT for export: use HTTPS URLs that send CORS headers (Access-Control-
 * Allow-Origin) or inline data: URIs. A cross-origin image WITHOUT CORS taints
 * the html-to-image canvas and the PNG/MP4 exports blank. The <img> is rendered
 * with crossOrigin="anonymous" for this reason.
 *
 * Example once official assets exist:
 *   export const PLAYER_PHOTOS = {
 *     'vicky lópez': 'https://assets.fifa.com/…/vicky-lopez.png',
 *     '2001234':     'data:image/png;base64,iVBORw0…',   // by player_id
 *   };
 */
export const PLAYER_PHOTOS: Record<string, string> = {
  // ── official WWC portraits drop in here ──
};

/** Look up an official photo by player name or id; null → card uses the kit+flag hero. */
export function photoFor(name?: string, id?: number): string | null {
  if (name && PLAYER_PHOTOS[name.trim().toLowerCase()]) return PLAYER_PHOTOS[name.trim().toLowerCase()];
  if (id != null && PLAYER_PHOTOS[String(id)]) return PLAYER_PHOTOS[String(id)];
  return null;
}

/** True while no official photos are loaded — lets the UI show a "photo slot ready" note. */
export function hasOfficialPhotos(): boolean {
  return Object.keys(PLAYER_PHOTOS).length > 0;
}
