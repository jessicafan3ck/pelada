# Pelada Render Service (Remotion → MP4)

Turns a Pelada template spec + resolved data into a 9:16 H.264 MP4, using the
**exact same `TemplateRenderer`** the web app uses (imported from `../src`), so
the video is pixel-identical to the in-app preview and PNG export.

```
POST /render   { template, resolved, creatorHandle }  → video/mp4 (download)
GET  /health   → { ok: true }
```

## How it works
- `remotion/TemplateVideo.tsx` renders each scene as a sequential `<Sequence>`
  (its spec `durationMs`, or 3.5s for a static scene) with an 8-frame fade-in.
- `server.ts` bundles the Remotion project once on first request, then renders
  per request with the posted `inputProps` and streams the MP4 back.

## Deploy on Render.com
1. Push this repo. In Render: **New → Blueprint**, select the repo. It reads
   `render.yaml` (root dir `render-service`, `standard` plan — Remotion + headless
   Chromium will OOM on free/starter).
2. After deploy, copy the service URL (e.g. `https://pelada-render.onrender.com`).
3. In the web app set `VITE_RENDER_URL` to that URL (`.env.local` for dev,
   Vercel env for prod) and redeploy/restart. The Studio **Export MP4** button
   activates automatically when it's set.

### Chromium note
`@remotion/renderer` downloads a headless Chromium on first render. On Render's
native Node runtime you may need the system libraries Chromium requires — if the
first render fails with a shared-library error, switch the service to Render's
**Docker** runtime using Remotion's official base image, or add the
[Remotion-recommended apt packages](https://www.remotion.dev/docs/miscellaneous/cloud-systems).

### Caveats
- First request is slow (cold bundle). Renders take a few seconds; consider a
  queue/async + signed-URL response if you see request timeouts.
- Returns the MP4 inline (no storage). For scale, write to S3/R2 and return a URL.
