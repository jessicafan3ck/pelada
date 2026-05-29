import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, X, Sparkles, Loader2, RotateCcw, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getWWCTournamentPlayerStats,
  getMen2022PlayerStats,
  getWWCPlayerPool,
  type TournamentPlayerStat,
  type M22PlayerStat,
  type WomenPlayer,
} from '../../services/wwcData';

// ── Types & Constants ────────────────────────────────────────────────────────

type StatKey = 'shooting' | 'passing' | 'dribbling' | 'pressing' | 'physicality' | 'pace';
type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

const STAT_KEYS: StatKey[] = ['shooting', 'passing', 'dribbling', 'pressing', 'physicality', 'pace'];
const STAT_ABBR: Record<StatKey, string> = { shooting:'SHO', passing:'PAS', dribbling:'DRI', pressing:'PRE', physicality:'PHY', pace:'PAC' };
const STAT_COLOR: Record<StatKey, string> = { shooting:'#f87171', passing:'#60a5fa', dribbling:'#a78bfa', pressing:'#fbbf24', physicality:'#34d399', pace:'#22d3ee' };
const POS_STYLE: Record<Position, { bg: string; text: string }> = {
  GK:  { bg: 'rgba(120,53,15,0.9)',  text: '#fde68a' },
  DEF: { bg: 'rgba(6,78,59,0.9)',    text: '#6ee7b7' },
  MID: { bg: 'rgba(49,46,129,0.9)',  text: '#a5b4fc' },
  FWD: { bg: 'rgba(127,29,29,0.9)',  text: '#fca5a5' },
};
const RARITY = (ovr: number) => ovr >= 94 ? 'legendary' : ovr >= 88 ? 'iconic' : 'rare';
const RARITY_LABEL = { legendary: 'LEGENDARY', iconic: 'ICONIC', rare: 'RARE' };
const RARITY_COLOR = { legendary: '#fbbf24', iconic: '#c084fc', rare: '#38bdf8' };
const RARITY_BG = {
  legendary: 'linear-gradient(160deg, #1a0f00 0%, #3d2000 40%, #1a0f00 100%)',
  iconic:    'linear-gradient(160deg, #0d001a 0%, #2d0050 40%, #0d001a 100%)',
  rare:      'linear-gradient(160deg, #00101a 0%, #002a45 40%, #00101a 100%)',
};

// ── Country → Flag Map ───────────────────────────────────────────────────────

