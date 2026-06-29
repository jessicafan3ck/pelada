import { Composition } from 'remotion';
import { TemplateVideo, calcDurationInFrames, FPS } from './TemplateVideo';

/**
 * One composition, "Template", that renders ANY Pelada template spec — the same
 * declarative engine the web app uses. The web client POSTs { template, resolved,
 * creatorHandle } as inputProps; duration is computed from the spec's scenes.
 */
export const RemotionRoot = () => (
  <Composition
    id="Template"
    component={TemplateVideo as never}
    fps={FPS}
    width={1080}
    height={1920}
    durationInFrames={120}
    defaultProps={{ template: null, resolved: {}, creatorHandle: '@you' } as never}
    calculateMetadata={({ props }: { props: { template: unknown } }) => ({
      durationInFrames: calcDurationInFrames(props.template),
    })}
  />
);
