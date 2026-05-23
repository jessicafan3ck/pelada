import React, { useState } from 'react';
import { Star, Download, Play, Code2, BarChart3, TrendingUp, Shield, Zap, Globe, Lock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

type LibraryTab = 'widgets' | 'models';
type FilterTag = 'all' | 'attack' | 'defense' | 'pressing' | 'set-pieces' | 'xG';

interface LibraryItem {
  id: string;
  type: 'widget' | 'model';
  title: string;
  description: string;
  author: string;
  authorCountry: string;
  stars: number;
  uses: number;
  tags: string[];
  analystPick: boolean;
  visibility: 'public' | 'analyst';
  preview?: string;
}

const MOCK_ITEMS: LibraryItem[] = [
  {
    id: 'w1', type: 'widget', title: 'Progressive Pass Network',
    description: 'Visual network of progressive passes per team, showing key build-up corridors.',
    author: 'fanatic_rm', authorCountry: '🇲🇦', stars: 214, uses: 1840,
    tags: ['attack', 'pressing'], analystPick: true, visibility: 'public',
  },
  {
    id: 'w2', type: 'widget', title: 'xG Timeline Bars',
    description: 'Minute-by-minute xG bar chart with momentum indicator overlay.',
    author: 'gooner_stats', authorCountry: '🇯🇵', stars: 187, uses: 2103,
    tags: ['xG', 'attack'], analystPick: false, visibility: 'public',
  },
  {
    id: 'w3', type: 'widget', title: 'Pressure Heatmap Grid',
    description: 'Pitch heatmap showing pressing intensity zones, filterable by phase of play.',
    author: 'tiki_data', authorCountry: '🇸🇳', stars: 143, uses: 977,
    tags: ['pressing', 'defense'], analystPick: true, visibility: 'public',
  },
  {
    id: 'w4', type: 'widget', title: 'Set Piece Corner Radar',
    description: 'Radar chart of corner delivery zones and outcomes — home vs away split.',
    author: 'setpiece_sci', authorCountry: '🇨🇷', stars: 89, uses: 612,
    tags: ['set-pieces'], analystPick: false, visibility: 'public',
  },
  {
    id: 'w5', type: 'widget', title: 'Defensive Line Depth',
    description: 'Average defensive line height by 15-minute intervals. Shows block vs press split.',
    author: 'fc_tactician', authorCountry: '🇯🇲', stars: 61, uses: 388,
    tags: ['defense'], analystPick: false, visibility: 'analyst',
  },
  {
    id: 'm1', type: 'model', title: 'Pressing Success Rate Model',
    description: 'Logistic regression predicting whether a pressure action recovers possession within 5 seconds.',
    author: 'small_league_ai', authorCountry: '🇧🇦', stars: 302, uses: 1220,
    tags: ['pressing', 'defense'], analystPick: true, visibility: 'public',
  },
  {
    id: 'm2', type: 'model', title: 'Pass Completion xG Impact',
    description: 'Measures each pass\'s contribution to xG chains — isolates key distributors.',
    author: 'analista_cr', authorCountry: '🇨🇷', stars: 241, uses: 890,
    tags: ['attack', 'xG'], analystPick: true, visibility: 'public',
  },
  {
    id: 'm3', type: 'model', title: 'Set Piece Goal Probability',
    description: 'Predicts corner/free kick goal probability from delivery x,y coords and player height.',
    author: 'corner_king', authorCountry: '🇲🇦', stars: 178, uses: 703,
    tags: ['set-pieces', 'xG'], analystPick: false, visibility: 'public',
  },
  {
    id: 'm4', type: 'model', title: 'Formation Transition Detector',
    description: 'Unsupervised clustering that identifies mid-match formation changes from event data.',
    author: 'tactic_ml', authorCountry: '🇯🇲', stars: 129, uses: 481,
    tags: ['defense', 'pressing'], analystPick: false, visibility: 'analyst',
  },
];

const TAG_LABELS: Record<FilterTag, string> = {
  all: 'All', attack: 'Attack', defense: 'Defense', pressing: 'Pressing', 'set-pieces': 'Set Pieces', xG: 'xG',
};

const TYPE_ICON = { widget: BarChart3, model: Code2 };

export default function CommunityLibrary({ onLoadWidget, onLoadModel }: {
  onLoadWidget?: (item: LibraryItem) => void;
  onLoadModel?: (item: LibraryItem) => void;
}) {
  const { userMode } = useAppContext();
  const [tab, setTab] = useState<LibraryTab>('widgets');
  const [filter, setFilter] = useState<FilterTag>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'stars' | 'uses'>('stars');

  const filtered = MOCK_ITEMS
    .filter(i => i.type === (tab === 'widgets' ? 'widget' : 'model'))
    .filter(i => userMode === 'analyst' || i.visibility === 'public')
    .filter(i => filter === 'all' || i.tags.includes(filter))
    .filter(i => !search || i.title.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b[sortBy] - a[sortBy]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-400" />
            Community Library
          </h2>
          <p className="text-sm text-zinc-400 mt-0.5">
            Fan-created {tab} — available to {userMode === 'analyst' ? 'all users' : 'fans and analysts'}
          </p>
        </div>
        {userMode === 'analyst' && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-300">
            <Zap className="w-3 h-3" /> Analyst access — all items visible
          </div>
        )}
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-white/5 rounded-xl p-1 border border-white/8">
          {(['widgets', 'models'] as LibraryTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? 'bg-white/15 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {t}
            </button>
          ))}
        </div>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          className="flex-1 min-w-[160px] bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
        />
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none">
          <option value="stars">Most starred</option>
          <option value="uses">Most used</option>
        </select>
      </div>

      {/* Tag filters */}
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(TAG_LABELS) as FilterTag[]).map(tag => (
          <button key={tag} onClick={() => setFilter(tag)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
              filter === tag
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-200'
                : 'bg-white/5 border-white/8 text-zinc-500 hover:text-zinc-300 hover:border-white/15'
            }`}>
            {TAG_LABELS[tag]}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(item => {
          const Icon = TYPE_ICON[item.type];
          return (
            <div key={item.id}
              className="bg-black/30 border border-white/8 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all group flex flex-col"
            >
              {/* Card header */}
              <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white leading-tight truncate">{item.title}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{item.authorCountry} {item.author}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {item.analystPick && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md">
                      <Star className="w-2.5 h-2.5" /> Pick
                    </span>
                  )}
                  {item.visibility === 'analyst' && (
                    <span className="flex items-center gap-1 text-[10px] text-blue-300 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-md">
                      <Lock className="w-2.5 h-2.5" /> Analyst
                    </span>
                  )}
                </div>
              </div>

              <p className="px-4 pb-3 text-xs text-zinc-400 leading-relaxed flex-1">{item.description}</p>

              {/* Tags */}
              <div className="px-4 pb-3 flex gap-1.5 flex-wrap">
                {item.tags.map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 bg-white/5 text-zinc-500 rounded-md">{tag}</span>
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-1"><Star className="w-3 h-3" />{item.stars}</span>
                  <span className="flex items-center gap-1"><Download className="w-3 h-3" />{item.uses}</span>
                </div>
                <button
                  onClick={() => item.type === 'widget' ? onLoadWidget?.(item) : onLoadModel?.(item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-lg text-xs text-purple-200 font-medium transition-all"
                >
                  <Play className="w-3 h-3" /> Load
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-12 text-zinc-600 text-sm">
            No {tab} found for this filter.
          </div>
        )}
      </div>
    </div>
  );
}
