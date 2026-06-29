import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { TemplateRenderer } from '../../src/templates/engine/TemplateRenderer';
import type { Template } from '../../src/templates/spec';
import type { ResolvedBindings } from '../../src/templates/engine/resolver';

export const FPS = 30;

const sceneFrames = (ms: number) => Math.max(1, Math.round(((ms || 3500) / 1000) * FPS));

export function calcDurationInFrames(template: unknown): number {
  const t = template as Template | null;
  if (!t) return 105;
  return t.scenes.reduce((acc, s) => acc + sceneFrames(s.durationMs), 0);
}

interface Props { template: Template | null; resolved: ResolvedBindings; creatorHandle?: string }

/**
 * Renders each scene as a sequential Remotion <Sequence> (its spec durationMs, or
 * 3.5s for a static scene), with an 8-frame fade-in. Reuses the exact web-app
 * TemplateRenderer, so the MP4 is pixel-identical to the in-app preview/PNG.
 */
export function TemplateVideo({ template, resolved, creatorHandle }: Props) {
  if (!template) return <AbsoluteFill style={{ background: '#050505' }} />;
  let from = 0;
  return (
    <AbsoluteFill>
      {template.scenes.map((s, i) => {
        const dur = sceneFrames(s.durationMs);
        const start = from;
        from += dur;
        return (
          <Sequence key={s.id ?? i} from={start} durationInFrames={dur}>
            <SceneFade>
              <TemplateRenderer template={template} resolved={resolved} sceneIndex={i} creatorHandle={creatorHandle} />
            </SceneFade>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}

function SceneFade({ children }: { children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
}
