/**
 * shareCard — one-tap native sharing.
 *
 * On mobile (TikTok/IG live here) the Web Share API hands the rendered 9:16 PNG
 * straight to the OS share sheet, so "made a card" → "posted a branded card" is
 * a single tap — no download, no re-upload, no paste. Desktop / unsupported
 * browsers fall back to a file download + caption-to-clipboard.
 */
import { toPng } from 'html-to-image';

async function nodeToBlob(node: HTMLElement): Promise<Blob> {
  const dataUrl = await toPng(node, {
    width: 1080,
    height: 1920,
    pixelRatio: 1,
    cacheBust: true,
    filter: (n) => !(n instanceof HTMLElement && n.dataset?.noExport === 'true'),
  });
  const res = await fetch(dataUrl);
  return res.blob();
}

export type ShareOutcome = 'shared' | 'downloaded';

interface ShareOpts {
  filename: string;
  caption: string;
  /** Remix link — appended to the shared text so it travels with the post. */
  url?: string;
}

export async function shareCard(node: HTMLElement, { filename, caption, url }: ShareOpts): Promise<ShareOutcome> {
  const name = filename.endsWith('.png') ? filename : `${filename}.png`;
  const blob = await nodeToBlob(node);
  const file = new File([blob], name, { type: 'image/png' });
  const text = url ? `${caption}\n${url}` : caption;

  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], text });
      return 'shared';
    } catch (e) {
      // User dismissed the sheet — treat as handled, don't double-download.
      if ((e as { name?: string })?.name === 'AbortError') return 'shared';
      // Any other failure falls through to the download path below.
    }
  }

  const dl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = dl;
  a.download = name;
  a.click();
  URL.revokeObjectURL(dl);
  try { await navigator.clipboard.writeText(text); } catch { /* clipboard optional */ }
  return 'downloaded';
}

export function isNativeShareAvailable(): boolean {
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  return typeof nav.canShare === 'function';
}
