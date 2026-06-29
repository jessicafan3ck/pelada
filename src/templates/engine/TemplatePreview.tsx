/**
 * TemplatePreview — renders a spec at true 1080×1920 then scales it down to fit
 * a target on-screen width. Keeps the renderer resolution-exact (so the same
 * component tree will later feed the PNG/Remotion exporter unchanged).
 */
import React from 'react';
import type { Template } from '../spec';
import type { ResolvedBindings } from './resolver';
import { TemplateRenderer } from './TemplateRenderer';

interface Props {
  template: Template;
  resolved: ResolvedBindings;
  sceneIndex?: number;
  creatorHandle?: string;
  /** On-screen width in px (height derives from 9:16). */
  width?: number;
}

export function TemplatePreview({ template, resolved, sceneIndex, creatorHandle, width = 340 }: Props) {
  const scale = width / template.canvas.width;
  const height = width * (template.canvas.height / template.canvas.width);
  return (
    <div style={{ width, height, borderRadius: 24, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: template.canvas.width, height: template.canvas.height }}>
        <TemplateRenderer template={template} resolved={resolved} sceneIndex={sceneIndex} creatorHandle={creatorHandle} />
      </div>
    </div>
  );
}
