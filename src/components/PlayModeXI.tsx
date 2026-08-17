/**
 * PlayModeXI — the interactive "Choose My U17 XI" format.
 *
 * This is the TikTok-filter model: the creator (or a follower who tapped a remix
 * link) is walked through the lineup ONE position at a time, tapping a real U17
 * player into each slot. The card fills live as they go — so they can film /
 * screen-record while they talk through their picks (export the *process*), or
 * just share the finished XI (export the *product*). Every card carries the
 * baked Lenovo + FIFA lockup, and the remix link hands the exact XI to the next
 * person to swap and repost.
 *
 * Self-contained prototype: reuses the live U17 pool (getPlayers), the XICard
 * render target, and the PNG/Web-Share export helpers.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Download, Share2, RotateCcw, Undo2, Sparkles, Wand2, Check, Copy, GitBranch, Clapperboard, Square } from 'lucide-react';
import { getPlayers } from '../templates/engine/SupabaseResolver';
import type { PlayerRecord } from '../templates/engine/resolver';
import { exportNodeToPng, slugify } from '../templates/engine/exportImage';
import { shareCard, isNativeShareAvailable } from '../templates/engine/shareCard';
import { XICard, LABELS_433 } from './play/XICard';

const HANDLE = '@you';
const ACCENT = '#F59E0B';

// Which real positions best fill each formation slot (matched loosely, best-effort).
const POS_KEYWORDS: Record<string, string[]> = {
  GK: ['goalkeeper', 'keeper'],
  RB: ['back', 'defen', 'full'], LB: ['back', 'defen', 'full'],
  RCB: ['back', 'centre back', 'center back', 'defen'], LCB: ['back', 'centre back', 'center back', 'defen'],
  CM: ['midfield', 'mid'],
  LW: ['wing', 'left'], RW: ['wing', 'right'],
  ST: ['forward', 'strik', 'attack'],
};
const matchesPos = (label: string, pos?: string) => {
  const p = (pos ?? '').toLowerCase();
  return (POS_KEYWORDS[label] ?? []).some(k => p.includes(k));
};

const encodeIds = (ids: number[]) => btoa(JSON.stringify(ids));
const decodeIds = (s: string | null): number[] => {
  if (!s) return [];
  try { const v = JSON.parse(atob(s)); return Array.isArray(v) ? v : []; } catch { return []; }
};

export default function PlayModeXI() {
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [picks, setPicks] = useState<(PlayerRecord | null)[]>(Array(11).fill(null));
  const [activeSlot, setActiveSlot] = useState<number | null>(0);
  const [title, setTitle] = useState('Best XI of the tournament');
  const [greenScreen, setGreenScreen] = useState(false);
  const [more, setMore] = useState(0);

  const [remixOf, setRemixOf] = useState<string | undefined>();
  const [exportResult, setExportResult] = useState<{ caption: string; link: string } | null>(null);
  const [busy, setBusy] = useState<null | 'png' | 'share'>(null);
  const [copied, setCopied] = useState<'caption' | 'link' | null>(null);

  // Build-reel replay: reveal picks 0..11 over time so the creator can screen-record.
  const [replay, setReplay] = useState<number | null>(null);

  const exportRef = useRef<HTMLDivElement>(null);

  // Load the live U17 pool (sample fallback baked into getPlayers).
  useEffect(() => { getPlayers().then(setPlayers); }, []);

  // Remix hydrate: ?cfg=<ids> lands a follower on the creator's exact XI to swap.
  useEffect(() => {
    if (!players.length) return;
    const p = new URLSearchParams(window.location.search);
    const ids = decodeIds(p.get('cfg'));
    if (ids.length === 11) {
      const byId = new Map(players.map(pl => [pl.player_id, pl]));
      setPicks(ids.map(id => byId.get(id) ?? null));
      setActiveSlot(null);
      setRemixOf(p.get('remixOf') || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  const filled = picks.filter(Boolean).length;
  const done = filled === 11 && activeSlot === null;
  const pickedIds = useMemo(() => new Set(picks.filter(Boolean).map(p => p!.player_id)), [picks]);

  // Candidates for the open slot: position-matched first, then by line-breaks.
  const candidates = useMemo(() => {
    if (activeSlot === null) return [];
    const label = LABELS_433[activeSlot];
    const pool = players
      .filter(p => !pickedIds.has(p.player_id))
      .sort((a, b) => {
        const am = matchesPos(label, a.position) ? 1 : 0;
        const bm = matchesPos(label, b.position) ? 1 : 0;
        if (am !== bm) return bm - am;
        return Number(b.line_breaks ?? 0) - Number(a.line_breaks ?? 0);
      });
    return pool.slice(more * 6, more * 6 + 6);
  }, [activeSlot, players, pickedIds, more]);

  const nextEmpty = (from: (PlayerRecord | null)[]) => from.findIndex(x => !x);

  const pick = (player: PlayerRecord) => {
    if (activeSlot === null) return;
    const next = [...picks];
    next[activeSlot] = player;
    setPicks(next);
    setMore(0);
    const ne = nextEmpty(next);
    setActiveSlot(ne === -1 ? null : ne);   // advance to next empty, or finish/close
    setExportResult(null);
  };

  const editSlot = (i: number) => { setActiveSlot(i); setMore(0); };
  const undo = () => {
    // clear the most recently filled slot before the active one (or the last filled)
    const target = activeSlot !== null ? picks.slice(0, activeSlot).map(Boolean).lastIndexOf(true) : filled - 1;
    if (target < 0) return;
    const next = [...picks]; next[target] = null; setPicks(next); setActiveSlot(target);
  };
  const surprise = () => { if (candidates[0]) pick(candidates[0]); };
  const autoFill = () => {
    const chosen: (PlayerRecord | null)[] = Array(11).fill(null);
    const taken = new Set<number>();
    LABELS_433.forEach((label, i) => {
      const best = players
        .filter(p => !taken.has(p.player_id))
        .sort((a, b) => {
          const am = matchesPos(label, a.position) ? 1 : 0;
          const bm = matchesPos(label, b.position) ? 1 : 0;
          if (am !== bm) return bm - am;
          return Number(b.line_breaks ?? 0) - Number(a.line_breaks ?? 0);
        })[0];
      if (best) { chosen[i] = best; taken.add(best.player_id); }
    });
    setPicks(chosen); setActiveSlot(null); setExportResult(null);
  };
  const reset = () => { setPicks(Array(11).fill(null)); setActiveSlot(0); setMore(0); setExportResult(null); setRemixOf(undefined); };

  // Remix link carries the 11 ids so the next person lands on this exact XI.
  const remixLink = useMemo(() => {
    const ids = picks.map(p => p?.player_id ?? 0);
    return `${window.location.origin}/?view=play&cfg=${encodeIds(ids)}&remixOf=${encodeURIComponent(HANDLE)}`;
  }, [picks]);
  const caption = `My U17 XI 🔥 ${title} — who's yours? made with Pelada ${HANDLE} #PeladaU17 #FIFAU17`;

  const handlePng = async () => {
    if (!exportRef.current) return;
    setBusy('png');
    try {
      await exportNodeToPng(exportRef.current, slugify(`my-u17-xi-${title}`));
      setExportResult({ caption, link: remixLink });
    } finally { setBusy(null); }
  };
  const handleShare = async () => {
    if (!exportRef.current) return;
    setBusy('share');
    try {
      await shareCard(exportRef.current, { filename: slugify(`my-u17-xi-${title}`), caption, url: remixLink });
      setExportResult({ caption, link: remixLink });
    } finally { setBusy(null); }
  };
  const copy = (text: string, which: 'caption' | 'link') => {
    navigator.clipboard.writeText(text);
    setCopied(which); setTimeout(() => setCopied(null), 1800);
  };

  // Drive the build-reel replay.
  useEffect(() => {
    if (replay === null) return;
    if (replay > 11) { setReplay(null); return; }
    const t = setTimeout(() => setReplay(r => (r === null ? null : r + 1)), 620);
    return () => clearTimeout(t);
  }, [replay]);

  const previewW = 320;
  const scale = previewW / 1080;
  const revealCount = replay ?? 11;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20"><Play className="w-5 h-5 text-yellow-400" /></div>
        <div>
          <h1 className="text-xl font-black text-white">Choose My XI <span className="text-yellow-500/70 text-sm font-bold">· interactive</span></h1>
          <p className="text-xs text-zinc-500">Tap through the lineup one spot at a time. Film it, or share the finished card. <span className="text-green-500/70">Live FIFA U17 data.</span></p>
        </div>
      </div>

      {remixOf && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.05] px-4 py-3 flex items-center gap-2.5 text-xs">
          <GitBranch className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-zinc-300">Remixing <span className="text-cyan-300 font-semibold">{remixOf}</span>'s XI — tap any spot to swap in your own pick, then share. Their credit + the sponsors travel with it.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-start">
        {/* ── Left: controls ─────────────────────────────────────────── */}
        <div className="space-y-5 max-w-lg">
          {/* Title + layout toggles */}
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Card title</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500/40" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setGreenScreen(g => !g)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-2 ${greenScreen ? 'bg-green-500/15 border-green-500/40 text-green-300' : 'bg-white/5 border-white/8 text-zinc-400 hover:text-white'}`}>
                <Clapperboard className="w-3.5 h-3.5" /> Green-screen layout {greenScreen ? 'on' : 'off'}
              </button>
              <button onClick={autoFill} className="px-3 py-2 rounded-xl text-xs font-semibold border bg-white/5 border-white/8 text-zinc-400 hover:text-yellow-300 flex items-center gap-1.5"><Wand2 className="w-3.5 h-3.5" /> Auto XI</button>
              <button onClick={reset} className="px-3 py-2 rounded-xl text-xs font-semibold border bg-white/5 border-white/8 text-zinc-500 hover:text-zinc-300 flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> Reset</button>
            </div>
            {greenScreen && (
              <p className="text-[11px] text-green-400/70 leading-relaxed">Export this, then in TikTok add it via <span className="font-semibold">Green Screen</span> and film yourself in front. The lower third is kept clear for you.</p>
            )}
          </div>

          {/* Slot rail — the 11 positions; tap any to (re)pick */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Your XI · {filled}/11</span>
              {filled > 0 && !done && <button onClick={undo} className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300"><Undo2 className="w-3 h-3" /> Undo</button>}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {picks.map((p, i) => (
                <button key={i} onClick={() => editSlot(i)}
                  className={`px-2 py-1.5 rounded-lg border text-left transition-all ${activeSlot === i ? 'border-yellow-500/60 bg-yellow-500/10' : p ? 'border-white/10 bg-white/[0.03] hover:border-white/25' : 'border-dashed border-white/12 bg-white/[0.01] hover:border-white/25'}`}>
                  <span className="block text-[9px] font-bold text-zinc-500">{LABELS_433[i]}</span>
                  <span className={`block text-xs truncate ${p ? 'text-white' : 'text-zinc-600'}`}>{p ? p.player_name.split(' ').slice(-1)[0] : '＋ pick'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Candidate picker for the open slot */}
          {activeSlot !== null && (
            <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/[0.03] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Pick your <span className="text-yellow-300">{LABELS_433[activeSlot]}</span></span>
                <div className="flex gap-2">
                  <button onClick={() => setMore(m => m + 1)} className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1"><RotateCcw className="w-3 h-3" /> More</button>
                  <button onClick={surprise} className="text-[10px] text-yellow-300/80 hover:text-yellow-200 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Surprise me</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {candidates.map(p => (
                  <button key={p.player_id} onClick={() => pick(p)}
                    className="flex items-center justify-between px-2.5 py-2 rounded-lg border border-white/8 bg-white/[0.02] hover:border-yellow-500/40 hover:bg-yellow-500/5 text-left transition-all">
                    <span className="min-w-0">
                      <span className="block text-xs text-white truncate">{p.player_name}</span>
                      <span className="block text-[10px] text-zinc-500 truncate">{p.team}{p.position ? ` · ${p.position}` : ''}</span>
                    </span>
                    <span className="text-xs font-bold text-yellow-300 shrink-0 ml-2">{Number(p.line_breaks ?? 0)}<span className="text-[9px] text-zinc-600 ml-0.5">LB</span></span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Export / share — once the XI is complete */}
          {filled === 11 && (
            <div className="space-y-2.5">
              <div className="flex gap-2">
                <button onClick={handleShare} disabled={!!busy}
                  className="flex-1 py-3 rounded-xl bg-yellow-500/20 border border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/30 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60">
                  {busy === 'share' ? <div className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" /> : <Share2 className="w-4 h-4" />}
                  {isNativeShareAvailable() ? 'Share' : 'Save card'}
                </button>
                <button onClick={handlePng} disabled={!!busy}
                  className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60">
                  {busy === 'png' ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Download className="w-4 h-4" />} PNG
                </button>
                <button onClick={() => setReplay(0)} disabled={replay !== null}
                  title="Replay the build so you can screen-record the process"
                  className="px-4 py-3 rounded-xl bg-pink-500/15 border border-pink-500/40 text-pink-300 hover:bg-pink-500/25 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60">
                  <Clapperboard className="w-4 h-4" /> Build reel
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                <span className="text-zinc-300 font-semibold">Share</span> = one tap to TikTok/IG on mobile (falls back to download). <span className="text-pink-300 font-semibold">Build reel</span> replays your picks — screen-record it to post the process.
              </p>
            </div>
          )}

          {/* Post recipe */}
          {exportResult && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/[0.05] p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-400 text-xs font-bold"><Check className="w-4 h-4" /> Ready to post — Lenovo + FIFA baked in</div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Caption</p>
                <p className="text-xs text-zinc-300 leading-relaxed">{exportResult.caption}</p>
                <button onClick={() => copy(exportResult.caption, 'caption')} className="mt-1.5 flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-300">
                  {copied === 'caption' ? <><Check className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy caption</>}
                </button>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Remix link <span className="text-zinc-600">· prefills this exact XI</span></p>
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

        {/* ── Right: live 9:16 card ──────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3 mx-auto">
          <div style={{ width: previewW, height: 1920 * scale, position: 'relative' }} className="rounded-[28px] overflow-hidden shadow-2xl ring-1 ring-white/10">
            <div style={{ position: 'absolute', top: 0, left: 0, width: 1080, height: 1920, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
              <XICard picks={picks} title={title} handle={HANDLE} accent={ACCENT} greenScreen={greenScreen} activeSlot={replay === null ? (activeSlot ?? -1) : -1} revealCount={revealCount} editor />
            </div>
          </div>
          {replay !== null
            ? <button onClick={() => setReplay(null)} className="flex items-center gap-1.5 text-xs text-pink-300 hover:text-pink-200"><Square className="w-3 h-3" /> Stop reel — screen-record now</button>
            : <p className="text-[11px] text-zinc-600">{done ? 'Tap a spot to swap · then Share' : filled === 11 ? 'XI complete — Share or Build reel' : `${11 - filled} spots left`}</p>}
        </div>
      </div>

      {/* Offscreen full-res render — the exact node the exporter/sharer captures (no editor guides). */}
      <div ref={exportRef} aria-hidden style={{ position: 'fixed', left: -99999, top: 0, width: 1080, height: 1920, pointerEvents: 'none' }}>
        <XICard picks={picks} title={title} handle={HANDLE} accent={ACCENT} greenScreen={greenScreen} revealCount={11} />
      </div>
    </div>
  );
}