const TEAM_FLAG: Record<string, string> = {
  // WWC 2023 (after stripping " Women's")
  'Australia': '🇦🇺', 'Nigeria': '🇳🇬', 'Canada': '🇨🇦',
  'Republic of Ireland': '🇮🇪', 'Japan': '🇯🇵', 'Zambia': '🇿🇲',
  'Spain': '🇪🇸', 'Costa Rica': '🇨🇷', 'United States': '🇺🇸',
  'Vietnam': '🇻🇳', 'Netherlands': '🇳🇱', 'Portugal': '🇵🇹',
  'France': '🇫🇷', 'Jamaica': '🇯🇲', 'Brazil': '🇧🇷',
  'Panama': '🇵🇦', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Haiti': '🇭🇹',
  'Denmark': '🇩🇰', 'China PR': '🇨🇳', 'Sweden': '🇸🇪',
  'South Africa': '🇿🇦', 'New Zealand': '🇳🇿', 'Norway': '🇳🇴',
  'Philippines': '🇵🇭', 'Switzerland': '🇨🇭', 'Germany': '🇩🇪',
  'Morocco': '🇲🇦', 'Colombia': '🇨🇴', 'South Korea': '🇰🇷',
  'Argentina': '🇦🇷',
  // WC 2022 men's
  'Qatar': '🇶🇦', 'Ecuador': '🇪🇨', 'Senegal': '🇸🇳',
  'Iran': '🇮🇷', 'USA': '🇺🇸', 'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Tunisia': '🇹🇳', 'Ghana': '🇬🇭', 'Saudi Arabia': '🇸🇦',
  'Mexico': '🇲🇽', 'Poland': '🇵🇱', 'Belgium': '🇧🇪',
  'Croatia': '🇭🇷', 'Serbia': '🇷🇸', 'Cameroon': '🇨🇲',
  'Uruguay': '🇺🇾',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function stripWomens(s: string) { return s.replace(" Women's", ''); }

function mapPosition(pos: string): Position {
  if (!pos) return 'MID';
  if (pos.includes('Goalkeeper')) return 'GK';
  if (pos.includes('Wing Back') || pos.includes('Back') || pos.includes('Center Back')) return 'DEF';
  if (pos.includes('Wing') || pos.includes('Forward') || pos.includes('Striker')) return 'FWD';
  return 'MID';
}

function pNorm(val: number, vals: number[], lo = 50, hi = 99): number {
  const sorted = [...vals].sort((a, b) => a - b);
  const p5  = sorted[Math.max(0, Math.floor(sorted.length * 0.05))];
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  if (p95 <= p5) return Math.round((lo + hi) / 2);
  const t = Math.max(0, Math.min(1, (val - p5) / (p95 - p5)));
  return Math.round(lo + t * (hi - lo));
}

// ── Player Database (built from Supabase) ────────────────────────────────────

interface Player {
  id: string; name: string; country: string; flag: string;
  position: Position; gender: 'male' | 'female';
  stats: Record<StatKey, number>;
}

type AnyPlayerStat = TournamentPlayerStat | M22PlayerStat;

function buildPlayerDb(
  women: TournamentPlayerStat[],
  men: M22PlayerStat[],
  pool: WomenPlayer[],
): Player[] {
  const MIN_MIN = 90;

  const wPosMap: Record<number, string> = {};
  pool.forEach(p => { if (p.player_id && !wPosMap[p.player_id]) wPosMap[p.player_id] = p.position; });

  type Entry = { src: AnyPlayerStat; gender: 'female' | 'male'; pos: Position };
  const entries: Entry[] = [];

  for (const w of women) {
    if ((w.minutes_played ?? 0) < MIN_MIN) continue;
    entries.push({ src: w, gender: 'female', pos: mapPosition(wPosMap[w.player_id] ?? '') });
  }
  for (const m of men) {
    if ((m.minutes_played ?? 0) < MIN_MIN) continue;
    entries.push({ src: m, gender: 'male', pos: mapPosition(m.position ?? '') });
  }

  // Position multipliers for physicality and pace
  const PHYS_MUL: Record<Position, number> = { GK: 1.3, DEF: 1.4, MID: 1.0, FWD: 0.8 };
  const PACE_MUL: Record<Position, number> = { GK: 0.5, DEF: 0.85, MID: 1.0, FWD: 1.3 };

  // Raw per-90 metrics for each player
  const raws = entries.map(({ src, pos }) => {
    const min = Math.max(src.minutes_played, 1);
    const xg_p90    = (src.xg  ?? 0) / min * 90;
    const sot_ratio = src.shots > 0 ? (src.shots_on_target ?? 0) / src.shots : 0;
    const goals_p90 = (src.goals ?? 0) / min * 90;
    const passPct   = src.passes > 0 ? (src.passes_complete ?? 0) / src.passes : 0;
    const kp_p90    = Math.min((src.key_passes ?? 0) / min * 90, 2);
    const drib_p90  = (src.dribbles_complete ?? 0) / min * 90;
    const press_p90 = (src.pressures ?? 0) / min * 90;
    return {
      shooting:    xg_p90 * 0.5 + sot_ratio * 0.35 + goals_p90 * 0.15,
      passing:     passPct * 0.65 + kp_p90 * 0.35,
      dribbling:   drib_p90,
      pressing:    press_p90,
      physicality: press_p90 * PHYS_MUL[pos],
      pace:        drib_p90 * PACE_MUL[pos],
    };
  });

  const allVals = (k: StatKey) => raws.map(r => r[k]);
  const shootVals = allVals('shooting'), passVals = allVals('passing'),
        dribVals  = allVals('dribbling'), pressVals = allVals('pressing'),
        physVals  = allVals('physicality'), paceVals = allVals('pace');

  const players: Player[] = entries.map(({ src, gender, pos }, i) => {
    const country = stripWomens(src.team ?? '');
    return {
      id:       String(src.player_id),
      name:     src.player_name,
      country,
      flag:     TEAM_FLAG[country] ?? '🏳',
      position: pos,
      gender,
      stats: {
        shooting:    pNorm(raws[i].shooting,    shootVals),
        passing:     pNorm(raws[i].passing,     passVals),
        dribbling:   pNorm(raws[i].dribbling,   dribVals),
        pressing:    pNorm(raws[i].pressing,    pressVals),
        physicality: pNorm(raws[i].physicality, physVals),
        pace:        pNorm(raws[i].pace,        paceVals),
      },
    };
  });

  // Sort by OVR descending so best players appear first in search
  players.sort((a, b) => computeOVR(b.stats) - computeOVR(a.stats));
  return players;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cosineSim(a: number[], b: number[]): number {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const mA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const mB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return dot / (mA * mB);
}

function computeOVR(stats: Record<StatKey, number>): number {
  const w = { shooting:0.22, passing:0.20, dribbling:0.18, pressing:0.15, physicality:0.12, pace:0.13 };
  return Math.round(STAT_KEYS.reduce((s, k) => s + stats[k] * w[k], 0));
}

function findSimilar(stats: Record<StatKey, number>, db: Player[]): Array<{ player: Player; pct: number }> {
  const vec = STAT_KEYS.map(k => stats[k]);
  return db
    .map(p => ({ player: p, pct: Math.round(cosineSim(vec, STAT_KEYS.map(k => p.stats[k])) * 100) }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 2);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CardRadar({ stats, color }: { stats: Record<StatKey, number>; color: string }) {
  const S = 100, C = 50, R = 36;
  const angles = STAT_KEYS.map((_, i) => (i * Math.PI * 2) / 6 - Math.PI / 2);
  const outer = angles.map(a => ({ x: C + R * Math.cos(a), y: C + R * Math.sin(a) }));
  const inner = angles.map((a, i) => ({
    x: C + R * Math.cos(a) * (STAT_KEYS.map(k => stats[k])[i] / 100),
    y: C + R * Math.sin(a) * (STAT_KEYS.map(k => stats[k])[i] / 100),
  }));
  const outerPoly = outer.map(p => `${p.x},${p.y}`).join(' ');
  const innerPoly = inner.map(p => `${p.x},${p.y}`).join(' ');
  const ring1 = angles.map(a => `${C + R * 0.33 * Math.cos(a)},${C + R * 0.33 * Math.sin(a)}`).join(' ');
  const ring2 = angles.map(a => `${C + R * 0.66 * Math.cos(a)},${C + R * 0.66 * Math.sin(a)}`).join(' ');

  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
      <polygon points={ring1} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      <polygon points={ring2} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      <polygon points={outerPoly} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />
      {outer.map((p, i) => (
        <line key={i} x1={C} y1={C} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      ))}
      <polygon points={innerPoly} fill={`${color}28`} stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {inner.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />
      ))}
    </svg>
  );
}

interface GoatCardProps {
  stats: Record<StatKey, number>;
  nickname: string;
  description: string;
  similar: Array<{ player: Player; pct: number }>;
  sources: Partial<Record<StatKey, Player>>;
}

function GoatCard({ stats, nickname, similar, sources }: GoatCardProps) {
  const ovr = computeOVR(stats);
  const tier = RARITY(ovr);
  const color = RARITY_COLOR[tier];
  const posCounts: Record<string, number> = {};
  Object.values(sources).forEach(p => { if (p) posCounts[p.position] = (posCounts[p.position] || 0) + 1; });
  const position = (Object.entries(posCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'FWD') as Position;
  const posStyle = POS_STYLE[position];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes goat-shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }
        .goat-shimmer-layer { background:linear-gradient(105deg,transparent 20%,rgba(255,255,255,0.07) 40%,transparent 60%); background-size:200% 100%; animation:goat-shimmer 3s infinite linear; pointer-events:none; }
        @keyframes goat-holo { 0%,100%{opacity:0.5;} 50%{opacity:0.85;} }
        .goat-holo-layer { background:linear-gradient(135deg,rgba(255,255,255,0.03) 0%,${color}18 25%,rgba(255,255,255,0.05) 50%,${color}10 75%,rgba(255,255,255,0.03) 100%); animation:goat-holo 4s infinite ease-in-out; pointer-events:none; }
      `}</style>
      <div style={{ width:280, background:RARITY_BG[tier], borderRadius:16, border:`1px solid ${color}40`, boxShadow:`0 0 40px ${color}25, 0 20px 60px rgba(0,0,0,0.8)`, position:'relative', overflow:'hidden', userSelect:'none' }}>
        <div className="goat-shimmer-layer" style={{ position:'absolute', inset:0, borderRadius:16, zIndex:1 }} />
        <div className="goat-holo-layer"   style={{ position:'absolute', inset:0, borderRadius:16, zIndex:1 }} />
        <div style={{ position:'relative', zIndex:2, padding:'18px 16px 16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
            <div>
              <div style={{ fontSize:52, fontWeight:900, lineHeight:1, color, letterSpacing:-2 }}>{ovr}</div>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:3, color:`${color}cc`, marginTop:1 }}>{RARITY_LABEL[tier]}</div>
            </div>
            <div style={{ background:posStyle.bg, color:posStyle.text, borderRadius:6, padding:'4px 10px', fontSize:11, fontWeight:800, letterSpacing:1.5, border:`1px solid ${posStyle.text}30` }}>
              {position}
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'center', margin:'8px 0 12px' }}>
            <CardRadar stats={stats} color={color} />
          </div>
          <div style={{ textAlign:'center', marginBottom:14 }}>
            <div style={{ fontSize:15, fontWeight:900, color:'#ffffff', letterSpacing:0.5, textTransform:'uppercase', lineHeight:1.2 }}>{nickname}</div>
            <div style={{ fontSize:9, color:`${color}99`, letterSpacing:2, marginTop:3, textTransform:'uppercase' }}>★ GOAT BUILDER ★</div>
          </div>
          <div style={{ height:1, background:`linear-gradient(90deg,transparent,${color}50,transparent)`, marginBottom:12 }} />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:2, marginBottom:14 }}>
            {STAT_KEYS.map(k => (
              <div key={k} style={{ textAlign:'center' }}>
                <div style={{ fontSize:15, fontWeight:800, color:sources[k] ? STAT_COLOR[k] : 'rgba(255,255,255,0.35)', lineHeight:1 }}>{stats[k]}</div>
                <div style={{ fontSize:7, color:'rgba(255,255,255,0.4)', fontWeight:600, letterSpacing:1, marginTop:2 }}>{STAT_ABBR[k]}</div>
              </div>
            ))}
          </div>
          <div style={{ height:1, background:`linear-gradient(90deg,transparent,${color}30,transparent)`, marginBottom:10 }} />
          <div>
            <div style={{ fontSize:8, color:`${color}80`, fontWeight:700, letterSpacing:2, marginBottom:6, textTransform:'uppercase' }}>Most Similar To</div>
            {similar.map(({ player, pct }) => (
              <div key={player.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                <span style={{ fontSize:10, color:'rgba(255,255,255,0.75)', fontWeight:600 }}>{player.flag} {player.name}</span>
                <span style={{ fontSize:10, color, fontWeight:800 }}>{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

interface BorrowedStat { key: StatKey; value: number; player: Player; }
interface Generated {
  nickname: string; description: string;
  stats: Record<StatKey, number>;
  similar: Array<{ player: Player; pct: number }>;
  sources: Partial<Record<StatKey, Player>>;
}

export default function GoatBuilder() {
  const [playerDb, setPlayerDb] = useState<Player[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Player | null>(null);
  const [borrowed, setBorrowed] = useState<BorrowedStat[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<Generated | null>(null);

  useEffect(() => {
    Promise.all([
      getWWCTournamentPlayerStats(),
      getMen2022PlayerStats(),
      getWWCPlayerPool(),
    ]).then(([women, men, pool]: [TournamentPlayerStat[], M22PlayerStat[], WomenPlayer[]]) => {
      setPlayerDb(buildPlayerDb(women, men, pool));
      setDbLoading(false);
    }).catch(() => setDbLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q
      ? playerDb.filter(p => p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q))
      : playerDb;
  }, [search, playerDb]);

  const baseStats = useMemo((): Record<StatKey, number> => {
    if (!playerDb.length) {
      return STAT_KEYS.reduce((o, k) => ({ ...o, [k]: 70 }), {} as Record<StatKey, number>);
    }
    return STAT_KEYS.reduce((o, k) => ({
      ...o,
      [k]: Math.round(playerDb.reduce((s, p) => s + p.stats[k], 0) / playerDb.length),
    }), {} as Record<StatKey, number>);
  }, [playerDb]);

  const goatStats = useMemo((): Record<StatKey, number> => {
    const out = { ...baseStats };
    borrowed.forEach(b => { out[b.key] = b.value; });
    return out;
  }, [borrowed, baseStats]);

  const previewOVR = computeOVR(goatStats);

  function borrow(key: StatKey) {
    if (!selected) return;
    setBorrowed(prev => [...prev.filter(b => b.key !== key), { key, value: selected.stats[key], player: selected }]);
    setGenerated(null);
  }

  function removeBorrow(key: StatKey) {
    setBorrowed(prev => prev.filter(b => b.key !== key));
    setGenerated(null);
  }

  function reset() { setBorrowed([]); setGenerated(null); setSelected(null); setSearch(''); }

  async function generate() {
    if (borrowed.length < 2) return;
    setGenerating(true);
    setGenerated(null);
    const borrowedDesc = borrowed.map(b => `${STAT_ABBR[b.key]}: ${b.value} (${b.player.name})`).join(', ');
    const prompt = `You are generating a player card for a football GOAT builder tool. The user has borrowed: ${borrowedDesc}. Respond with JSON only, no markdown: {"nickname": "...", "description": "..."}. Rules: nickname is 2-4 words, dramatic/poetic. description is exactly 2 punchy sentences specific to the borrowed attributes. Do not use the word GOAT.`;
    const sources: Partial<Record<StatKey, Player>> = {};
    borrowed.forEach(b => { sources[b.key] = b.player; });
    const similar = findSimilar(goatStats, playerDb);
    try {
      const res = await fetch('/api/langgraph', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ message:prompt, mode:'agent', history:[] }) });
      const data = await res.json();
      let parsed = { nickname:'The Untouchable', description:'A player who defies categorisation, equally devastating in creation and destruction. History will argue about the position — the scoreboard will not.' };
      try { const m = (data.final_response||'').match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); } catch { /**/ }
      setGenerated({ ...parsed, stats:goatStats, similar, sources });
    } catch {
      setGenerated({ nickname:'The Untouchable', description:'A player who defies categorisation, equally devastating in creation and destruction. History will argue about the position — the scoreboard will not.', stats:goatStats, similar, sources });
    } finally { setGenerating(false); }
  }

  const canGenerate = borrowed.length >= 2;

  return (
    <div className="h-full overflow-auto p-6">
      <style>{`
        .gb-row:hover { background: rgba(255,255,255,0.05) !important; }
        .gb-scroll::-webkit-scrollbar { width:4px; } .gb-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }
        @keyframes gb-spin { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">GOAT Builder</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {dbLoading
              ? 'Loading player pool from WWC 2023 + WC 2022...'
              : `${playerDb.filter(p => p.gender === 'female').length} women · ${playerDb.filter(p => p.gender === 'male').length} men · Borrow attributes from history's best.`}
          </p>
        </div>
        {(borrowed.length > 0 || generated) && (
          <button onClick={reset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-500 hover:text-white text-xs transition-colors">
            <RotateCcw size={11} /> Reset
          </button>
        )}
      </div>

      <div className={`grid gap-5 items-start ${generated ? 'grid-cols-3' : 'grid-cols-2'}`}>

        {/* Panel 1 — Search */}
        <div>
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Search Players</p>
          <div className="relative mb-3">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or country..."
              className="w-full pl-8 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-xs outline-none focus:border-zinc-600 placeholder:text-zinc-700" />
          </div>

          <div className="gb-scroll flex flex-col gap-0.5 max-h-52 overflow-y-auto relative">
            {dbLoading ? (
              <div className="flex flex-col gap-1.5 py-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-9 rounded-lg bg-zinc-900 animate-pulse" />
                ))}
              </div>
            ) : filtered.map(p => (
              <button key={p.id} className="gb-row flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left w-full transition-colors"
                style={{ background: selected?.id === p.id ? 'rgba(255,255,255,0.07)' : 'transparent' }}
                onClick={() => setSelected(p)}>
                <span className="text-base">{p.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-semibold truncate ${selected?.id === p.id ? 'text-white' : 'text-zinc-300'}`}>{p.name}</div>
                  <div className="text-[10px] text-zinc-600">{p.country} · {p.position} · {p.gender === 'female' ? 'W' : 'M'}</div>
                </div>
                <span className="text-xs font-bold shrink-0" style={{ color: RARITY_COLOR[RARITY(computeOVR(p.stats))] }}>{computeOVR(p.stats)}</span>
              </button>
            ))}
          </div>

          <AnimatePresence>
            {selected && (
              <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                className="mt-3 p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{selected.flag}</span>
                  <div>
                    <div className="text-xs font-bold text-white">{selected.name}</div>
                    <div className="text-[10px] text-zinc-600">Tap an attribute to borrow it</div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {STAT_KEYS.map(k => {
                    const already = borrowed.find(b => b.key === k && b.player.id === selected.id);
                    return (
                      <button key={k} onClick={() => borrow(k)}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all"
                        style={{ background: already ? `${STAT_COLOR[k]}15` : 'rgba(255,255,255,0.02)', border: `1px solid ${already ? STAT_COLOR[k]+'50' : 'rgba(255,255,255,0.06)'}` }}>
                        <span className="text-[10px] font-bold tracking-wider" style={{ color: STAT_COLOR[k] }}>{STAT_ABBR[k]}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black" style={{ color: already ? STAT_COLOR[k] : '#fff' }}>{selected.stats[k]}</span>
                          <Plus size={10} color={already ? STAT_COLOR[k] : 'rgba(255,255,255,0.3)'} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Panel 2 — Build */}
        <div>
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Your GOAT</p>
          <div className="flex flex-col gap-1.5 mb-4">
            {STAT_KEYS.map(k => {
              const b = borrowed.find(x => x.key === k);
              return (
                <div key={k} className="flex items-center justify-between px-3 py-2 rounded-lg transition-all"
                  style={{ background: b ? `${STAT_COLOR[k]}10` : 'rgba(255,255,255,0.02)', border:`1px solid ${b ? STAT_COLOR[k]+'35' : 'rgba(255,255,255,0.05)'}` }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-wider w-6" style={{ color: b ? STAT_COLOR[k] : 'rgba(255,255,255,0.25)' }}>{STAT_ABBR[k]}</span>
                    {b ? <span className="text-[10px] text-zinc-500">{b.player.flag} {b.player.name}</span>
                       : <span className="text-[10px] text-zinc-700 italic">empty</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {b && <span className="text-sm font-black" style={{ color: STAT_COLOR[k] }}>{b.value}</span>}
                    {b && <button onClick={() => removeBorrow(k)} className="p-0 bg-transparent border-none cursor-pointer"><X size={11} color="rgba(255,255,255,0.25)" /></button>}
                  </div>
                </div>
              );
            })}
          </div>

          {borrowed.length > 0 && (
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 mb-4">
              <span className="text-xs text-zinc-500 font-medium">OVR Preview</span>
              <span className="text-2xl font-black" style={{ color: RARITY_COLOR[RARITY(previewOVR)] }}>{previewOVR}</span>
            </div>
          )}

          <button onClick={generate} disabled={!canGenerate || generating || dbLoading}
            className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
            style={{
              background: canGenerate && !dbLoading ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'rgba(255,255,255,0.04)',
              color: canGenerate && !dbLoading ? '#fff' : 'rgba(255,255,255,0.2)',
              border: 'none', cursor: canGenerate && !dbLoading ? 'pointer' : 'not-allowed',
              boxShadow: canGenerate && !dbLoading ? '0 0 20px rgba(124,58,237,0.35)' : 'none',
            }}>
            {generating
              ? <><Loader2 size={14} style={{ animation:'gb-spin 1s linear infinite' }} /> Generating...</>
              : dbLoading
              ? <><Loader2 size={14} style={{ animation:'gb-spin 1s linear infinite' }} /> Loading players...</>
              : <><Sparkles size={14} /> {canGenerate ? 'Generate GOAT' : 'Pick 2+ attributes'}</>}
          </button>
        </div>

        {/* Panel 3 — Card */}
        <AnimatePresence>
          {generated && (
            <motion.div initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0 }} className="flex flex-col gap-4">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Your GOAT Card</p>
              <GoatCard stats={generated.stats} nickname={generated.nickname} description={generated.description} similar={generated.similar} sources={generated.sources} />
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <p className="text-xs text-zinc-400 leading-relaxed italic">"{generated.description}"</p>
              </div>
              <div className="p-3 rounded-xl border" style={{ background:'rgba(124,58,237,0.1)', borderColor:'rgba(124,58,237,0.25)' }}>
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">SSE Similarity</p>
                {generated.similar.map(({ player, pct }) => (
                  <div key={player.id} className="flex justify-between items-center mb-1">
                    <span className="text-xs text-zinc-300 font-semibold">{player.flag} {player.name}</span>
                    <span className="text-xs font-black text-yellow-400">{pct}%</span>
                  </div>
                ))}
              </div>
              <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-800 text-zinc-500 hover:text-white text-xs font-semibold transition-colors bg-transparent cursor-pointer">
                <Share2 size={12} /> Share Card
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
