/**
 * Wikipedia photo fetcher — pulls a player's portrait from the Wikipedia REST
 * summary API (thumbnail served from Wikimedia with CORS headers, so with
 * crossOrigin="anonymous" it renders AND exports without tainting the canvas).
 *
 * For the demo these are public images standing in for official FIFA assets.
 * Cached in-module so a card re-render doesn't refetch; call prefetch on the
 * pool, then bump a state so photoFor() picks the cached URLs up.
 */
const cache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();
const key = (name: string) => name.trim().toLowerCase();

/** Cached URL, or undefined if not fetched yet, or null if there's no photo. */
export function wikiPhotoCached(name?: string): string | null | undefined {
  return name ? cache.get(key(name)) : undefined;
}

export async function fetchWikiPhoto(name: string, title?: string): Promise<string | null> {
  const k = key(name);
  if (cache.has(k)) return cache.get(k)!;
  if (inflight.has(k)) return inflight.get(k)!;
  const p = (async () => {
    try {
      const t = encodeURIComponent(title || name);
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${t}`);
      if (!res.ok) throw new Error(`wiki ${res.status}`);
      const d = await res.json();
      const url: string | null = d?.thumbnail?.source ?? d?.originalimage?.source ?? null;
      cache.set(k, url);
      return url;
    } catch {
      cache.set(k, null);
      return null;
    }
  })();
  inflight.set(k, p);
  const r = await p;
  inflight.delete(k);
  return r;
}

export async function prefetchWikiPhotos(items: { name: string; wiki?: string }[]): Promise<void> {
  await Promise.all(items.map(i => fetchWikiPhoto(i.name, i.wiki).catch(() => null)));
}
