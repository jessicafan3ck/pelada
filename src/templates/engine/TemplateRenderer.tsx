/**
 * TemplateRenderer — the single engine that interprets ANY spec into a rendered
 * 9:16 scene. It resolves each component's BindingRefs against the resolved data,
 * positions it by its fractional layout box, and renders the matching primitive.
 *
 * The Pelada footer (brand + credit + remix CTA) is rendered here, not as a
 * component, so creators can never delete the viral mechanic.
 */
import React from 'react';
import type { Template, ComponentSpec, ColorRef } from '../spec';
import { PRIMITIVES } from './primitives';
import { resolveRef, type ResolvedBindings } from './resolver';

interface Props {
  template: Template;
  resolved: ResolvedBindings;
  sceneIndex?: number;
  /** Creator handle for the footer credit. */
  creatorHandle?: string;
}

function resolveColor(c: ColorRef, resolved: ResolvedBindings): string {
  if ('fixed' in c) return c.fixed;
  const v = resolveRef(resolved, { binding: c.fromBinding, field: c.field });
  return typeof v === 'string' ? v : '#F59E0B';
}

function resolveData(c: ComponentSpec, resolved: ResolvedBindings): Record<string, unknown> {
  const props: Record<string, unknown> = { ...(c.props ?? {}) };
  if (c.data) for (const [prop, ref] of Object.entries(c.data)) props[prop] = resolveRef(resolved, ref);
  return props;
}

export function TemplateRenderer({ template, resolved, sceneIndex = 0, creatorHandle }: Props) {
  const { width, height } = template.canvas;
  const scene = template.scenes[Math.min(sceneIndex, template.scenes.length - 1)];
  const accent = resolveColor(template.style.accent, resolved);
  const bg = template.style.background;

  return (
    <div style={{ position: 'relative', width, height, overflow: 'hidden', fontFamily: template.style.fontFamily ?? 'Inter, system-ui, sans-serif', background: '#050505' }}>
      {/* background */}
      {bg.kind === 'mesh' && <MeshBackground accent={accent} />}
      {bg.kind === 'solid' && <div style={{ position: 'absolute', inset: 0, background: bg.value ?? '#050505' }} />}
      {bg.kind === 'image' && bg.value && <img src={bg.value} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}

      {/* components */}
      {scene.components.map(c => {
        const Prim = PRIMITIVES[c.type];
        if (!Prim) return null;
        const props = resolveData(c, resolved);
        const { x, y, w, h, align } = c.layout;
        return (
          <div key={c.id} style={{ position: 'absolute', left: x * width, top: y * height, width: w * width, height: h * height }}>
            {/* full-size flex wrapper so height:100% primitives (pitch, radar) don't collapse */}
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center' }}>
              <Prim accent={accent} {...props} />
            </div>
          </div>
        );
      })}

      {/* locked Pelada footer */}
      {template.style.footer.show && <PeladaFooter accent={accent} handle={creatorHandle} />}
    </div>
  );
}

function MeshBackground({ accent }: { accent: string }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#050505' }}>
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '60%', height: '40%', background: `${accent}33`, filter: 'blur(120px)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: '-5%', right: '-10%', width: '55%', height: '38%', background: `${accent}22`, filter: 'blur(120px)', borderRadius: '50%' }} />
    </div>
  );
}

function PeladaFooter({ accent, handle }: { accent: string; handle?: string }) {
  return (
    <div style={{ position: 'absolute', bottom: 36, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <svg viewBox="0 0 32 32" width={40} height={40} aria-hidden>
        <rect width="32" height="32" rx="8" fill="#000" />
        <polyline points="4,9 9,15 16,9 23,15 28,9" stroke="#F59E0B" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" fill="none" />
        <polyline points="4,24 9,18 16,24 23,18 28,24" stroke="#009C3B" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" fill="none" />
      </svg>
      <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: '0.04em', color: '#fff', textTransform: 'uppercase' }}>PELADA</span>
      {handle && <span style={{ fontSize: 22, fontWeight: 700, color: accent }}>· {handle}</span>}
    </div>
  );
}
