import React, { useState, useEffect } from 'react';
import { Star, Download, Play, Code2, BarChart3, TrendingUp, Globe, Lock, Zap, GitFork, Loader2, Wifi, WifiOff } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

// ── Attribution API types ─────────────────────────────────────────────────────

type FormatType = 'twin-reveal' | 'danger-overlay' | 'x-vs-y' | 'predict-the-play';

interface AttributionFormat {
  format_id: string;
  name: string | null;
  description: string | null;
  format_type: FormatType | null;
  nation: string | null;
  team: string | null;
  fork_count: number;
  total_reach: number;
  created_at: string;
  family_video_count?: number;
  origin_creator: { creator_id: string; tiktok_handle: string } | null;
}

// ── Internal display type ─────────────────────────────────────────────────────

interface LibraryItem {
  id: string;
  title: string;
  description: string;
  author: string;
  nation: string | null;
  team: string | null;
  forks: number;
  reach: number;
  formatType: FormatType | null;
  analystPick: boolean;
}

// ── Filter / sort options ─────────────────────────────────────────────────────

type SortKey = 'trending' | 'most-forked' | 'new';
type FilterType = 'all' | FormatType;

const FORMAT_LABELS: Record<FormatType, string> = {
  'twin-reveal':    'Twin Reveal',
  'danger-overlay': 'Danger Overlay',
  'x-vs-y':        'Head-to-Head',
  'predict-the-play': 'Predict',
};

const FORMAT_COLOR: Record<FormatType, string> = {
  'twin-reveal':    'text-sky-300 bg-sky-500/10 border-sky-500/20',
  'danger-overlay': 'text-rose-300 bg-rose-500/10 border-rose-500/20',
  'x-vs-y':        'text-purple-300 bg-purple-500/10 border-purple-500/20',
  'predict-the-play': 'text-amber-300 bg-amber-500/10 border-amber-500/20',
};

// ── Seed / fallback data ──────────────────────────────────────────────────────
// Shown when the attribution server is unreachable or the DB is empty.

const SEED_ITEMS: LibraryItem[] = [
  { id: 's1', title: 'Spain vs Japan — Twin Reveal', description: 'Side-by-side xG and pass network for the WWC 2023 group stage clash.', author: 'futbol_data', nation: 'Spain', team: null, forks: 214, reach: 18400, formatType: 'twin-reveal', analystPick: true },
  { id: 's2', title: 'Bonmatí Danger Zone', description: "Danger overlay centred on Aitana Bonmatí's carry zones and shot creation areas.", author: 'analista_es', nation: 'Spain', team: null, forks: 187, reach: 12300, formatType: 'danger-overlay', analystPick: true },
  { id: 's3', title: 'Kerr vs Caicedo — Head-to-Head', description: "Goals + xG + pressing stats — Sam Kerr vs Linda Caicedo across the tournament.", author: 'striker_stats', nation: null, team: null, forks: 143, reach: 9700, formatType: 'x-vs-y', analystPick: false },
  { id: 's4', title: 'Japan Counter — Predict the Play', description: "Japan's phase-2 counter trigger. Can you predict the next action?", author: 'tactic_jp', nation: 'Japan', team: null, forks: 89, reach: 6120, formatType: 'predict-the-play', analystPick: false },
  { id: 's5', title: 'England vs Australia — Twin Reveal', description: 'Semi-final pressure maps and carry heat for both sides.', author: 'lionesses_data', nation: 'England', team: null, forks: 201, reach: 15200, formatType: 'twin-reveal', analystPick: true },
  { id: 's6', title: 'Colombia Rising — Danger Overlay', description: "Linda Caicedo's goal contributions overlaid on the pitch — WWC breakout season.", author: 'col_futbol', nation: 'Colombia', team: null, forks: 162, reach: 11100, formatType: 'danger-overlay', analystPick: true },
];

