/**
 * GET /api/render-status?renderId=&bucketName= — poll a Remotion Lambda render.
 * Returns { done, progress, url, error }. The client polls until done, then
 * downloads `url` (an S3 link with download Content-Disposition).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRenderProgress } from '@remotion/lambda/client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const functionName = process.env.REMOTION_FUNCTION_NAME;
  const region = (process.env.REMOTION_REGION || 'us-east-1') as never;
  const renderId = String(req.query.renderId ?? '');
  const bucketName = String(req.query.bucketName ?? '');
  if (!functionName) return res.status(501).json({ error: 'Video rendering is not configured yet.' });
  if (!renderId || !bucketName) return res.status(400).json({ error: 'missing renderId/bucketName' });

  try {
    const p = await getRenderProgress({ renderId, bucketName, functionName, region });
    return res.json({
      done: p.done,
      progress: p.overallProgress,
      url: p.outputFile ?? null,
      error: p.fatalErrorEncountered ? (p.errors?.[0]?.message ?? 'render failed') : null,
    });
  } catch (err) {
    return res.status(500).json({ error: String((err as Error)?.message ?? err) });
  }
}
