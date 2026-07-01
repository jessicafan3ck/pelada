import { useState, useEffect } from 'react';
import {
  Home, Box, Boxes, Settings, Bell, Menu,
  Globe, Calendar, MessageSquare, Users2, GitBranch,
  Layers, Target, Network, Cpu, Database, Palette, LineChart,
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import StudioView from './components/StudioView';
import WidgetBuilder from './components/WidgetBuilder';
import CalendarView from './components/CalendarView';
import PeladaAgent from './components/PeladaAgent';
import LineupView from './components/LineupView';
import ContextPanel from './components/ContextPanel';
import CommunityLibrary from './components/CommunityLibrary';
import PlayerSimilarity from './components/visualizations/PlayerSimilarity';
import CapabilitiesView from './components/CapabilitiesView';
import TacticsView from './components/TacticsView';
import NetworksView from './components/NetworksView';
import ModelPlayground from './components/ModelPlayground';
import HistoricalAnalysis from './components/HistoricalAnalysis';
import { DataContextProvider } from './context/DataContext';
import { AppContextProvider, useAppContext } from './context/AppContext';

type ViewType =
  | 'dashboard' | 'copilot' | 'studio' | 'widgets'
  | 'calendar' | 'lineup' | 'community' | 'similarity'
  | 'capabilities' | 'tactics' | 'networks' | 'models' | 'history';

// Two on-platform surfaces: Creative (social content) vs Technical (analytics +
// capabilities). Underneath, Technical sub-groups into Build (contribute) and
// Analyze (pro). Viewers are off-platform (not a workspace).
type Workspace = 'Creative' | 'Technical';
const WORKSPACES: { id: Workspace; label: string; icon: typeof Palette; blurb: string }[] = [
  { id: 'Creative',  label: 'Creative',  icon: Palette,   blurb: 'Make & deploy social artifacts' },
  { id: 'Technical', label: 'Technical', icon: LineChart, blurb: 'Analytics & capabilities' },
];

// Per-category accent colours — full static strings so Tailwind JIT includes them
const CATEGORY_ACCENT = {
  General: { grad: 'from-sky-500/20 to-blue-700/5',     icon: 'text-sky-400',    dot: 'bg-sky-400',    dotGlow: 'shadow-[0_0_8px_rgba(56,189,248,0.8)]',    label: 'text-sky-600'    },
  Explore: { grad: 'from-green-500/20 to-emerald-700/5', icon: 'text-green-400',  dot: 'bg-green-400',  dotGlow: 'shadow-[0_0_8px_rgba(74,222,128,0.8)]',   label: 'text-green-600'  },
  Create:  { grad: 'from-yellow-500/20 to-orange-500/5', icon: 'text-yellow-400', dot: 'bg-yellow-400', dotGlow: 'shadow-[0_0_8px_rgba(250,204,21,0.8)]',   label: 'text-yellow-600' },
  Build:   { grad: 'from-cyan-500/20 to-teal-700/5',     icon: 'text-cyan-400',   dot: 'bg-cyan-400',   dotGlow: 'shadow-[0_0_8px_rgba(34,211,238,0.8)]',   label: 'text-cyan-600'   },
  Analyze: { grad: 'from-pink-500/20 to-rose-700/5',     icon: 'text-pink-400',   dot: 'bg-pink-400',   dotGlow: 'shadow-[0_0_8px_rgba(244,114,182,0.8)]',  label: 'text-pink-600'   },
} as const;

const INITIAL_VIEW = (new URLSearchParams(window.location.search).get('view') as ViewType) || 'dashboard';
const VIEW_WORKSPACE: Partial<Record<ViewType, Workspace>> = {
  capabilities: 'Technical', widgets: 'Technical', tactics: 'Technical', networks: 'Technical', models: 'Technical', history: 'Technical',
};
const INITIAL_WORKSPACE: Workspace = VIEW_WORKSPACE[INITIAL_VIEW] ?? 'Creative';

function AppShell() {
  const [currentView, setCurrentView] = useState<ViewType>(INITIAL_VIEW);
  const [workspace, setWorkspace] = useState<Workspace>(INITIAL_WORKSPACE);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { copilotQuery } = useAppContext();

  useEffect(() => {
    if (copilotQuery) { setWorkspace('Creative'); setCurrentView('copilot'); }
  }, [copilotQuery]);

  const allNavItems = [
    // Creative surface (social content)
    { id: 'dashboard' as ViewType,  name: 'Discover',       icon: Home,          category: 'General', workspace: 'Creative' as Workspace },
    { id: 'copilot' as ViewType,    name: 'Co-Pilot',       icon: MessageSquare, category: 'General', workspace: 'Creative' as Workspace },
    { id: 'studio' as ViewType,     name: 'Studio',         icon: Boxes,         category: 'Create',  workspace: 'Creative' as Workspace },
    { id: 'community' as ViewType,  name: 'Community',       icon: Globe,         category: 'Create',  workspace: 'Creative' as Workspace },
    { id: 'lineup' as ViewType,     name: 'Lineup',         icon: Users2,        category: 'Explore', workspace: 'Creative' as Workspace },
    { id: 'similarity' as ViewType, name: 'Scout',          icon: GitBranch,     category: 'Explore', workspace: 'Creative' as Workspace },
    { id: 'calendar' as ViewType,   name: 'Match Calendar', icon: Calendar,      category: 'Explore', workspace: 'Creative' as Workspace },
    // Technical surface — Build sub-group (contribute capabilities)
    { id: 'capabilities' as ViewType, name: 'Capabilities', icon: Layers,        category: 'Build',   workspace: 'Technical' as Workspace },
    { id: 'widgets' as ViewType,      name: 'Widget Lab',   icon: Box,           category: 'Build',   workspace: 'Technical' as Workspace },
    // Technical surface — Analyze sub-group (the existing AI Pro suite)
    { id: 'tactics' as ViewType,    name: 'Tactics Lab',    icon: Target,        category: 'Analyze', workspace: 'Technical' as Workspace },
    { id: 'networks' as ViewType,   name: 'Networks',       icon: Network,       category: 'Analyze', workspace: 'Technical' as Workspace },
    { id: 'models' as ViewType,     name: 'Model Sandbox',  icon: Cpu,           category: 'Analyze', workspace: 'Technical' as Workspace },
    { id: 'history' as ViewType,    name: 'Historical Data',icon: Database,      category: 'Analyze', workspace: 'Technical' as Workspace },
  ];

  const switchWorkspace = (ws: Workspace) => {
    setWorkspace(ws);
    const first = allNavItems.find(i => i.workspace === ws);
    if (first) setCurrentView(first.id);
  };

  const visibleNav = allNavItems.filter(i => i.workspace === workspace);
  const categories = [...new Set(visibleNav.map(i => i.category))];

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':   return <Dashboard onOpenAgent={() => setCurrentView('copilot')} onNavigate={v => setCurrentView(v as ViewType)} />;
      case 'copilot':     return <PeladaAgent onNavigate={(v) => setCurrentView(v as ViewType)} currentView={currentView} isOpen={true} onOpenChange={() => {}} fullPage />;
      case 'studio':      return <StudioView />;
      case 'lineup':      return <LineupView />;
      case 'similarity':  return <PlayerSimilarity />;
      case 'community':   return <CommunityLibrary />;
      case 'widgets':     return <WidgetBuilder />;
      case 'calendar':    return <CalendarView />;
      case 'capabilities':return <CapabilitiesView />;
      case 'tactics':     return <TacticsView />;
      case 'networks':    return <NetworksView onNavigate={v => setCurrentView(v as ViewType)} />;
      case 'models':      return <ModelPlayground />;
      case 'history':     return <HistoricalAnalysis />;
      default:            return <Dashboard onOpenAgent={() => setCurrentView('copilot')} onNavigate={v => setCurrentView(v as ViewType)} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-zinc-100 font-sans overflow-hidden selection:bg-cyan-500/30 relative">
      {/* Liquid mesh background */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-green-500/15 blur-[120px] rounded-full mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-sky-500/15 blur-[100px] rounded-full mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-pink-500/10 blur-[80px] rounded-full mix-blend-screen" />
      </div>

      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-black/40 backdrop-blur-2xl border-r border-white/5 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] z-20 shadow-[8px_0_32px_0_rgba(0,0,0,0.5)] shrink-0`}>
        {/* Logo */}
        <div className="h-20 flex items-center px-6 border-b border-white/5 relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-8 h-8 rounded-lg shrink-0 overflow-hidden relative" style={{ background: '#000' }}>
              <svg className="absolute inset-0" viewBox="0 0 32 32" width="32" height="32" aria-hidden fill="none">
                <polyline points="1,5 8,13 16,5 24,13 31,5"   stroke="#F59E0B" strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" />
                <polyline points="1,27 8,19 16,27 24,19 31,27" stroke="#009C3B" strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span style={{ fontWeight: 900, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#fff', lineHeight: 1 }}>PELADA.</span>
                <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>Analytics OS</span>
              </div>
            )}
          </div>
        </div>

        {/* Workspace switcher — the three on-platform role surfaces */}
        <div className="px-3 pt-4 shrink-0">
          <div className={`flex bg-white/5 rounded-xl p-1 border border-white/8 ${!isSidebarOpen ? 'flex-col gap-1' : 'gap-0.5'}`}>
            {WORKSPACES.map(ws => {
              const Icon = ws.icon;
              const active = workspace === ws.id;
              return (
                <button
                  key={ws.id}
                  onClick={() => switchWorkspace(ws.id)}
                  title={ws.blurb}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    active ? 'bg-white/10 text-white border border-white/10 shadow-[0_0_12px_rgba(255,255,255,0.06)]' : 'text-zinc-500 hover:text-zinc-300'
                  } ${!isSidebarOpen ? 'px-0' : 'px-1'}`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {isSidebarOpen && <span>{ws.label}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
          {categories.map(category => {
            const accent = CATEGORY_ACCENT[category as keyof typeof CATEGORY_ACCENT] ?? CATEGORY_ACCENT.General;
            return (
              <div key={category}>
                {isSidebarOpen && (
                  <div className={`px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.15em] ${accent.label}`}>{category}</div>
                )}
                <div className="space-y-1">
                  {visibleNav.filter(i => i.category === category).map(item => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setCurrentView(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden ${
                          isActive ? 'text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {isActive && <div className={`absolute inset-0 bg-gradient-to-r ${accent.grad} border border-white/5 rounded-xl`} />}
                        <Icon className={`w-4 h-4 relative z-10 shrink-0 ${isActive ? accent.icon : 'group-hover:text-zinc-200'}`} />
                        {isSidebarOpen && <span className="relative z-10 truncate">{item.name}</span>}
                        {isActive && isSidebarOpen && <div className={`absolute right-3 w-1.5 h-1.5 rounded-full ${accent.dot} ${accent.dotGlow}`} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* User */}
        <div className="p-4 border-t border-white/5 bg-black/20 space-y-3 shrink-0">
          {/* User profile */}
          <button className="flex items-center gap-3 w-full p-2.5 rounded-xl bg-white/5 hover:bg-white/8 transition-all border border-white/5 group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 p-[2px] shadow-lg shrink-0">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                <span className="text-xs font-bold text-white">JD</span>
              </div>
            </div>
            {isSidebarOpen && (
              <>
                <div className="flex-1 overflow-hidden text-left">
                  <div className="text-xs font-semibold text-white truncate">Alex Morgan</div>
                  <div className="text-[10px] text-zinc-500 capitalize">Creator · Level 42</div>
                </div>
                <Settings className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Header with match context bar */}
        <header className="h-16 flex items-center gap-3 px-6 border-b border-white/5 bg-transparent backdrop-blur-sm sticky top-0 z-50 shrink-0">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-all border border-transparent hover:border-white/10 shrink-0"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex-1" />

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-all relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-pink-500 rounded-full" />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-zinc-200 transition-all shadow-[0_0_16px_rgba(255,255,255,0.15)]">
              <Globe className="w-3 h-3" />
              Connect
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {renderView()}
          </div>
        </div>
      </main>

      {/* Context panel (slides in from right over content) */}
      <ContextPanel onNavigateToCopilot={() => setCurrentView('copilot')} />
    </div>
  );
}

export default function App() {
  return (
    <DataContextProvider>
      <AppContextProvider>
        <AppShell />
      </AppContextProvider>
    </DataContextProvider>
  );
}
