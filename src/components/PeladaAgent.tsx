import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useAppContext } from '../context/AppContext';
import { DataContext } from '../context/DataContext';
import {
  X, Send, Sparkles, Bot, ArrowRight, Maximize2, Minimize2, User, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PassMap from './visualizations/PassMap';
import PressureTimeline from './visualizations/PressureTimeline';
import QuadrantPlot from './visualizations/QuadrantPlot';
import SetPieceAnalysis from './visualizations/SetPieceAnalysis';

type Message = {
  id: string;
  type: 'user' | 'agent';
  text?: string;
  visualization?: 'passmap' | 'pressure' | 'quadrant' | 'setpiece';
  action?: { label: string; view: string };
};

type ViewType = 'dashboard' | 'copilot' | 'tactics' | 'models' | 'widgets' | 'benchmarks' | 'formation' | 'history' | 'calendar';

interface PeladaAgentProps {
  onNavigate: (view: ViewType) => void;
  currentView: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  fullPage?: boolean;
}

const VIEW_LABELS: Record<string, string> = {
  dashboard: 'Hub', copilot: 'Co-Pilot', tactics: 'Tactics Studio',
  models: 'Model Sandbox', widgets: 'Widget Builder', benchmarks: 'Benchmarks',
  formation: 'Formation Analysis', history: 'Historical Data', calendar: 'Match Calendar',
};

const QUICK_PROMPTS = [
  { label: 'Team xG quadrant', prompt: 'Show me a team xG quadrant comparison' },
  { label: 'Pass map', prompt: 'Show me a pass map' },
  { label: 'Pressure timeline', prompt: 'Show a pressure timeline' },
  { label: 'Tactics Studio', prompt: 'Take me to the Tactics Studio' },
];

const VIZ_COMPONENTS: Record<string, React.ReactElement> = {
  passmap: <PassMap />,
  pressure: <PressureTimeline />,
  quadrant: <QuadrantPlot />,
  setpiece: <SetPieceAnalysis />,
};

// ─── sub-components defined OUTSIDE parent so React identity stays stable ────

function TypingDots() {
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border border-white/10 flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-purple-300" />
      </div>
      <div className="bg-white/5 border border-white/8 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5 items-center">
        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
      </div>
    </div>
  );
}

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

