/**
 * PlayerPicker — single-player data slot (used by `player` bindings, e.g. the
 * two sides of Head-to-Head). Search the live U17 pool, sorted by the active
 * comparison metric for quick "who's best at X" picking.
 */
import { useMemo, useState } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import type { PlayerRecord } from '../../templates/engine/resolver';

interface Props {
  label: string;
  value?: number;
  onChange: (id: number) => void;
  players: PlayerRecord[];
  sortMetric?: string;
}

export default function PlayerPicker({ label, value, onChange, players, sortMetric = 'line_breaks' }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const byId = useMemo(() => new Map(players.map(p => [p.player_id, p])), [players]);
  const sel = value ? byId.get(value) : undefined;

  const filtered = players
    .filter(p => !q || p.player_name.toLowerCase().includes(q.toLowerCase()) || String(p.team ?? '').toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(b[sortMetric] ?? 0) - Number(a[sortMetric] ?? 0))
    .slice(0, 40);

  return (
    <div>
      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">{label}</label>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm hover:border-white/20 transition-colors"
      >
        <span className={sel ? 'text-white' : 'text-zinc-600'}>{sel ? `${sel.player_name} · ${sel.team}` : 'Pick a player'}</span>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-1.5 rounded-xl border border-white/10 bg-black/60 p-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-zinc-500" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search players…"
              className="flex-1 bg-transparent text-xs text-white placeholder-zinc-600 focus:outline-none" />
            <button onClick={() => setOpen(false)} className="text-zinc-600 hover:text-zinc-300"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="max-h-52 overflow-y-auto space-y-0.5 custom-scrollbar">
            {filtered.map(p => (
              <button key={p.player_id}
                onClick={() => { onChange(p.player_id); setOpen(false); setQ(''); }}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-white/5 text-left ${value === p.player_id ? 'bg-white/8' : ''}`}>
                <span className="min-w-0">
                  <span className="block text-xs text-white truncate">{p.player_name}</span>
                  <span className="block text-[10px] text-zinc-500 truncate">{p.team}{p.position ? ` · ${p.position}` : ''}</span>
                </span>
                <span className="text-xs font-bold text-yellow-300 shrink-0 ml-2">{p[sortMetric] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
