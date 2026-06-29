/**
 * Pelada render service — POST /render { template, resolved, creatorHandle }
 * → renders the "Template" Remotion composition to a 9:16 H.264 MP4 and streams
 * it back. The Remotion bundle is built once on first request and reused.
 *
 * Deploy on Render.com (see README.md). Set VITE_RENDER_URL in the web app to
 * this service's URL.
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' }));

let bundlePromise: Promise<string> | null = null;
function getBundle() {
  if (!bundlePromise) {
    bundlePromise = bundle({
      entryPoint: path.join(__dirname, 'remotion', 'index.ts'),
      // keep webpack lean; our components are plain React + inline styles
    });
  }
  return bundlePromise;
}

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/render', async (req, res) => {
  const stamp = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const out = path.join(os.tmpdir(), `pelada-${stamp}.mp4`);
  try {
    const { template, resolved, creatorHandle } = req.body ?? {};
    if (!template) return res.status(400).json({ error: 'missing template' });

    const serveUrl = await getBundle();
    const inputProps = { template, resolved: resolved ?? {}, creatorHandle: creatorHandle ?? '@you' };
    const composition = await selectComposition({ serveUrl, id: 'Template', inputProps });

    await renderMedia({
      serveUrl,
      composition,
      codec: 'h264',
      outputLocation: out,
      inputProps,
    });

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="pelada.mp4"');
    const stream = fs.createReadStream(out);
    stream.pipe(res);
    stream.on('close', () => fs.unlink(out, () => {}));
  } catch (err) {
    fs.unlink(out, () => {});
    console.error('render error', err);
    res.status(500).json({ error: String((err as Error)?.message ?? err) });
  }
});

const port = Number(process.env.PORT) || 3333;
app.listen(port, () => console.log(`[pelada-render] listening on :${port}`));
