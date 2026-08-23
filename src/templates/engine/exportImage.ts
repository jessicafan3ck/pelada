/**
 * Export — turn a rendered template node into a downloadable 9:16 image.
 *
 * Phase 4 MVP: PNG (works today for IG Story + TikTok photo). The node passed in
 * must be the FULL-resolution 1080×1920 TemplateRenderer (not the scaled preview)
 * so the exported file is share-ready. Phase 4 V2 swaps in Remotion server-side
 * render for animated MP4 — same component tree, so this node is reused there.
 */
import { toPng } from 'html-to-image';

export async function exportNodeToPng(node: HTMLElement, filename: string): Promise<void> {
  const opts = {
    width: 1080,
    height: 1920,
    pixelRatio: 1,
    cacheBust: true,
    // skip nodes explicitly marked non-exportable (e.g. dev overlays)
    filter: (n: HTMLElement) => !(n instanceof HTMLElement && n.dataset?.noExport === 'true'),
  };

  // html-to-image's FIRST pass can miss late-loading fonts/layout and render
  // blank; a warm-up pass reliably fixes it.
  await toPng(node, opts).catch(() => {});
  const dataUrl = await toPng(node, opts);

  // Download via a Blob URL + a DOM-attached anchor. A bare data: URL on a
  // detached anchor silently fails to download large (multi-MB) PNGs in Chrome.
  const blob = await (await fetch(dataUrl)).blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function slugify(s: string): string {
  return (s || 'pelada-card').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'pelada-card';
}
