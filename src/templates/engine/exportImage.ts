/**
 * Export — turn a rendered template node into a downloadable 9:16 image.
 *
 * Phase 4 MVP: PNG (works today for IG Story + TikTok photo). The node passed in
 * must be the FULL-resolution 1080×1920 TemplateRenderer (not the scaled preview)
 * so the exported file is share-ready. Phase 4 V2 swaps in Remotion server-side
 * render for animated MP4 — same component tree, so this node is reused there.
 */
import { toJpeg } from 'html-to-image';

/** Export the 9:16 card as a JPEG — the format TikTok/IG photo uploads accept
 *  most reliably, and smaller than PNG. (JPEG has no alpha, so the card's solid
 *  dark background is baked in via backgroundColor.) */
export async function exportNodeToImage(node: HTMLElement, filename: string): Promise<void> {
  const opts = {
    width: 1080,
    height: 1920,
    pixelRatio: 1,
    quality: 0.95,
    cacheBust: true,
    backgroundColor: '#050505',
    // skip nodes explicitly marked non-exportable (e.g. dev overlays)
    filter: (n: HTMLElement) => !(n instanceof HTMLElement && n.dataset?.noExport === 'true'),
  };

  // Make sure web fonts are ready — a font still loading can blank the capture.
  if (document.fonts?.ready) { try { await document.fonts.ready; } catch { /* noop */ } }

  // html-to-image's FIRST pass can miss late-loading fonts/layout and render
  // blank; a warm-up pass reliably fixes it.
  await toJpeg(node, opts).catch(() => {});
  const dataUrl = await toJpeg(node, opts);

  // Download via a Blob URL + a DOM-attached anchor. A bare data: URL on a
  // detached anchor silently fails to download large (multi-MB) images in Chrome.
  const blob = await (await fetch(dataUrl)).blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? filename : `${filename}.jpg`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function slugify(s: string): string {
  return (s || 'pelada-card').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'pelada-card';
}
