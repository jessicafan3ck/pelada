/**
 * TemplateStudio — the standalone, closed "use this template" space.
 *
 * A remix link (?use=<templateId>&cfg=…&remixOf=@handle) opens JUST the template:
 * no sidebar, no nav, no gallery — a fan lands in a focused mini-app to fill the
 * one template and export/share it. Mounted directly from main.tsx (outside the
 * app shell), like the EmbedPlayer.
 *
 * Reuses the same engine (resolver, pickers, renderer, exporters) as Studio, so
 * the output is identical — this is just a stripped, fan-facing shell.
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { Download, Film, Check, Copy, GitBranch, ExternalLink, ArrowUpRight } from 'lucide-react';
import { SEED_TEMPLATES } from '../templates/examples';
import type { Template, MetricBinding, TextBinding, LineupBinding, PlayerBinding } from '../templates/spec';
import { mockResolver, METRIC_LABELS, type ResolvedBindings, type PlayerRecord } from '../templates/engine/resolver';
import { supabaseResolver, getPlayers } from '../templates/engine/SupabaseResolver';
import { TemplatePreview } from '../templates/engine/TemplatePreview';
import { TemplateRenderer } from '../templates/engine/TemplateRenderer';
import { exportNodeToImage, slugify } from '../templates/engine/exportImage';
import { exportNodeToVideo } from '../templates/engine/exportVideoClient';
import LineupPicker from './studio/LineupPicker';
import PlayerPicker from './studio/PlayerPicker';

const HANDLE = '@you';
const encodeCfg = (o: unknown) => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
const decodeCfg = (s: string | null): Record<string, unknown> => {
  if (!s) return {};
  try { return JSON.parse(decodeURIComponent(escape(atob(s)))); } catch { return {}; }
};

function parseUse() {
  const p = new URLSearchParams(window.location.search);
  const template = SEED_TEMPLATES.find(t => t.id === p.get('use')) ?? SEED_TEMPLATES[0];
  return { template, selections: decodeCfg(p.get('cfg')), remixOf: p.get('remixOf') || undefined };
}
const USE = parseUse();

export default function TemplateStudio() {
  const template: Template = USE.template;
  const [selections, setSelections] = useState<Record<string, unknown>>(USE.selections);
  const [resolved, setResolved] = useState<ResolvedBindings>({});
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [sceneIndex, setSceneIndex] = useState(0);
  const remixOf = USE.remixOf;
  const set = (id: string, value: unknown) => setSelections(s => ({ ...s, [id]: value }));

  useEffect(() => {
    let alive = true;
    supabaseResolver.resolve(template, selections)
      .then(r => { if (alive) setResolved(r); })
      .catch(() => mockResolver.resolve(template, selections).then(r => { if (alive) setResolved(r); }));
    return () => { alive = false; };
  }, [selections]);

  useEffect(() => { getPlayers().then(setPlayers); }, []);

  const metricBindings = useMemo(() => Object.entries(template.bindings).filter(([, b]) => b.kind === 'metric') as [string, MetricBinding][], [template]);
  const textBindings = useMemo(() => Object.entries(template.bindings).filter(([, b]) => b.kind === 'text') as [string, TextBinding][], [template]);
  const lineupBindings = useMemo(() => Object.entries(template.bindings).filter(([, b]) => b.kind === 'lineup') as [string, LineupBinding][], [template]);
  const playerBindings = useMemo(() => Object.entries(template.bindings).filter(([, b]) => b.kind === 'player') as [string, PlayerBinding][], [template]);

  // Auto-seed lineups/players so the card renders filled (unless the remix link prefilled it).
  useEffect(() => {
    if (!players.length) return;
    const ranked = [...players].sort((a, x) => Number(x.line_breaks ?? 0) - Number(a.line_breaks ?? 0));
    lineupBindings.forEach(([id]) => {
      const cur = selections[id] as number[] | undefined;
      if (cur && cur.some(Boolean)) return;
      setSelections(s => ({ ...s, [id]: ranked.slice(0, 11).map(p => p.player_id) }));
    });
    const taken = new Set<number>(playerBindings.map(([id]) => selections[id] as number).filter(Boolean));
    playerBindings.forEach(([id]) => {
      if (selections[id]) return;
      const pick = ranked.find(p => !taken.has(p.player_id));
      if (pick) { taken.add(pick.player_id); setSelections(s => ({ ...s, [id]: pick.player_id })); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  const currentMetric = useMemo(() => {
    const mb = metricBindings[0];
    if (!mb) return 'line_breaks';
    return (selections[mb[0]] as string) ?? mb[1].default;
  }, [metricBindings, selections]);

  // Export (same offset-safe path as Studio).
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingVid, setExportingVid] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const remixLink = useMemo(
    () => `${window.location.origin}/?use=${template.id}&cfg=${encodeCfg(selections)}&remixOf=${encodeURIComponent(HANDLE)}`,
    [selections],
  );
  const caption = useMemo(() => template.remix.captionTemplate
    .replace('{{credit}}', `made with Pelada by ${HANDLE}`)
    .replace('{{hashtag}}', `#${template.id.replace(/[^a-z0-9]/gi, '')} #PeladaU17`), [selections]);

  const name = () => slugify(`${template.meta.name}-${(selections['title'] as string) ?? ''}`);
  const savePhoto = async () => { if (!exportRef.current) return; setExporting(true); try { await exportNodeToImage(exportRef.current, name()); setDone(true); } catch (e) { console.error(e); } finally { setExporting(false); } };
  const saveVideo = async () => { if (!exportRef.current) return; setExportingVid(true); try { await exportNodeToVideo(exportRef.current, name()); setDone(true); } catch (e) { console.error(e); } finally { setExportingVid(false); } };
  const copyLink = () => { navigator.clipboard.writeText(remixLink); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#e4e4e7' }} className="flex flex-col items-center">
      {/* minimal branded header */}
      <header className="w-full max-w-md flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden><rect width="32" height="32" rx="8" fill="#000" /><polyline points="4,9 9,15 16,9 23,15 28,9" stroke="#F59E0B" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" fill="none" /><polyline points="4,24 9,18 16,24 23,18 28,24" stroke="#009C3B" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" fill="none" /></svg>
          <span className="text-sm font-black tracking-wide text-white">{template.meta.name}</span>
        </div>
        <a href={`${window.location.origin}/`} className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 hover:text-white">
          Make your own <ArrowUpRight className="w-3 h-3" />
        </a>
      </header>

      <div className="w-full max-w-md px-5 pb-10 space-y-5">
        {remixOf && (
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.05] px-4 py-3 flex items-center gap-2.5 text-xs">
            <GitBranch className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-zinc-300">Remixing <span className="text-cyan-300 font-semibold">{remixOf}</span>'s <span className="text-white font-semibold">{template.meta.name}</span> — make it yours, then share. Their credit travels with it.</span>
          </div>
        )}

        {/* preview */}
        <div className="flex flex-col items-center">
          <TemplatePreview template={template} resolved={resolved} sceneIndex={sceneIndex} creatorHandle={HANDLE} width={340} />
          {template.scenes.length > 1 && (
            <div className="flex items-center gap-3 mt-3 text-xs text-zinc-500">
              <button onClick={() => setSceneIndex(i => Math.max(0, i - 1))} disabled={sceneIndex === 0} className="px-2 py-1 rounded bg-white/5 border border-white/10 disabled:opacity-30">‹</button>
              Scene {sceneIndex + 1}/{template.scenes.length}
              <button onClick={() => setSceneIndex(i => Math.min(template.scenes.length - 1, i + 1))} disabled={sceneIndex === template.scenes.length - 1} className="px-2 py-1 rounded bg-white/5 border border-white/10 disabled:opacity-30">›</button>
            </div>
          )}
        </div>

        {/* fill controls */}
        <div className="space-y-4">
          {textBindings.map(([id, b]) => (
            <div key={id}>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">{b.label}</label>
              <input value={(selections[id] as string) ?? b.default ?? ''} maxLength={b.maxLength} onChange={e => set(id, e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500/40" />
            </div>
          ))}
          {metricBindings.map(([id, b]) => (
            <div key={id}>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">{b.label}</label>
              <div className="flex flex-wrap gap-2">
                {b.options.map(opt => {
                  const active = ((selections[id] as string) ?? b.default) === opt;
                  return <button key={opt} onClick={() => set(id, opt)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${active ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-300' : 'bg-white/5 border-white/8 text-zinc-400'}`}>{METRIC_LABELS[opt]}</button>;
                })}
              </div>
            </div>
          ))}
          {playerBindings.map(([id, b]) => (
            <PlayerPicker key={id} label={b.label} value={selections[id] as number | undefined} onChange={v => set(id, v)} players={players} sortMetric={currentMetric} />
          ))}
          {lineupBindings.map(([id, b]) => (
            <div key={id}>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">{b.label}</label>
              <LineupPicker formation={b.formation} value={(selections[id] as number[]) ?? []} onChange={ids => set(id, ids)} players={players} metricKey={currentMetric} />
            </div>
          ))}
        </div>

        {/* export */}
        <div className="flex gap-2">
          <button onClick={savePhoto} disabled={exporting || exportingVid} className="flex-1 py-3 rounded-xl bg-yellow-500/15 border border-yellow-500/40 text-yellow-300 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {exporting ? 'Saving…' : <><Download className="w-4 h-4" /> Save Photo</>}
          </button>
          <button onClick={saveVideo} disabled={exportingVid || exporting} className="flex-1 py-3 rounded-xl bg-pink-500/15 border border-pink-500/40 text-pink-300 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {exportingVid ? 'Recording…' : <><Film className="w-4 h-4" /> Save Video</>}
          </button>
        </div>

        {done && (
          <div className="rounded-xl border border-green-500/20 bg-green-500/[0.05] p-4 space-y-3">
            <div className="flex items-center gap-2 text-green-400 text-xs font-bold"><Check className="w-4 h-4" /> Saved — ready for TikTok</div>
            <p className="text-xs text-zinc-300 leading-relaxed">{caption}</p>
            <div className="flex items-center gap-2">
              <button onClick={copyLink} className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-white">{copied ? <><Check className="w-3 h-3 text-green-400" /> Link copied</> : <><Copy className="w-3 h-3" /> Copy remix link</>}</button>
            </div>
            <button onClick={() => window.open('https://www.tiktok.com/upload', '_blank')} className="w-full py-2.5 rounded-lg bg-[#FE2C55] text-white text-xs font-bold flex items-center justify-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> Open TikTok</button>
          </div>
        )}
      </div>

      {/* offscreen full-res export node (offset on parent, ref on inner) */}
      <div aria-hidden style={{ position: 'fixed', left: -99999, top: 0, pointerEvents: 'none' }}>
        <div ref={exportRef} style={{ width: 1080, height: 1920 }}>
          <TemplateRenderer template={template} resolved={resolved} sceneIndex={sceneIndex} creatorHandle={HANDLE} />
        </div>
      </div>
    </div>
  );
}
