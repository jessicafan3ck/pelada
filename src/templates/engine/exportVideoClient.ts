/**
 * Client-side video export — records a short animated clip of the card in the
 * browser (canvas + MediaRecorder), no server needed. TikTok's uploader is
 * video-first, so this is what actually posts. It's also a better artifact than
 * a still: a premium holographic sweep + reveal on the collectible card.
 *
 * (The Remotion Lambda path stays as the production, pixel-perfect renderer; this
 * is the zero-infra path that just works for the demo.)
 */
import { toPng } from 'html-to-image';

const W = 1080, H = 1920;

const CAPTURE = {
  width: W, height: H, pixelRatio: 1, cacheBust: true, backgroundColor: '#050505',
  filter: (n: HTMLElement) => !(n instanceof HTMLElement && n.dataset?.noExport === 'true'),
};

/** Prefer MP4 (what TikTok wants); fall back to WebM if the browser can't record MP4. */
function pickMime(): { mime: string; ext: string } {
  const cands = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  for (const c of cands) {
    try { if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return { mime: c, ext: c.includes('mp4') ? 'mp4' : 'webm' }; } catch { /* noop */ }
  }
  return { mime: '', ext: 'webm' };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.style.display = 'none';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** True if the browser can record MP4 directly (so the file uploads to TikTok as-is). */
export function canRecordMp4(): boolean {
  return pickMime().ext === 'mp4';
}

/**
 * Reel — chain several captured cards into ONE MP4 (the 60s+ TikTok play).
 * Each item is a pre-captured 1080×1920 frame + how long it holds. Cards
 * crossfade into each other; the whole thing records as a single clip.
 */
export async function exportReelToVideo(items: { url: string; ms: number }[], filename: string): Promise<{ ext: string }> {
  const imgs = await Promise.all(items.map(it => loadImage(it.url)));
  const total = items.reduce((s, it) => s + Math.max(500, it.ms), 0);

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const { mime, ext } = pickMime();
  const stream = canvas.captureStream(30);
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 9_000_000 } : undefined);
  const chunks: BlobPart[] = [];
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise<void>(res => { rec.onstop = () => res(); });
  rec.start();

  const bounds = items.map((it, i) => ({ start: items.slice(0, i).reduce((s, x) => s + Math.max(500, x.ms), 0), ms: Math.max(500, it.ms) }));
  const start = performance.now();
  await new Promise<void>(resolve => {
    const draw = (now: number) => {
      const t = now - start;
      let idx = bounds.findIndex(b => t < b.start + b.ms);
      if (idx < 0) idx = items.length - 1;
      const local = t - bounds[idx].start;

      ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, W, H);
      // crossfade in from the previous card over the first 450ms
      const fade = Math.min(1, local / 450);
      if (idx > 0 && fade < 1) { ctx.globalAlpha = 1; ctx.drawImage(imgs[idx - 1], 0, 0, W, H); }
      ctx.globalAlpha = idx > 0 ? fade : Math.min(1, local / 300);
      ctx.drawImage(imgs[idx], 0, 0, W, H);
      // subtle sweep across each card
      ctx.globalAlpha = 1;
      const sx = (-0.4 + 1.6 * (local / bounds[idx].ms)) * W;
      const g = ctx.createLinearGradient(sx - 260, 0, sx + 260, H);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.06)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      if (t < total) requestAnimationFrame(draw); else resolve();
    };
    requestAnimationFrame(draw);
  });

  rec.stop();
  await stopped;
  downloadBlob(new Blob(chunks, { type: mime || 'video/webm' }), filename.endsWith(`.${ext}`) ? filename : `${filename}.${ext}`);
  return { ext };
}

export async function exportNodeToVideo(node: HTMLElement, filename: string, durationMs = 4200): Promise<{ ext: string }> {
  if (document.fonts?.ready) { try { await document.fonts.ready; } catch { /* noop */ } }

  // Capture the card once (warm-up pass avoids a blank first frame), then animate it.
  await toPng(node, CAPTURE).catch(() => {});
  const img = await loadImage(await toPng(node, CAPTURE));

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const { mime, ext } = pickMime();

  const stream = canvas.captureStream(30);
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 9_000_000 } : undefined);
  const chunks: BlobPart[] = [];
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise<void>(res => { rec.onstop = () => res(); });
  rec.start();

  const start = performance.now();
  await new Promise<void>(resolve => {
    const draw = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, W, H);

      // reveal: fade + subtle scale-in over the first ~0.6s
      const intro = Math.min(1, t / 0.14);
      const eased = 1 - Math.pow(1 - intro, 3);
      const s = 0.975 + 0.025 * eased;
      ctx.save();
      ctx.globalAlpha = eased;
      ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-W / 2, -H / 2);
      ctx.drawImage(img, 0, 0, W, H);
      ctx.restore();

      // holographic light sweep travelling across the card
      const x = (-0.35 + 1.7 * t) * W;
      const g = ctx.createLinearGradient(x - 320, 0, x + 320, H);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, `rgba(255,255,255,${0.12 * eased})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      if (t < 1) requestAnimationFrame(draw); else resolve();
    };
    requestAnimationFrame(draw);
  });

  rec.stop();
  await stopped;
  downloadBlob(new Blob(chunks, { type: mime || 'video/webm' }), filename.endsWith(`.${ext}`) ? filename : `${filename}.${ext}`);
  return { ext };
}
