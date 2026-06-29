# Pelada Render (Remotion Lambda · pay-per-render)

Renders a Pelada template spec + resolved data into a 9:16 MP4 on **AWS Lambda** —
~a few cents per video, **$0 when idle**. The composition reuses the **exact** web
`TemplateRenderer` (imported from `../src`), so the MP4 is pixel-identical to the
in-app preview/PNG.

Flow: browser → `/api/render` (Vercel fn, holds AWS creds) → `renderMediaOnLambda`
→ client polls `/api/render-status` → downloads the MP4 from S3.

## One-time setup

1. **AWS account + IAM user** with the Remotion Lambda permissions — follow
   <https://www.remotion.dev/docs/lambda/setup> (create the role/user, get an
   access key). Costs: only per render (Lambda + a little S3); no idle cost.

2. **Deploy the function + site** (from this `render-service/` dir):
   ```bash
   cd render-service
   npm install
   export REMOTION_AWS_ACCESS_KEY_ID=...      # from step 1
   export REMOTION_AWS_SECRET_ACCESS_KEY=...
   npm run deploy        # deploys the Lambda function AND the site
   ```
   `deploy:site` prints a **Serve URL** (an S3 URL). Copy it.

3. **Set env vars in Vercel** (Project → Settings → Environment Variables):
   ```
   REMOTION_AWS_ACCESS_KEY_ID      = ...
   REMOTION_AWS_SECRET_ACCESS_KEY  = ...
   REMOTION_FUNCTION_NAME          = remotion-render-...   (printed by deploy:fn)
   REMOTION_SERVE_URL              = https://...amazonaws.com/.../index.html
   REMOTION_REGION                 = us-east-1             (whatever you deployed to)
   ```
   Also set, for the web app: `VITE_VIDEO_ENABLED = true` (un-greys the MP4 button).
   Redeploy.

4. **Re-deploy the site whenever the templates/primitives change** (`npm run
   deploy:site`) so the rendered video matches the latest engine.

## Notes
- `/api/render` returns **501** until `REMOTION_FUNCTION_NAME` + `REMOTION_SERVE_URL`
  are set — the app shows the MP4 button as "(setup)".
- Per-render cost scales with video length/resolution; a short 9:16 clip is ~$0.01–0.03.
- Local preview of the composition: `npm run studio`.
