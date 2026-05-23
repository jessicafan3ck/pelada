import { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Activity, 
  Users, 
  ArrowRight, 
  Star, 
  Clock, 
  Calendar, 
  Shield, 
  PlayCircle, 
  Sparkles, 
  ChevronDown, 
  Target, 
  Cpu, 
  Box, 
  Layout, 
  BarChart2,
  Download
} from 'lucide-react';

interface DashboardProps {
  onOpenAgent: () => void;
}

type Category = 'all' | 'tactics' | 'models' | 'widgets' | 'formations' | 'benchmarks';

export default function Dashboard({ onOpenAgent }: DashboardProps) {
  const [hasActiveMatch, setHasActiveMatch] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('Man City');
  const [activeCategory, setActiveCategory] = useState<Category>('all');

  const myTeams = ['Man City', 'Barcelona', 'Inter Miami'];

  const upcomingMatches = [
    {
      id: 1,
      home: 'Man City',
      away: 'Bayern',
      competition: 'Champions League',
      time: '20:00',
      date: 'Today',
      status: 'upcoming'
    }
  ];

  const rankings = [
    { rank: 1, name: 'PepG_Official', score: 2840, role: 'Tactician' },
    { rank: 2, name: 'Klopp_Gegen', score: 2790, role: 'Manager' },
    { rank: 3, name: 'Mourinho_Bus', score: 2750, role: 'Analyst' },
    { rank: 4, name: 'Tactical_Genius', score: 2680, role: 'Strategist' },
    { rank: 5, name: 'Pelada_Labs', score: 2620, role: 'Developer' },
    { rank: 6, name: 'DataViz_Pro', score: 2580, role: 'Analyst' },
    { rank: 7, name: 'ScoutMaster', score: 2540, role: 'Scout' },
    { rank: 8, name: 'Simeone_Fan', score: 2490, role: 'Tactician' },
    { rank: 9, name: 'Analyst_Mike', score: 2450, role: 'Analyst' },
    { rank: 10, name: 'City_Watcher', score: 2410, role: 'Observer' },
  ];

  // Mock Data for Community Artifacts
  const artifacts = [
    {
      id: 1,
      type: 'tactics',
      title: 'Inverted Wingback Overload',
      author: 'PepG_Official',
      downloads: '12.4k',
      rating: 4.9,
      tags: ['Positional Play', 'High Press'],
      image: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      icon: Target
    },
    {
      id: 2,
      type: 'widgets',
      title: 'xG Momentum Flow',
      author: 'DataViz_Pro',
      downloads: '8.2k',
      rating: 4.7,
      tags: ['Visualization', 'xG'],
      image: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
      icon: Box
    },
    {
      id: 3,
      type: 'models',
      title: 'Defensive Collapse Predictor v2',
      author: 'Pelada_Labs',
      downloads: '5.1k',
      rating: 4.8,
      tags: ['ML', 'Defense'],
      image: 'linear-gradient(135deg, #4a044e 0%, #701a75 100%)',
      icon: Cpu
    },
    {
      id: 4,
      type: 'formations',
      title: '3-2-4-1 City Replica',
      author: 'Tactical_Genius',
      downloads: '3.4k',
      rating: 4.6,
      tags: ['Man City', 'Meta'],
      image: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
      icon: Layout
    },
    {
      id: 5,
      type: 'benchmarks',
      title: 'Elite Winger KPIs 2024',
      author: 'ScoutMaster',
      downloads: '2.1k',
      rating: 4.9,
      tags: ['Scouting', 'Data'],
      image: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 100%)',
      icon: BarChart2
    },
    {
      id: 6,
      type: 'tactics',
      title: 'Low Block Counter',
      author: 'Simeone_Fan',
      downloads: '9.8k',
      rating: 4.5,
      tags: ['Defense', 'Counter'],
      image: 'linear-gradient(135deg, #3f3f46 0%, #52525b 100%)',
      icon: Target
    }
  ];

  const filteredArtifacts = activeCategory === 'all' 
    ? artifacts 
    : artifacts.filter(item => item.type === activeCategory);

  const categories = [
    { id: 'all', label: 'All', icon: Sparkles },
    { id: 'tactics', label: 'Tactics', icon: Target },
    { id: 'models', label: 'Models', icon: Cpu },
    { id: 'widgets', label: 'Widgets', icon: Box },
    { id: 'formations', label: 'Formations', icon: Layout },
    { id: 'benchmarks', label: 'Benchmarks', icon: BarChart2 }, // Changed icon to BarChart2 as Trophy is used elsewhere
  ];

  return (
    <div className="space-y-10 pb-10">
      {/* State Toggle for Demo */}
      <div className="absolute top-28 right-10 z-50">
        <button 
          onClick={() => setHasActiveMatch(!hasActiveMatch)}
          className="text-[10px] text-zinc-600 hover:text-white bg-black/50 px-3 py-1 rounded-full border border-white/5 transition-colors"
        >
          {hasActiveMatch ? 'Simulate: No Match' : 'Simulate: Live Match'}
        </button>
      </div>

      {/* Hero Section */}
      <div className="grid grid-cols-12 gap-6 lg:gap-8">
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-black/40 backdrop-blur-2xl rounded-[32px] border border-white/5 overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] group relative h-full flex flex-col min-h-[400px]">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            
            {hasActiveMatch ? (
              // --- ACTIVE LIVE MATCH VIEW ---
              <>
                <div className="p-8 border-b border-white/5 flex justify-between items-center relative z-10">
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight drop-shadow-lg">Active Match Analysis</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
                      <p className="text-sm font-medium text-zinc-400">Live Network Health Monitoring • vs Real Madrid</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                     <div className="px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-2 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                       <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]"></span>
                       LIVE 72:34
                     </div>
                  </div>
                </div>
                
                <div className="relative flex-1 bg-[#050505] p-8">
                  {/* Pitch Visual */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-[#050505] to-[#050505]"></div>
                  
                  {/* Glass Pitch Markings */}
                  <div className="relative h-full border border-white/10 rounded-2xl overflow-hidden shadow-inner bg-white/[0.02]">
                     <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10 shadow-[0_0_10px_rgba(255,255,255,0.1)]"></div>
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-white/10 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.05)]"></div>
                     
                     {/* Dynamic Network Nodes Overlay */}
                     <div className="absolute inset-0">
                        <svg className="w-full h-full opacity-60 filter drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]">
                          <line x1="20%" y1="50%" x2="40%" y2="30%" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
                          <line x1="20%" y1="50%" x2="40%" y2="70%" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
                          <line x1="40%" y1="30%" x2="60%" y2="50%" stroke="#a855f7" strokeWidth="1" strokeDasharray="4 4" />
                          
                          {/* Nodes with glow */}
                          <circle cx="20%" cy="50%" r="6" fill="#a855f7" className="animate-pulse" />
                          <circle cx="40%" cy="30%" r="6" fill="#a855f7" />
                          <circle cx="40%" cy="70%" r="6" fill="#a855f7" />
                          
                          {/* Warning Node */}
                          <circle cx="60%" cy="50%" r="6" fill="#ef4444" className="animate-ping opacity-75" />
                          <circle cx="60%" cy="50%" r="4" fill="#ef4444" />
                        </svg>
                     </div>
    
                     <div className="absolute bottom-6 right-6 bg-black/60 backdrop-blur-md border border-white/10 p-5 rounded-2xl max-w-sm shadow-2xl">
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-orange-500/20 rounded-xl border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                            <AlertTriangle className="w-6 h-6 text-orange-500" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white mb-1">Collapse Risk Detected</div>
                            <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                              Right flank connectivity dropped below threshold (0.32). <br/>
                              <span className="text-orange-400">Recommendation: Invert FB to restore network links.</span>
                            </p>
                          </div>
                        </div>
                     </div>
                  </div>
                </div>
              </>
            ) : (
              // --- UPCOMING / MY FIXTURES VIEW (Fan View) ---
              <div className="flex-1 p-8 flex flex-col relative z-10">
                <div className="flex justify-between items-center mb-6">
                   <div className="flex items-center gap-4">
                      <div className="relative group/dropdown">
                        <button className="flex items-center gap-2 text-2xl font-bold text-white tracking-tight drop-shadow-lg hover:text-zinc-200 transition-colors">
                           {selectedTeam} <ChevronDown className="w-5 h-5 text-zinc-500" />
                        </button>
                        {/* Dropdown for teams */}
                        <div className="absolute top-full left-0 mt-2 w-48 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl overflow-hidden hidden group-hover/dropdown:block z-50">
                          {myTeams.map(team => (
                            <button 
                              key={team}
                              onClick={() => setSelectedTeam(team)}
                              className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                            >
                              {team}
                            </button>
                          ))}
                          <div className="border-t border-white/5 p-2">
                             <button className="w-full text-center text-xs font-bold text-purple-400 py-1 hover:text-purple-300">+ Add Team</button>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-zinc-500 font-medium border-l border-white/10 pl-4">Match Center</p>
                   </div>
                   
                   <div className="flex gap-2">
                      <button className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 text-xs font-bold hover:bg-white/10">
                         Results
                      </button>
                      <button className="px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        Fixtures
                      </button>
                   </div>
                </div>

                {/* Featured Match Card */}
                <div className="flex-1 bg-gradient-to-r from-zinc-900/50 to-black/50 rounded-2xl border border-white/10 p-8 flex items-center justify-between relative overflow-hidden mb-6 group hover:border-white/20 transition-all">
                   {/* Background Pattern */}
                   <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
                   
                   {/* Home Team */}
                   <div className="flex flex-col items-center gap-4 relative z-10 w-1/3">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-900 to-indigo-900 rounded-2xl flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.2)] group-hover:scale-105 transition-transform">
                         <Shield className="w-10 h-10 text-white" />
                      </div>
                      <div className="text-center">
                         <h3 className="text-xl font-bold text-white">{upcomingMatches[0].home}</h3>
                         <span className="text-xs text-zinc-500 font-mono tracking-wider">HOME</span>
                      </div>
                   </div>

                   {/* VS / Info */}
                   <div className="flex flex-col items-center justify-center gap-2 relative z-10 w-1/3">
                      <div className="text-sm font-bold text-white bg-white/10 px-4 py-1 rounded-full border border-white/10 backdrop-blur-md">
                        {upcomingMatches[0].time}
                      </div>
                      <span className="text-xs text-zinc-500 uppercase tracking-wider">{upcomingMatches[0].competition}</span>
                      <button className="mt-4 px-6 py-2 bg-white text-black text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-zinc-200 transition-colors shadow-lg">
                        Pre-Match
                      </button>
                   </div>

                   {/* Away Team */}
                   <div className="flex flex-col items-center gap-4 relative z-10 w-1/3">
                      <div className="w-20 h-20 bg-gradient-to-br from-red-900 to-rose-900 rounded-2xl flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(225,29,72,0.2)] group-hover:scale-105 transition-transform">
                         <Shield className="w-10 h-10 text-white" />
                      </div>
                      <div className="text-center">
                         <h3 className="text-xl font-bold text-white">{upcomingMatches[0].away}</h3>
                         <span className="text-xs text-zinc-500 font-mono tracking-wider">AWAY</span>
                      </div>
                   </div>
                </div>

                {/* Match Actions Grid */}
                <div className="grid grid-cols-2 gap-4 mt-auto">
                   <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:text-white transition-colors">
                         <PlayCircle className="w-5 h-5" />
                      </div>
                      <div>
                         <h4 className="text-sm font-bold text-white">Simulate Match</h4>
                         <p className="text-xs text-zinc-500 mt-1">Run 1000 AI simulations based on predicted lineups.</p>
                      </div>
                   </div>
                   <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:text-white transition-colors">
                         <Activity className="w-5 h-5" />
                      </div>
                      <div>
                         <h4 className="text-sm font-bold text-white">Advanced Analytics</h4>
                         <p className="text-xs text-zinc-500 mt-1">Deep dive into opponent tactical weaknesses.</p>
                      </div>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Metrics Column */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          <div className="bg-black/40 backdrop-blur-2xl rounded-[32px] border border-white/5 p-8 shadow-xl relative overflow-hidden h-full flex flex-col">
             <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[50px] rounded-full pointer-events-none" />
             
             {hasActiveMatch ? (
                <>
                  <div className="text-xs font-bold text-zinc-500 mb-6 uppercase tracking-[0.15em] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-zinc-600" />
                    Real-Time Metrics
                  </div>
                  
                  <div className="space-y-8 flex-1">
                    <div className="group">
                      <div className="flex justify-between items-end mb-3">
                        <span className="text-zinc-300 font-medium text-sm">Network Health</span>
                        <span className="text-3xl font-bold text-white tracking-tight group-hover:text-purple-400 transition-colors">68%</span>
                      </div>
                      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden p-[1px]">
                        <div className="h-full bg-gradient-to-r from-purple-600 to-blue-600 w-[68%] rounded-full shadow-[0_0_10px_rgba(147,51,234,0.5)] relative">
                           <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite] skew-x-12" />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-red-400 mt-2 font-medium">
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>-12% vs 1st Half</span>
                      </div>
                    </div>
                  </div>
                </>
             ) : (
                // Fan Zone Side Panel
                <>
                  <div className="text-xs font-bold text-zinc-500 mb-6 uppercase tracking-[0.15em] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-zinc-600" />
                    Community Pulse
                  </div>

                  <div className="space-y-4 flex-1">
                     <div className="p-5 bg-white/[0.03] rounded-2xl border border-white/5 hover:bg-white/[0.06] transition-colors cursor-pointer group">
                        <div className="flex items-center gap-3 mb-2">
                           <div className="p-2 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg text-purple-400">
                              <Download className="w-4 h-4" />
                           </div>
                           <span className="text-sm font-bold text-white">Most Downloaded</span>
                        </div>
                        <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">"Pep's 3-2-2-3 Evolution" is trending with 5k+ downloads this week.</p>
                     </div>
                     
                     <div className="p-5 bg-white/[0.03] rounded-2xl border border-white/5 hover:bg-white/[0.06] transition-colors cursor-pointer group">
                        <div className="flex items-center gap-3 mb-2">
                           <div className="p-2 bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-lg text-green-400">
                              <TrendingUp className="w-4 h-4" />
                           </div>
                           <span className="text-sm font-bold text-white">Rising Stars</span>
                        </div>
                        <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">User @Analyst_Mike gained 400 followers after his latest Defensive Block model.</p>
                     </div>
                  </div>

                  <div className="mt-auto pt-6 border-t border-white/5">
                     <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Global Ranking</span>
                        <span className="text-xs text-purple-400 hover:text-white cursor-pointer transition-colors">View All</span>
                     </div>
                     <div className="space-y-2">
                        {rankings.map((user, idx) => (
                           <div key={user.rank} className="bg-gradient-to-r from-purple-900/10 to-blue-900/10 border border-white/5 hover:border-purple-500/30 rounded-lg px-3 py-2 flex items-center justify-between group transition-all">
                              <div className="flex items-center gap-2">
                                 <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold bg-white/5 border border-white/10 text-zinc-500 shadow-sm">
                                    {user.rank}
                                 </div>
                                 <div className="text-[11px] font-bold text-white group-hover:text-purple-400 transition-colors">{user.name}</div>
                              </div>
                              <div className="text-[10px] text-zinc-500 font-mono">{user.score}</div>
                           </div>
                        ))}
                     </div>
                  </div>
                </>
             )}
          </div>
        </div>
      </div>

      {/* Discovery Section - The "Hub" part */}
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                  <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                      <Sparkles className="w-6 h-6 text-purple-500" />
                      Discover Community Work
                  </h2>
                  <p className="text-zinc-400 text-sm mt-2 max-w-2xl">
                      Explore thousands of community-created tactics, models, widgets, and formations. Clone, adapt, and improve.
                  </p>
              </div>

              {/* Category Filter Tabs */}
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-1 rounded-xl flex gap-1 overflow-x-auto no-scrollbar">
                  {categories.map((cat) => (
                      <button
                          key={cat.id}
                          onClick={() => setActiveCategory(cat.id as Category)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                              activeCategory === cat.id 
                                  ? 'bg-white text-black shadow-lg' 
                                  : 'text-zinc-500 hover:text-white hover:bg-white/5'
                          }`}
                      >
                          <cat.icon className="w-3.5 h-3.5" />
                          {cat.label}
                      </button>
                  ))}
              </div>
          </div>

          {/* Artifacts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArtifacts.map((item) => (
                  <div key={item.id} className="group bg-[#09090b] border border-white/5 rounded-[24px] overflow-hidden hover:border-purple-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] hover:-translate-y-1">
                      {/* Image Area */}
                      <div className="h-48 w-full relative overflow-hidden">
                          <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110" style={{ background: item.image }} />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent opacity-90" />
                          
                          <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold text-white uppercase tracking-wider border border-white/10 flex items-center gap-2">
                              <item.icon className="w-3 h-3 text-purple-400" />
                              {item.type}
                          </div>

                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-300">
                               <button className="p-2 bg-white text-black rounded-full hover:scale-110 transition-transform shadow-lg">
                                   <Download className="w-4 h-4" />
                               </button>
                          </div>
                      </div>

                      {/* Content Area */}
                      <div className="p-6 pt-2">
                          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-400 transition-colors leading-snug">{item.title}</h3>
                          
                          <div className="flex items-center gap-3 text-xs text-zinc-400 mb-5 font-medium border-b border-white/5 pb-4">
                              <span className="flex items-center gap-1.5 text-zinc-300">
                                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[8px] text-white font-bold">
                                      {item.author[0]}
                                  </div>
                                  {item.author}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-zinc-700" />
                              <span className="flex items-center gap-1.5">
                                  <Download className="w-3.5 h-3.5" /> {item.downloads}
                              </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                              <div className="flex gap-2">
                                  {item.tags.map(tag => (
                                      <span key={tag} className="text-[10px] px-2.5 py-1 bg-white/5 border border-white/5 text-zinc-400 font-semibold rounded-md group-hover:border-white/10 group-hover:text-zinc-300 transition-colors">
                                          {tag}
                                      </span>
                                  ))}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-yellow-500 font-bold">
                                  <Star className="w-3.5 h-3.5 fill-yellow-500" />
                                  {item.rating}
                              </div>
                          </div>
                      </div>
                  </div>
              ))}
          </div>

          {/* AI Co-Pilot Prompt */}
          <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-[24px] border border-white/10 p-1 flex items-center justify-between backdrop-blur-sm group hover:border-white/20 transition-all">
              <div className="flex items-center gap-6 px-6 py-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                      <h3 className="text-lg font-bold text-white">Can't find what you need?</h3>
                      <p className="text-sm text-zinc-400">Ask Pelada to generate a custom tactic, model, or widget for you.</p>
                  </div>
              </div>
              <button 
                onClick={onOpenAgent}
                className="mr-6 px-6 py-3 bg-white text-black font-bold text-sm rounded-xl hover:bg-zinc-200 transition-colors flex items-center gap-2"
              >
                  Open Co-Pilot <ArrowRight className="w-4 h-4" />
              </button>
          </div>
      </div>
    </div>
  );
}