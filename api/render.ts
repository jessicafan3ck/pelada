/**
 * POST /api/render — kick off a pay-per-render MP4 on Remotion Lambda.
 *
 * Holds the AWS creds server-side (never in the browser). Returns { renderId,
 * bucketName }; the client then polls /api/render-status. Returns 501 until the
 * Lambda function + site are deployed and the env vars are set (see
 * render-service/README.md).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const functionName = process.env.REMOTION_FUNCTION_NAME;
  const serveUrl = process.env.REMOTION_SERVE_URL;
  const region = (process.env.REMOTION_REGION || 'us-east-1') as never;
  if (!functionName || !serveUrl) {
    return res.status(501).json({ error: 'Video rendering is not configured yet.' });
  }

  try {
    // Dynamic import so an import-time failure surfaces as a readable JSON error
    // (and loads the ESM client cleanly inside the serverless runtime).
    const { renderMediaOnLambda } = await import('@remotion/lambda/client');
    const { template, resolved, creatorHandle } = req.body ?? {};
    if (!template) return res.status(400).json({ error: 'missing template' });

    const { renderId, bucketName } = await renderMediaOnLambda({
      region,
      functionName,
      serveUrl,
      composition: 'Template',
      inputProps: { template, resolved: resolved ?? {}, creatorHandle: creatorHandle ?? '@you' },
      codec: 'h264',
      downloadBehavior: { type: 'download', fileName: 'pelada.mp4' },
    });

    return res.json({ renderId, bucketName });
  } catch (err) {
    console.error('render error', err);
    return res.status(500).json({ error: String((err as Error)?.message ?? err) });
  }
}
