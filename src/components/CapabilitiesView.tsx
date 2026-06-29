/**
 * Capabilities — the Build (Technical) workspace's home.
 *
 * Read-only view of the Capability Registry: every metric/model that powers both
 * Create (template data-slots) and Analyze (pro tools). Today these are 'pelada'
 * seed capabilities (the precomputed U17 metrics); when the Technical tooling
 * ships, contributed capabilities append here with their author + usedByCount.
 */
import { Boxes, Database, TrendingUp } from 'lucide-react';
import { listCapabilities } from '../registry';
import type { Capability } from '../registry/capability';

const KIND_LABEL: Record<string, string> = {
  scalar: 'Metric', ranking: 'Ranking', vector: 'Profile',
  relation: 'Network', event_tag: 'Event Tag', prediction: 'Prediction',
};

export default function CapabilitiesView() {
  const caps = listCapabilities();
  const scalars = caps.filter(c => c.kind === 'scalar');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20"><Boxes className="w-5 h-5 text-cyan-400" /></div>
        <div>
          <h1 className="text-xl font-black text-white">Capabilities</h1>
          <p className="text-xs text-zinc-500">The registry that powers Create <span className="text-zinc-600">and</span> Analyze. One contribution, both surfaces.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-2xl">
        <Stat icon={<Database className="w-4 h-4 text-cyan-400" />} label="Capabilities" value={caps.length} />
        <Stat icon={<TrendingUp className="w-4 h-4 text-green-400" />} label="Live metrics" value={scalars.length} />
        <Stat icon={<Boxes className="w-4 h-4 text-yellow-400" />} label="Contributors" value={1} sub="Pelada (seed)" />
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Registry</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {caps.map(c => <CapCard key={c.id} cap={c} />)}
        </div>
      </div>

      <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/[0.04] p-4 max-w-2xl">
        <p className="text-xs text-zinc-400 leading-relaxed">
          <span className="text-cyan-300 font-semibold">Technical workspace — coming next.</span> Contributors will build new
          capabilities (metrics, models, functions) on anonymized data; each appends here and instantly becomes a template
          data-slot for creators and a column for analysts — earning reach via attribution every time it's used.
        </p>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</span></div>
      <div className="text-2xl font-black text-white">{value}</div>
      {sub && <div className="text-[10px] text-zinc-600">{sub}</div>}
    </div>
  );
}

function CapCard({ cap }: { cap: Capability }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5 hover:border-white/20 transition-all">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-bold text-white">{cap.meta.name}</span>
        <span className="text-[9px] uppercase tracking-widest text-cyan-400/70 bg-cyan-500/10 border border-cyan-500/20 rounded px-1.5 py-0.5 shrink-0">{KIND_LABEL[cap.kind] ?? cap.kind}</span>
      </div>
      <p className="text-[11px] text-zinc-500 mt-1 leading-snug">{cap.meta.description}</p>
      <div className="flex items-center justify-between mt-2 text-[10px] text-zinc-600">
        <span>by {cap.meta.author === 'pelada' ? 'Pelada' : cap.meta.author}</span>
        <span>{cap.attribution.usedByCount} uses</span>
      </div>
    </div>
  );
}
