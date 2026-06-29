/**
 * Export — MP4 via the Remotion render service (Phase 4 V2).
 *
 * The client resolves bindings (already done in Studio) and POSTs the spec +
 * resolved data to the render service; the service renders with the SAME
 * TemplateRenderer and streams back an MP4. Configured via VITE_RENDER_URL;
 * `isVideoExportAvailable()` is false until that's set (PNG export still works).
 */
import type { Template } from '../spec';
import type { ResolvedBindings } from './resolver';

export const RENDER_URL = (import.meta.env.VITE_RENDER_URL as string | undefined)?.replace(/\/$/, '');

export function isVideoExportAvailable(): boolean {
  return Boolean(RENDER_URL);
}

export async function exportMp4(
  payload: { template: Template; resolved: ResolvedBindings; creatorHandle?: string },
  filename: string,
): Promise<void> {
  if (!RENDER_URL) throw new Error('VITE_RENDER_URL not configured');
  const res = await fetch(`${RENDER_URL}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`render failed (${res.status}) ${msg}`);
  }
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename.endsWith('.mp4') ? filename : `${filename}.mp4`;
  a.click();
  URL.revokeObjectURL(a.href);
}
