import { useState } from 'react';
import { Share2, Check, Sparkles, Copy, ChevronLeft, GitBranch } from 'lucide-react';

const ATTRIBUTION_API = '/attribution-api';

async function attrFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${ATTRIBUTION_API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as T;
}

interface Props {
  widgetName: string;
  widgetDescription: string;
  onBack: () => void;
}

type DeployState = 'idle' | 'deploying' | 'success' | 'error';

interface DeployResult {
  formatId: string;
  formatTag: string;
  caption: string;
  landingUrl: string;
  tiktokPosted: boolean;
}

export default function TikTokDeploySection({ widgetName, widgetDescription, onBack }: Props) {
  const [handle, setHandle] = useState('@');
  const [captionText, setCaptionText] = useState(widgetName || '');
  const [privacy, setPrivacy] = useState<'SELF_ONLY' | 'PUBLIC_TO_EVERYONE'>('SELF_ONLY');
  const [deployState, setDeployState] = useState<DeployState>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<DeployResult | null>(null);
  const [copied, setCopied] = useState<'caption' | 'url' | null>(null);

  const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
  const tiktokHandle = cleanHandle.startsWith('@') ? cleanHandle.slice(1) : cleanHandle;
  const previewCaption = captionText
    ? `${captionText} — format by ${cleanHandle} #fmt_xxxxx #VaiSerEpico`
    : '';

  const isReady = captionText.trim().length > 0 && tiktokHandle.length > 1;

  const deploy = async () => {
    if (!isReady) return;
    setDeployState('deploying');
    setError('');

    try {
      // Register creator (ignore if already exists)
      await attrFetch('/creators', {
        method: 'POST',
        body: JSON.stringify({ creator_id: cleanHandle, tiktok_handle: tiktokHandle }),
      }).catch(() => {});

      // Create the format from this widget
      const fmtRes = await attrFetch<{ format: { format_id: string; format_tag: string } }>('/formats', {
        method: 'POST',
        body: JSON.stringify({
          origin_creator_id: cleanHandle,
          name: widgetName || captionText,
          description: widgetDescription,
        }),
      });

      const { format_id, format_tag } = fmtRes.format;
      const landingUrl = `${window.location.origin}/f/${format_id}`;
      let caption = `${captionText} — format by @${tiktokHandle} #${format_tag} #VaiSerEpico`;
      let tiktokPosted = false;

      // Attempt TikTok post — fails gracefully without API creds
      try {
        const makeRes = await attrFetch<{ caption?: string }>(`/formats/${format_id}/make`, {
          method: 'POST',
          body: JSON.stringify({
            maker_creator_id: cleanHandle,
            maker_caption: captionText,
            privacy_level: privacy,
            source_type: 'PULL_FROM_URL',
          }),
        });
        if (makeRes.caption) caption = makeRes.caption;
        tiktokPosted = true;
      } catch {
        // Expected without TikTok API keys — format is still created and the
        // attribution chain (caption + hashtag + format_id) is fully wired up
      }

      setResult({ formatId: format_id, formatTag: format_tag, caption, landingUrl, tiktokPosted });
      setDeployState('success');
    } catch (e: any) {
      setError(e.message);
      setDeployState('error');
    }
  };

  const copy = (text: string, type: 'caption' | 'url') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  // ─── Success screen ─────────────────────────────────────────────────────────
  if (deployState === 'success' && result) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-green-400/15 border border-green-400/30 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-green-400" />
            </div>
            <span className="text-sm font-semibold text-white">Format registered</span>
          </div>
          {!result.tiktokPosted && (
            <span className="text-[10px] text-yellow-400/70 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-2 py-0.5">
              TikTok post needs API keys
            </span>
          )}
        </div>

        {/* Caption chain — the core demo moment */}
        <div className="bg-pink-500/5 border border-pink-500/20 rounded-xl p-4">
          <p className="text-[10px] font-bold text-pink-500/60 uppercase tracking-widest mb-2">
            Baked-in @-credit — travels with every reuse
          </p>
          <p className="text-sm text-zinc-200 leading-relaxed">{result.caption}</p>
          <button
            onClick={() => copy(result.caption, 'caption')}
            className="mt-2.5 flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {copied === 'caption'
              ? <><Check className="w-3 h-3 text-green-400" /> Copied</>
              : <><Copy className="w-3 h-3" /> Copy caption</>}
          </button>
        </div>

        {/* IDs */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-black/40 border border-white/5 rounded-xl p-3">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Format ID</p>
            <p className="text-sm font-mono text-pink-400">{result.formatId}</p>
          </div>
          <div className="bg-black/40 border border-white/5 rounded-xl p-3">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">TikTok hashtag</p>
            <p className="text-sm font-mono text-pink-400">#{result.formatTag}</p>
          </div>
        </div>

        {/* Landing URL */}
        <div className="bg-black/40 border border-white/5 rounded-xl p-3">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
            Landing page — put this in your TikTok bio
          </p>
          <div className="flex items-center gap-2">
            <span className="flex-1 text-xs font-mono text-cyan-400 truncate">{result.landingUrl}</span>
            <button
              onClick={() => copy(result.landingUrl, 'url')}
              className="shrink-0 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
            >
              {copied === 'url' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Fork lineage note */}
        <div className="flex items-start gap-2 bg-white/[0.02] border border-white/5 rounded-xl p-3">
          <GitBranch className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
          <p className="text-xs text-zinc-500 leading-relaxed">
            Every creator who forks this format carries <span className="text-zinc-300">@{tiktokHandle}</span>'s credit automatically.
            The system groups all derivative videos under{' '}
            <span className="text-pink-400 font-mono text-[11px]">#{result.formatTag}</span>.
          </p>
        </div>

        <button
          onClick={() => { setDeployState('idle'); setResult(null); }}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          ← Deploy another format
        </button>
      </div>
    );
  }

  // ─── Form ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 hover:bg-white/8 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-pink-400" />
          <span className="text-sm font-semibold text-white">Post to TikTok with attribution</span>
        </div>
      </div>

      <p className="text-xs text-zinc-500 leading-relaxed pl-8">
        Registers this widget as a reusable format. Every video made from it
        carries your <span className="text-pink-400">@-credit</span> and a unique{' '}
        <span className="text-pink-400">#hashtag</span> — the early-TikTok dance-credit engine.
      </p>

      {/* Inputs */}
      <div className="space-y-3 pl-1">
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">
            Your TikTok @handle
          </label>
          <input
            value={handle}
            onChange={e => setHandle(e.target.value)}
            placeholder="@yourhandle"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500/40 transition-colors"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">
            Caption text
          </label>
          <input
            value={captionText}
            onChange={e => setCaptionText(e.target.value)}
            placeholder="Your text before the format credit…"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500/40 transition-colors"
          />
        </div>

        {/* Live caption preview */}
        {previewCaption && (
          <div className="bg-pink-500/5 border border-pink-500/15 rounded-xl p-3">
            <p className="text-[10px] font-bold text-pink-500/50 uppercase tracking-widest mb-1">Will post as</p>
            <p className="text-xs text-zinc-300 leading-relaxed">{previewCaption}</p>
          </div>
        )}

        {/* Privacy toggle */}
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">
            Visibility
          </label>
          <div className="flex gap-2">
            {([
              ['SELF_ONLY', '🔒 Draft only'] as const,
              ['PUBLIC_TO_EVERYONE', '🌍 Public'] as const,
            ]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setPrivacy(val)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all border ${
                  privacy === val
                    ? 'bg-pink-500/15 border-pink-500/30 text-pink-300'
                    : 'bg-white/5 border-white/5 text-zinc-500 hover:text-zinc-300 hover:border-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {deployState === 'error' && (
        <p className="text-xs text-red-400 pl-1">{error}</p>
      )}

      <button
        onClick={deploy}
        disabled={deployState === 'deploying' || !isReady}
        className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
          deployState === 'deploying' || !isReady
            ? 'bg-white/5 border border-white/5 text-zinc-600 cursor-not-allowed'
            : 'bg-pink-500/20 border border-pink-500/30 text-pink-300 hover:bg-pink-500/25 hover:border-pink-500/50 hover:text-pink-200'
        }`}
      >
        <Share2 className="w-4 h-4" />
        {deployState === 'deploying' ? 'Registering format…' : 'Deploy to TikTok'}
      </button>
    </div>
  );
}