function formatToItem(f: AttributionFormat): LibraryItem {
  return {
    id: f.format_id,
    title: f.name ?? f.format_id,
    description: f.description ?? '',
    author: f.origin_creator?.tiktok_handle ?? f.origin_creator?.creator_id ?? 'unknown',
    nation: f.nation,
    team: f.team,
    forks: f.fork_count,
    reach: f.total_reach,
    formatType: f.format_type,
    analystPick: f.total_reach > 10000,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CommunityLibrary({ onLoadWidget }: {
  onLoadWidget?: (item: LibraryItem) => void;
}) {
  const { userMode } = useAppContext();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveData, setLiveData] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortKey>('trending');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({ sort: sortBy, limit: '40' });
    if (filterType !== 'all') params.set('type', filterType);

    fetch(`/attribution-api/formats?${params}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: { formats: AttributionFormat[] }) => {
        if (cancelled) return;
        const mapped = (data.formats ?? []).map(formatToItem);
        setItems(mapped.length > 0 ? mapped : SEED_ITEMS);
        setLiveData(mapped.length > 0);
      })
      .catch(() => {
        if (!cancelled) { setItems(SEED_ITEMS); setLiveData(false); }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [sortBy, filterType]);

  const displayed = items
    .filter(i => !search || i.title.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase()))
    .filter(i => filterType === 'all' || i.formatType === filterType);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-400" />
            Community Library
          </h2>
          <p className="text-sm text-zinc-400 mt-0.5 flex items-center gap-1.5">
            {liveData
              ? <><Wifi className="w-3 h-3 text-green-400" /> Live — fan-created WWC formats</>
              : <><WifiOff className="w-3 h-3 text-zinc-600" /> Preview — connect attribution server to see live formats</>
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {userMode === 'analyst' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-300">
              <Zap className="w-3 h-3" /> Analyst — full library visible
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search formats…"
          className="flex-1 min-w-[160px] bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
        />
        <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none cursor-pointer">
          <option value="trending">Trending</option>
          <option value="most-forked">Most forked</option>
          <option value="new">Newest</option>
        </select>
      </div>

      {/* Format type filters */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterType('all')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${filterType === 'all' ? 'bg-purple-500/20 border-purple-500/40 text-purple-200' : 'bg-white/5 border-white/8 text-zinc-500 hover:text-zinc-300 hover:border-white/15'}`}>
          All
        </button>
        {(Object.keys(FORMAT_LABELS) as FormatType[]).map(ft => (
          <button key={ft} onClick={() => setFilterType(ft)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${filterType === ft ? 'bg-purple-500/20 border-purple-500/40 text-purple-200' : 'bg-white/5 border-white/8 text-zinc-500 hover:text-zinc-300 hover:border-white/15'}`}>
            {FORMAT_LABELS[ft]}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-600">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading formats…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayed.map(item => (
            <div key={item.id}
              className="bg-black/30 border border-white/8 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all group flex flex-col"
            >
              {/* Header */}
              <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0 mt-0.5">
                    <BarChart3 className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white leading-tight line-clamp-2">{item.title}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">@{item.author}{item.nation ? ` · ${item.nation}` : ''}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {item.analystPick && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md">
                      <Star className="w-2.5 h-2.5" /> Pick
                    </span>
                  )}
                </div>
              </div>

              <p className="px-4 pb-3 text-xs text-zinc-400 leading-relaxed flex-1 line-clamp-3">{item.description}</p>

              {/* Format type tag */}
              {item.formatType && (
                <div className="px-4 pb-3">
                  <span className={`text-[10px] px-2 py-0.5 border rounded-md ${FORMAT_COLOR[item.formatType]}`}>
                    {FORMAT_LABELS[item.formatType]}
                  </span>
                  {item.team && (
                    <span className="ml-1.5 text-[10px] px-2 py-0.5 bg-white/5 text-zinc-500 border border-white/8 rounded-md">{item.team}</span>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{item.forks.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{item.reach >= 1000 ? `${(item.reach / 1000).toFixed(0)}k` : item.reach}</span>
                </div>
                <button
                  onClick={() => onLoadWidget?.(item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-lg text-xs text-purple-200 font-medium transition-all"
                >
                  <Play className="w-3 h-3" /> Load
                </button>
              </div>
            </div>
          ))}
          {displayed.length === 0 && !loading && (
            <div className="col-span-3 text-center py-12 text-zinc-600 text-sm">
              No formats found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
