/**
 * LineupPicker — the Build-Your-XI data slot. Pick a player per formation
 * position from the live U17 pool; empty slots stay open on the pitch.
 *
 * Stores an ordered length-11 number[] of player_ids (0 = empty) in the lineup
 * selection — index = formation slot, matching the pitch primitive's coords.
 */
import { useMemo, useState } from 'react';
import { Search, X, Wand2, Eraser } from 'lucide-react';
import type { Formation } from '../../templates/spec';
import type { PlayerRecord } from '../../templates/engine/resolver';
import { metricLabel } from '../../registry';

const POSITION_LABELS: Record<Formation, string[]> = {
  '4-3-3':   ['GK', 'RB', 'RCB', 'LCB', 'LB', 'CM', 'CM', 'CM', 'LW', 'ST', 'RW'],
  '4-4-2':   ['GK', 'RB', 'RCB', 'LCB', 'LB', 'RM', 'RCM', 'LCM', 'LM', 'ST', 'ST'],
  '3-5-2':   ['GK', 'RCB', 'CB', 'LCB', 'RWB', 'RCM', 'CM', 'LCM', 'LWB', 'ST', 'ST'],
  '4-2-3-1': ['GK', 'RB', 'RCB', 'LCB', 'LB', 'RDM', 'LDM', 'RAM', 'CAM', 'LAM', 'ST'],
  '3-4-3':   ['GK', 'RCB', 'CB', 'LCB', 'RM', 'RCM', 'LCM', 'LM', 'RW', 'ST', 'LW'],
};

const last = (n: string) => n.split(' ').slice(-1)[0];

interface Props {
  formation: Formation;
  value: number[];
  onChange: (ids: number[]) => void;
  players: PlayerRecord[];
  metricKey: string;
}

export default function LineupPicker({ formation, value, onChange, players, metricKey }: Props) {
  const labels = POSITION_LABELS[formation] ?? POSITION_LABELS['4-3-3'];
  const slots = Array.from({ length: 11 }, (_, i) => value[i] ?? 0);
  const [active, setActive] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const byId = useMemo(() => new Map(players.map(p => [p.player_id, p])), [players]);

  const picked = new Set(slots.filter(Boolean));
  const filtered = players
    .filter(p => !q || p.player_name.toLowerCase().includes(q.toLowerCase()) || String(p.team ?? '').toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(b[metricKey] ?? 0) - Number(a[metricKey] ?? 0))
    .slice(0, 40);

  const assign = (slot: number, pid: number) => { const next = [...slots]; next[slot] = pid; onChange(next); setActive(null); setQ(''); };
  const clearSlot = (slot: number) => { const next = [...slots]; next[slot] = 0; onChange(next); };
  const autofill = () => onChange([...players].sort((a, b) => Number(b[metricKey] ?? 0) - Number(a[metricKey] ?? 0)).slice(0, 11).map(p => p.player_id));

  const filled = slots.filter(Boolean).length;

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Your XI · {filled}/11</span>
        <div className="flex gap-2">
          <button onClick={autofill} className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-yellow-300"><Wand2 className="w-3 h-3" /> Auto-fill top 11</button>
          <button onClick={() => onChange([])} className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300"><Eraser className="w-3 h-3" /> Clear</button>
        </div>
      </div>

      {/* slots */}
      <div className="grid grid-cols-2 gap-1.5">
        {slots.map((pid, i) => {
          const p = pid ? byId.get(pid) : undefined;
          return (
            <button
              key={i}
              onClick={() => setActive(active === i ? null : i)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left transition-all ${active === i ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-white/8 bg-white/[0.02] hover:border-white/20'}`}
            >
              <span className="text-[10px] font-bold text-zinc-500 w-8 shrink-0">{labels[i]}</span>
              {p ? (
                <span className="flex-1 min-w-0">
                  <span className="block text-xs text-white truncate">{last(p.player_name)}</span>
                  <span className="block text-[9px] text-zinc-500 truncate">{p.team} · {p[metricKey] ?? 0}</span>
                </span>
              ) : (
                <span className="flex-1 text-xs text-zinc-600">＋ pick</span>
              )}
              {p && <X className="w-3 h-3 text-zinc-600 hover:text-red-400 shrink-0" onClick={(e) => { e.stopPropagation(); clearSlot(i); }} />}
            </button>
          );
        })}
      </div>

      {/* search + assign for the active slot */}
      {active !== null && (
        <div className="rounded-lg border border-white/10 bg-black/40 p-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-zinc-500" />
            <input
              autoFocus value={q} onChange={e => setQ(e.target.value)}
              placeholder={`Search players for ${labels[active]}…`}
              className="flex-1 bg-transparent text-xs text-white placeholder-zinc-600 focus:outline-none"
            />
            <button onClick={() => setActive(null)} className="text-zinc-600 hover:text-zinc-300"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="max-h-52 overflow-y-auto space-y-0.5 custom-scrollbar">
            {filtered.map(p => (
              <button
                key={p.player_id}
                onClick={() => assign(active, p.player_id)}
                disabled={picked.has(p.player_id) && slots[active] !== p.player_id}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-left"
              >
                <span className="min-w-0">
                  <span className="block text-xs text-white truncate">{p.player_name}</span>
                  <span className="block text-[10px] text-zinc-500 truncate">{p.team}{p.position ? ` · ${p.position}` : ''}</span>
                </span>
                <span className="text-xs font-bold text-yellow-300 shrink-0 ml-2">{p[metricKey] ?? 0}<span className="text-[9px] text-zinc-600 ml-1">{metricLabel(metricKey).split(' ')[0]}</span></span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
