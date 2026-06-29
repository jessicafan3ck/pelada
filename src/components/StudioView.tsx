/**
 * Studio — the creator editor and the deep-link target for remixes.
 *
 * This is the v1 vertical slice: pick a seed template → fill its data slots →
 * see it render live in a 9:16 frame. Data comes from the mock resolver now and
 * swaps to the Supabase resolver once the U17 ingest is written — no spec or
 * primitive changes needed (that's the whole point of the declarative engine).
 *
 * Still stubbed (next phases): the Compose rung (rearrange primitives), real
 * player/lineup pickers (need the DB), PNG/Remotion export, and the deploy/remix
 * caption + deep-link.
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { Boxes, Download, Sparkles, ChevronLeft, ChevronRight, Check, Copy, GitBranch } from 'lucide-react';
import { SEED_TEMPLATES } from '../templates/examples';
import type { Template, MetricBinding, TextBinding } from '../templates/spec';
import { mockResolver, METRIC_LABELS, type ResolvedBindings } from '../templates/engine/resolver';
import { supabaseResolver } from '../templates/engine/SupabaseResolver';
import { TemplatePreview } from '../templates/engine/TemplatePreview';
import { TemplateRenderer } from '../templates/engine/TemplateRenderer';
import { exportNodeToPng, slugify } from '../templates/engine/exportImage';
import { attributionBill } from '../attribution/model';

const CREATOR_HANDLE = '@you';

// base64 <-> JSON for the remix config carried in the deep-link (?cfg=)
const encodeCfg = (o: unknown) => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
const decodeCfg = (s: string | null): Record<string, unknown> => {
  if (!s) return {};
  try { return JSON.parse(decodeURIComponent(escape(atob(s)))); } catch { return {}; }
};

// Parse a remix deep-link once: which template, prefilled selections, whose remix.
function parseRemix() {
  const p = new URLSearchParams(window.location.search);
  const template = SEED_TEMPLATES.find(t => t.id === p.get('template')) ?? SEED_TEMPLATES[0];
  return { template, selections: decodeCfg(p.get('cfg')), remixOf: p.get('remixOf') || undefined };
}
const REMIX = parseRemix();

export default function StudioView() {
  const [template, setTemplate] = useState<Template>(REMIX.template);
  const [selections, setSelections] = useState<Record<string, unknown>>(REMIX.selections);
  const [resolved, setResolved] = useState<ResolvedBindings>({});
  const [sceneIndex, setSceneIndex] = useState(0);
  const [remixOf] = useState<string | undefined>(REMIX.remixOf);

  // Reset selections + scene when the user SWITCHES template — but keep the
  // initial prefill from a remix deep-link on first mount.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setSelections({}); setSceneIndex(0);
  }, [template]);

  // Resolve bindings whenever template or selections change.
  // Live U17 data via Supabase; falls back to the sample fixture if a query fails.
  useEffect(() => {
    let alive = true;
    supabaseResolver.resolve(template, selections)
      .then(r => { if (alive) setResolved(r); })
      .catch(() => mockResolver.resolve(template, selections).then(r => { if (alive) setResolved(r); }));
    return () => { alive = false; };
  }, [template, selections]);

  const set = (id: string, value: unknown) => setSelections(s => ({ ...s, [id]: value }));

  const metricBindings = useMemo(
    () => Object.entries(template.bindings).filter(([, b]) => b.kind === 'metric') as [string, MetricBinding][],
    [template]
  );
  const textBindings = useMemo(
    () => Object.entries(template.bindings).filter(([, b]) => b.kind === 'text') as [string, TextBinding][],
    [template]
  );

  // Cross-type attribution: the template's author + every capability it renders
  // (and that capability's author). Today the capabilities are 'pelada' seed
  // caps; once technicals contribute, their @handles appear here automatically.
  const bill = useMemo(() => attributionBill(template, selections), [template, selections]);

  // ── Export (Phase 4 — PNG MVP) ──────────────────────────────────────────────
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ caption: string; link: string } | null>(null);
  const [copied, setCopied] = useState<'caption' | 'link' | null>(null);
  const [platform, setPlatform] = useState<'tiktok' | 'story'>('tiktok');

  // The remix deep-link carries the template + the creator's exact config, so a
  // follower who taps it lands in Studio on this template, prefilled.
  const remixLink = useMemo(
    () => `${window.location.origin}/?view=studio&template=${template.id}&cfg=${encodeCfg(selections)}&remixOf=${encodeURIComponent(CREATOR_HANDLE)}`,
    [template, selections]
  );
  const buildCaption = () => {
    const tag = '#' + template.id.replace(/[^a-z0-9]/gi, '');
    return template.remix.captionTemplate
      .replace('{{credit}}', `made with Pelada by ${CREATOR_HANDLE}`)
      .replace('{{hashtag}}', `${tag} #PeladaU17`);
  };

  const handleExport = async () => {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      const name = slugify(`${template.meta.name}-${(selections['title'] as string) ?? ''}`);
      await exportNodeToPng(exportRef.current, name);
      setExportResult({ caption: buildCaption(), link: remixLink });
    } catch (e) {
      console.error('export failed', e);
    } finally {
      setExporting(false);
    }
  };

  const copy = (text: string, which: 'caption' | 'link') => {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20"><Boxes className="w-5 h-5 text-yellow-400" /></div>
        <div>
          <h1 className="text-xl font-black text-white">Studio</h1>
          <p className="text-xs text-zinc-500">Pick a template, plug in U17 data, deploy. <span className="text-green-500/70">Live FIFA U17 data.</span></p>
        </div>
      </div>

      {/* Remix banner — shown when a follower arrived via someone's remix link */}
      {remixOf && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.05] px-4 py-3 flex items-center gap-2.5 text-xs">
          <GitBranch className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-zinc-300">
            Remixing <span className="text-cyan-300 font-semibold">{remixOf}</span>'s <span className="text-white font-semibold">{template.meta.name}</span> — swap in your picks, then export your own. Their credit travels with it.
          </span>
        </div>
      )}

      {/* Template gallery */}
      <div className="flex gap-3 flex-wrap">
        {SEED_TEMPLATES.map(t => (
          <button
            key={t.id}
            onClick={() => setTemplate(t)}
            className={`text-left px-4 py-3 rounded-2xl border transition-all w-64 ${template.id === t.id ? 'bg-white/8 border-yellow-500/40' : 'bg-white/[0.02] border-white/8 hover:border-white/20'}`}
          >
            <div className="text-sm font-bold text-white">{t.meta.name}</div>
            <div className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{t.meta.tagline}</div>
            <div className="text-[10px] uppercase tracking-widest text-yellow-500/60 mt-2">{t.meta.category}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-start">
        {/* Controls */}
        <div className="space-y-5 max-w-md">
          {textBindings.map(([id, b]) => (
            <div key={id}>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">{b.label}</label>
              <input
                value={(selections[id] as string) ?? b.default ?? ''}
                maxLength={b.maxLength}
                onChange={e => set(id, e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500/40"
              />
            </div>
          ))}

          {metricBindings.map(([id, b]) => (
            <div key={id}>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">{b.label}</label>
              <div className="flex flex-wrap gap-2">
                {b.options.map(opt => {
                  const active = ((selections[id] as string) ?? b.default) === opt;
                  return (
                    <button key={opt} onClick={() => set(id, opt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${active ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-300' : 'bg-white/5 border-white/8 text-zinc-400 hover:text-white'}`}>
                      {METRIC_LABELS[opt]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Placeholder for the data pickers that need the DB */}
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              <span className="text-zinc-300 font-semibold">Player &amp; lineup pickers</span> are next — for now the XI auto-fills with the tournament's top 11 by line-breaks (live data) so you can see it render.
            </p>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full py-3 rounded-xl bg-yellow-500/15 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/25 transition-all text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {exporting
              ? <><div className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" /> Rendering…</>
              : <><Download className="w-4 h-4" /> Export 9:16 PNG</>}
          </button>
          <button disabled className="w-full py-2.5 rounded-xl bg-white/5 border border-white/8 text-zinc-600 text-xs font-semibold flex items-center justify-center gap-2 cursor-not-allowed">
            <Sparkles className="w-3.5 h-3.5" /> Ask Co-Pilot to draft this <span className="text-[10px]">(soon)</span>
          </button>

          {/* Export result — download done, now the per-platform deploy recipe */}
          {exportResult && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/[0.05] p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-400 text-xs font-bold"><Check className="w-4 h-4" /> Saved to downloads — ready to post</div>

              {/* platform tabs */}
              <div className="flex gap-2">
                {([['tiktok', 'TikTok'], ['story', 'IG Story']] as const).map(([id, label]) => (
                  <button key={id} onClick={() => setPlatform(id)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${platform === id ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/8 text-zinc-500 hover:text-zinc-300'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* recipe */}
              <ol className="text-[11px] text-zinc-400 space-y-1 list-decimal pl-4">
                {platform === 'tiktok' ? (
                  <>
                    <li>Post the downloaded PNG (or screen-record the preview for video).</li>
                    <li>Paste the caption below.</li>
                    <li>Drop the remix link in your bio or a pinned comment.</li>
                  </>
                ) : (
                  <>
                    <li>Add the downloaded PNG to your Story.</li>
                    <li>Add a <span className="text-zinc-200 font-semibold">Link sticker</span> with the remix URL below.</li>
                  </>
                )}
              </ol>

              {platform === 'tiktok' && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Caption</p>
                  <p className="text-xs text-zinc-300 leading-relaxed">{exportResult.caption}</p>
                  <button onClick={() => copy(exportResult.caption, 'caption')} className="mt-1.5 flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-300">
                    {copied === 'caption' ? <><Check className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy caption</>}
                  </button>
                </div>
              )}

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Remix link <span className="text-zinc-600">· prefills this exact template</span></p>
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-[11px] font-mono text-cyan-400 truncate">{exportResult.link}</span>
                  <button onClick={() => copy(exportResult.link, 'link')} className="shrink-0 text-zinc-500 hover:text-zinc-300">
                    {copied === 'link' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live 9:16 preview */}
        <div className="flex flex-col items-center gap-3 mx-auto">
          <TemplatePreview template={template} resolved={resolved} sceneIndex={sceneIndex} creatorHandle="@you" width={360} />

          {/* Attribution — one reputation system across creators + technicals */}
          <div className="w-[360px] rounded-xl border border-pink-500/15 bg-pink-500/[0.04] p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-pink-500/60 mb-2">Attribution · travels with every remix</p>
            <p className="text-xs text-zinc-300">
              Template <span className="text-white font-semibold">{bill.primary.name}</span> by <span className="text-pink-300">@you</span>
            </p>
            {bill.dependencies.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-zinc-600">Powered by capabilities</p>
                {bill.dependencies.map(d => (
                  <div key={d.id} className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-300">{d.name}</span>
                    <span className="text-zinc-500">by {d.author === 'pelada' ? 'Pelada' : d.author}</span>
                  </div>
                ))}
                <p className="text-[10px] text-zinc-600 pt-1 leading-snug">When a technical contributes a metric, their credit rides along — earning reach from every template that uses it.</p>
              </div>
            )}
          </div>

          {template.scenes.length > 1 && (
            <div className="flex items-center gap-3">
              <button onClick={() => setSceneIndex(i => Math.max(0, i - 1))} disabled={sceneIndex === 0} className="p-2 rounded-lg bg-white/5 border border-white/8 text-zinc-400 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs text-zinc-500">Scene {sceneIndex + 1} / {template.scenes.length}</span>
              <button onClick={() => setSceneIndex(i => Math.min(template.scenes.length - 1, i + 1))} disabled={sceneIndex === template.scenes.length - 1} className="p-2 rounded-lg bg-white/5 border border-white/8 text-zinc-400 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      </div>

      {/* Offscreen full-resolution (1080×1920) render — what the exporter captures.
          Kept at true size so the PNG is share-ready, not the scaled preview. */}
      <div ref={exportRef} aria-hidden style={{ position: 'fixed', left: -99999, top: 0, width: 1080, height: 1920, pointerEvents: 'none' }}>
        <TemplateRenderer template={template} resolved={resolved} sceneIndex={sceneIndex} creatorHandle={CREATOR_HANDLE} />
      </div>
    </div>
  );
}
