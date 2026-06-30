import type { VercelRequest, VercelResponse } from '@vercel/node';

// Diagnostic: confirms a deploy is live + which Remotion env vars are present
// (booleans only — never exposes secret values).
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    ok: true,
    build: 'remotion-fix-3',
    env: {
      REMOTION_FUNCTION_NAME: !!process.env.REMOTION_FUNCTION_NAME,
      REMOTION_SERVE_URL: !!process.env.REMOTION_SERVE_URL,
      REMOTION_REGION: process.env.REMOTION_REGION ?? null,
      REMOTION_AWS_ACCESS_KEY_ID: !!process.env.REMOTION_AWS_ACCESS_KEY_ID,
      REMOTION_AWS_SECRET_ACCESS_KEY: !!process.env.REMOTION_AWS_SECRET_ACCESS_KEY,
    },
  });
}
