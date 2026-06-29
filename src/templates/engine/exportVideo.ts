/**
 * Export — MP4 via Remotion Lambda (pay-per-render), through same-origin Vercel
 * functions. The client never holds AWS creds: it POSTs to /api/render (which
 * triggers a Lambda render), then polls /api/render-status until the MP4 is on
 * S3, then downloads it.
 *
 * Gated by VITE_VIDEO_ENABLED ('true' once the Lambda function + site are
 * deployed). PNG export always works regardless.
 */
import type { Template } from '../spec';
import type { ResolvedBindings } from './resolver';

export function isVideoExportAvailable(): boolean {
  return import.meta.env.VITE_VIDEO_ENABLED === 'true';
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export async function exportMp4(
  payload: { template: Template; resolved: ResolvedBindings; creatorHandle?: string },
  filename: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const start = await fetch('/api/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (start.status === 501) throw new Error('Video rendering isn’t set up yet.');
  if (!start.ok) throw new Error(`render start failed (${start.status})`);
  const { renderId, bucketName } = await start.json();

  // Poll until the render finishes (typical 9:16 clip: ~5–30s).
  for (let i = 0; i < 150; i++) {
    await sleep(2000);
    const res = await fetch(`/api/render-status?renderId=${encodeURIComponent(renderId)}&bucketName=${encodeURIComponent(bucketName)}`);
    const s = await res.json();
    if (s.error) throw new Error(s.error);
    if (typeof s.progress === 'number') onProgress?.(s.progress);
    if (s.done && s.url) {
      const a = document.createElement('a');
      a.href = s.url;
      a.download = filename.endsWith('.mp4') ? filename : `${filename}.mp4`;
      a.click();
      return;
    }
  }
  throw new Error('render timed out');
}
