import { useState } from 'react';
import TacticalWorldModel from './TacticalWorldModel';
import {
  Target,
  Globe,
  Users,
  Plus,
  ArrowLeft,
  Search,
  Filter,
  Star,
  Download,
  History,
} from 'lucide-react';

const communityTactics = [
  {
    id: 1,
    title: 'Inverted Wingback Overload',
    author: 'PepG_Official',
    downloads: '12.4k',
    rating: 4.9,
    tags: ['Positional', 'High Press'],
    image: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  },
  {
    id: 2,
    title: 'Low Block Counter v2',
    author: 'Simeone_Fan',
    downloads: '9.8k',
    rating: 4.5,
    tags: ['Defense', 'Counter'],
    image: 'linear-gradient(135deg, #3f3f46 0%, #52525b 100%)',
  },
  {
    id: 3,
    title: 'Gegenpress 4-3-3',
    author: 'Kloppite',
    downloads: '8.2k',
    rating: 4.7,
    tags: ['Intensity', 'Attacking'],
    image: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
  },
];

const myTactics = [
  {
    id: 101,
    title: 'My Custom 4-2-3-1',
    lastEdited: '2 hours ago',
    status: 'Private',
    image: 'linear-gradient(135deg, #172554 0%, #1e3a8a 100%)',
  },
  {
    id: 102,
    title: 'Anti-Barca Setup',
    lastEdited: '3 days ago',
    status: 'Public',
    image: 'linear-gradient(135deg, #312e81 0%, #4338ca 100%)',
  },
];

export default function TacticsView() {
  const [view, setView] = useState<'discovery' | 'editor'>('discovery');
  const [activeTactic, setActiveTactic] = useState<string | null>(null);

  const openTactic = (title: string) => {
    setActiveTactic(title);
    setView('editor');
  };

  // ── Editor: World Sim is the canvas ───────────────────────────────────────
  if (view === 'editor') {
    return (
      <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('discovery')}
            className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Studio
          </button>
          {activeTactic && (
            <>
              <span className="text-zinc-700 text-xs">/</span>
              <span className="text-zinc-400 text-xs font-semibold">{activeTactic}</span>
            </>
          )}
        </div>
        <TacticalWorldModel />
      </div>
    );
  }

  // ── Discovery: landing page ───────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Target className="w-8 h-8 text-pink-500" />
            Tactics Lab
          </h1>
          <p className="text-zinc-400 mt-2">Design and simulate tactical systems with the World Model.</p>
        </div>
        <button
          onClick={() => openTactic('New Tactic')}
          className="px-6 py-3 bg-white text-black text-sm font-bold uppercase tracking-wider rounded-xl hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create New Tactic
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4 bg-black/40 border border-white/10 p-2 rounded-2xl backdrop-blur-md">
        <div className="flex-1 flex items-center gap-3 px-4">
          <Search className="w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search tactics, formations, or authors..."
            className="bg-transparent border-none focus:outline-none text-white w-full placeholder:text-zinc-600"
          />
        </div>
        <div className="h-8 w-px bg-white/10" />
        <button className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors">
          <Filter className="w-4 h-4" />
          <span>Filters</span>
        </button>
      </div>

      {/* My Projects */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          Your Projects
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* New Project Card */}
          <button
            onClick={() => openTactic('New Tactic')}
            className="group h-48 rounded-2xl border border-dashed border-white/20 hover:border-pink-500/50 hover:bg-pink-500/5 flex flex-col items-center justify-center gap-4 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-white/5 group-hover:bg-pink-500/20 flex items-center justify-center transition-colors">
              <Plus className="w-6 h-6 text-zinc-500 group-hover:text-pink-400" />
            </div>
            <span className="text-sm font-bold text-zinc-500 group-hover:text-pink-400 uppercase tracking-wider">
              Start Blank Canvas
            </span>
          </button>

          {myTactics.map(tactic => (
            <div
              key={tactic.id}
              onClick={() => openTactic(tactic.title)}
              className="group relative h-48 rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110" style={{ background: tactic.image }} />
              <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition-colors" />
              <div className="absolute inset-0 p-5 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                    tactic.status === 'Public'
                      ? 'bg-green-500/20 text-green-400 border-green-500/20'
                      : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/20'
                  }`}>
                    {tactic.status}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{tactic.title}</h3>
                  <div className="text-xs text-zinc-400 flex items-center gap-1">
                    <History className="w-3 h-3" /> Edited {tactic.lastEdited}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Community Inspiration */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-pink-400" />
            Community Inspiration
          </h2>
          <button className="text-xs text-pink-400 hover:text-white font-bold uppercase tracking-wider">View All</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {communityTactics.map(tactic => (
            <div
              key={tactic.id}
              onClick={() => openTactic(tactic.title)}
              className="group bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden hover:border-pink-500/30 transition-all hover:shadow-lg cursor-pointer"
            >
              <div className="h-32 w-full relative overflow-hidden">
                <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105" style={{ background: tactic.image }} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
                <div className="absolute bottom-3 left-4 flex gap-2">
                  {tactic.tags.map(tag => (
                    <span key={tag} className="text-[9px] font-bold px-2 py-0.5 bg-white/10 backdrop-blur-md rounded border border-white/10 text-white">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-base font-bold text-white mb-1 group-hover:text-pink-400 transition-colors">{tactic.title}</h3>
                <div className="flex items-center justify-between mt-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {tactic.author}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-zinc-400">
                      <Download className="w-3 h-3" /> {tactic.downloads}
                    </span>
                    <span className="flex items-center gap-1 text-yellow-500 font-bold">
                      <Star className="w-3 h-3 fill-yellow-500" /> {tactic.rating}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