function ChatInput({ value, onChange, onSend, placeholder = 'Ask anything...', autoFocus }: ChatInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);

  return (
    <div className="relative">
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onSend()}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-5 pr-14 py-4 text-sm text-white focus:outline-none focus:border-purple-500/60 focus:bg-white/8 transition-all placeholder:text-zinc-500"
      />
      <button
        onClick={onSend}
        disabled={!value.trim()}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl text-white shadow-lg hover:shadow-purple-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
      >
        <Send className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function PeladaAgent({ onNavigate, currentView, isOpen, onOpenChange, fullPage = false }: PeladaAgentProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { copilotQuery, setCopilotQuery, activeMatchId, selectedPlayer } = useAppContext();
  const { matchMeta, events } = useContext(DataContext);

  const matchInfo = matchMeta.find((m: any) => m.match_id === activeMatchId) ?? null;

  const playerStats = selectedPlayer ? (() => {
    const ev = events.filter((e: any) => e.match_id === selectedPlayer.match_id && e.from_player_name === selectedPlayer.name);
    const passes = ev.filter((e: any) => e.event === 'pass');
    const shots = ev.filter((e: any) => e.event === 'shot');
    return {
      passes: passes.length,
      passesComplete: passes.filter((e: any) => e.outcome === 'complete').length,
      shots: shots.length,
      shotsOnTarget: shots.filter((e: any) => ['saved', 'goal'].includes(e.outcome ?? '')).length,
      pressures: ev.filter((e: any) => e.event === 'pressure').length,
      xg: parseFloat(shots.reduce((s: number, e: any) => s + (e.xg ?? 0), 0).toFixed(2)),
    };
  })() : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const buildHistory = (msgs: Message[]) =>
    msgs.filter(m => m.text).map(m => ({
      role: m.type === 'user' ? 'user' : 'assistant',
      content: m.text!
    }));

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;
    const userMsg: Message = { id: Date.now().toString(), type: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/langgraph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        message: text,
        history: buildHistory(messages),
        mode: 'agent',
        matchContext: { matchInfo, selectedPlayer, playerStats },
      })
      });
      const data = await res.json();

      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        text: data.final_response || "Done.",
      };
      if (data.visualization_type) {
        // Override API viz type with text-based detection when they conflict,
        // since the LLM sometimes picks "pressure" by default due to context bias.
        const responseText = (data.final_response || '').toLowerCase();
        const textViz =
          responseText.includes('pass map') || responseText.includes('passing network') ? 'passmap'
          : responseText.includes('quadrant') || responseText.includes('scatter') ? 'quadrant'
          : responseText.includes('set piece') || responseText.includes('corner') || responseText.includes('free kick') ? 'setpiece'
          : responseText.includes('pressure') || responseText.includes('pressing') ? 'pressure'
          : null;
        agentMsg.visualization = (textViz || data.visualization_type) as Message['visualization'];
      }
      if (data.navigation) agentMsg.action = { label: `Open ${VIEW_LABELS[data.navigation]}`, view: data.navigation };

      setMessages(prev => [...prev, agentMsg]);
      if (data.navigation && !data.visualization_type) onNavigate(data.navigation as ViewType);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        text: "Connection error — make sure the API key is configured."
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [isTyping, messages, onNavigate]);

  const handleSend = useCallback(() => sendMessage(inputValue), [sendMessage, inputValue]);

  useEffect(() => {
    if (copilotQuery && fullPage) {
      sendMessage(copilotQuery);
      setCopilotQuery(null);
    }
  }, [copilotQuery, fullPage]);

  // ── markdown renderer: headers, bullets, bold, italic ───────────────────
  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**'))
        return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
      if (part.startsWith('*') && part.endsWith('*'))
        return <em key={i} className="italic">{part.slice(1, -1)}</em>;
      return part;
    });
  };

  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('### '))
        return <p key={i} className="font-semibold text-white mt-2 mb-0.5">{renderInline(line.slice(4))}</p>;
      if (line.startsWith('## '))
        return <p key={i} className="font-bold text-white mt-3 mb-0.5">{renderInline(line.slice(3))}</p>;
      if (line.startsWith('- '))
        return <p key={i} className="pl-3 text-zinc-200">· {renderInline(line.slice(2))}</p>;
      if (line.trim() === '')
        return <span key={i} className="block h-2" />;
      return <span key={i} className="block">{renderInline(line)}</span>;
    });
  };

  // ── shared message renderer ──────────────────────────────────────────────

  const renderMessage = (msg: Message) => (
    <motion.div
      key={msg.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-3"
    >
      {/* Text bubble row — constrained width */}
      {(msg.text || msg.action) && (
        <div className={`flex gap-3 max-w-3xl mx-auto w-full ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
          {/* Avatar */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
            msg.type === 'user'
              ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
              : 'bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border border-white/10'
          }`}>
            {msg.type === 'user'
              ? <User className="w-4 h-4 text-white" />
              : <Bot className="w-4 h-4 text-purple-300" />}
          </div>

          <div className={`flex flex-col gap-2 ${msg.type === 'user' ? 'items-end max-w-[75%]' : 'items-start w-full'}`}>
            {msg.text && (
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.type === 'user'
                  ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-tr-sm shadow-lg shadow-purple-900/30'
                  : 'bg-white/6 border border-white/8 text-zinc-100 rounded-tl-sm'
              }`}>
                {msg.type === 'agent' ? renderMarkdown(msg.text) : msg.text}
              </div>
            )}

            {msg.action && (
              <button
                onClick={() => onNavigate(msg.action!.view as ViewType)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white transition-all group"
              >
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                {msg.action.label}
                <ArrowRight className="w-3.5 h-3.5 ml-auto group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Visualization — full chat width, no avatar, no bubble constraint */}
      {msg.visualization && VIZ_COMPONENTS[msg.visualization] && (
        <div className="w-full rounded-2xl overflow-hidden border border-white/10 shadow-xl">
          {VIZ_COMPONENTS[msg.visualization]}
        </div>
      )}
    </motion.div>
  );

  // ── empty state ──────────────────────────────────────────────────────────

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full gap-8 text-center px-8">
      <div className="space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(139,92,246,0.15)]">
          <Sparkles className="w-7 h-7 text-purple-400" />
        </div>
        <h2 className="text-lg font-bold text-white">Pelada Co-Pilot</h2>
        <p className="text-sm text-zinc-400 leading-relaxed max-w-xs">
          Ask me to visualize data, navigate to a section, or analyze a tactical idea.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {QUICK_PROMPTS.map(q => (
          <button
            key={q.prompt}
            onClick={() => sendMessage(q.prompt)}
            className="px-3.5 py-2 bg-white/5 hover:bg-purple-500/15 border border-white/8 hover:border-purple-500/40 rounded-xl text-xs text-zinc-300 hover:text-white transition-all font-medium"
          >
            {q.label}
          </button>
        ))}
      </div>
    </div>
  );

  // ── full-page layout ─────────────────────────────────────────────────────

  if (fullPage) {
    return (
      <div className="h-full flex flex-col bg-black/40 backdrop-blur-2xl rounded-3xl border border-white/5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)]">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-white">Co-Pilot</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_#4ade80]" />
                <span className="text-[10px] text-green-400 font-medium uppercase tracking-wide">Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="p-6 space-y-6">
              {messages.map(renderMessage)}
              {isTyping && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto">
                  <TypingDots />
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-8 pb-8 pt-4 border-t border-white/5 bg-black/20 shrink-0">
          <div className="max-w-3xl mx-auto space-y-3">
            <ChatInput
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSend}
              placeholder="Ask about pass maps, tactics, formations, or navigate the platform..."
              autoFocus
            />
            {messages.length === 0 && (
              <div className="flex gap-2 flex-wrap">
                {QUICK_PROMPTS.map(q => (
                  <button
                    key={q.prompt}
                    onClick={() => sendMessage(q.prompt)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/8 border border-white/8 hover:border-purple-500/40 rounded-lg text-[11px] text-zinc-400 hover:text-zinc-200 transition-all"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── floating panel ───────────────────────────────────────────────────────

  return (
    <>
      <AnimatePresence>
        {!isOpen && currentView !== 'dashboard' && currentView !== 'copilot' && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => onOpenChange(true)}
            className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(147,51,234,0.5)] border border-white/20 z-50 hover:scale-110 transition-transform cursor-pointer"
          >
            <div className="absolute inset-0 rounded-full border border-white/30 animate-ping opacity-20" />
            <Sparkles className="w-6 h-6 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={`fixed z-50 bg-[#0a0a0f]/95 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col rounded-3xl overflow-hidden
              ${isMinimized ? 'bottom-8 right-8 w-72 h-16' : 'bottom-8 right-8 w-[400px] h-[580px]'}
            `}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 bg-white/[0.02] cursor-pointer shrink-0"
              onClick={() => setIsMinimized(m => !m)}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <span className="text-sm font-bold text-white leading-none block">Co-Pilot</span>
                  <span className="text-[10px] text-green-400 font-medium">Online</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                <button onClick={() => setIsMinimized(m => !m)} className="p-1.5 hover:bg-white/8 rounded-lg text-zinc-400 hover:text-white transition-colors">
                  {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => onOpenChange(false)} className="p-1.5 hover:bg-white/8 rounded-lg text-zinc-400 hover:text-white transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {messages.length === 0 ? (
                    <div className="p-5 space-y-3">
                      <p className="text-xs text-zinc-500 text-center">Try a quick action:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_PROMPTS.map(q => (
                          <button
                            key={q.prompt}
                            onClick={() => sendMessage(q.prompt)}
                            className="px-3 py-1.5 bg-white/5 hover:bg-purple-500/15 border border-white/8 hover:border-purple-500/40 rounded-lg text-[11px] text-zinc-400 hover:text-white transition-all"
                          >
                            {q.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 space-y-4">
                      {messages.map(renderMessage)}
                      {isTyping && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <TypingDots />
                        </motion.div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-white/8 bg-black/30 shrink-0">
                  <ChatInput
                    value={inputValue}
                    onChange={setInputValue}
                    onSend={handleSend}
                    autoFocus={isOpen}
                  />
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
