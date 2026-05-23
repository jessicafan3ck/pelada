import React, { useState, useContext, useMemo } from 'react';
import { DataContext } from '../../context/DataContext';
import { useAppContext } from '../../context/AppContext';

type MetricKey = 'xg_attack' | 'possession' | 'shots' | 'efficiency';

const METRICS: Record<MetricKey, { x: string; y: string; xKey: string; yKey: string; xLabel: string; yLabel: string }> = {
  xg_attack: {
    x: 'xg_for', y: 'xg_against',
    xKey: 'xg_for', yKey: 'xg_against',
    xLabel: 'xG for per game (attack)', yLabel: 'xG against per game (defense)',
  },
  possession: {
    x: 'average_possession', y: 'shots_on_target',
    xKey: 'average_possession', yKey: 'shots_on_target',
    xLabel: 'Avg possession %', yLabel: 'Shots on target (season)',
  },
  shots: {
    x: 'shots', y: 'goals_scored',
    xKey: 'shots', yKey: 'goals_scored',
    xLabel: 'Total shots', yLabel: 'Goals scored',
  },
  efficiency: {
    x: 'goals_scored', y: 'goals_conceded',
    xKey: 'goals_scored', yKey: 'goals_conceded',
    xLabel: 'Goals scored', yLabel: 'Goals conceded',
  },
};

const LEAGUE_COLORS: Record<string, string> = {
  'Premier League': '#38bdf8',
  'La Liga': '#f59e0b',
  'Bundesliga': '#ef4444',
  'Serie A': '#a78bfa',
  'Ligue 1': '#34d399',
  'Champions League': '#fbbf24',
};

const QuadrantPlot = () => {
  const { teamStats, availableLeagues, selectedLeague, setSelectedLeague } = useContext(DataContext);
  const { setCopilotQuery } = useAppContext();
  const [metric, setMetric] = useState<MetricKey>('xg_attack');
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);

  const cfg = METRICS[metric];

  const filteredTeams = useMemo(() => {
    const teams = selectedLeague === 'All'
      ? teamStats
      : teamStats.filter(t => t.league === selectedLeague);
    return teams.filter(t => (t as any)[cfg.xKey] > 0 || (t as any)[cfg.yKey] > 0);
  }, [teamStats, selectedLeague, cfg]);

  const xVals = filteredTeams.map(t => (t as any)[cfg.xKey] as number);
  const yVals = filteredTeams.map(t => (t as any)[cfg.yKey] as number);
  const maxX = Math.max(...xVals, 1);
  const maxY = Math.max(...yVals, 1);
  const avgX = xVals.length ? xVals.reduce((a, b) => a + b, 0) / xVals.length : 0;
  const avgY = yVals.length ? yVals.reduce((a, b) => a + b, 0) / yVals.length : 0;

  const W = 460, H = 320;
  const PAD = { l: 40, r: 20, t: 20, b: 40 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;

  const px = (v: number) => PAD.l + (v / maxX) * plotW;
  const py = (v: number) => PAD.t + plotH - (v / maxY) * plotH;

  const handleInterpret = () => {
    const topTeams = filteredTeams
      .sort((a, b) => (b as any)[cfg.xKey] - (a as any)[cfg.xKey])
      .slice(0, 5)
      .map(t => `${t.common_name}: ${cfg.xLabel.split('(')[0].trim()} ${(t as any)[cfg.xKey]?.toFixed ? (t as any)[cfg.xKey].toFixed(2) : (t as any)[cfg.xKey]}, ${cfg.yLabel.split('(')[0].trim()} ${(t as any)[cfg.yKey]?.toFixed ? (t as any)[cfg.yKey].toFixed(2) : (t as any)[cfg.yKey]}`)
      .join('; ');
    setCopilotQuery(
      `Interpret this team quadrant chart. Metric: ${cfg.xLabel} vs ${cfg.yLabel}. ` +
      `League/filter: ${selectedLeague}. Average X: ${avgX.toFixed(2)}, average Y: ${avgY.toFixed(2)}. ` +
      `Top teams by X-axis: ${topTeams}. What does this distribution reveal about the teams' tactical profiles?`
    );
  };

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-white flex-1 min-w-0">Team Quadrant</h2>
        <button
          onClick={handleInterpret}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-xs text-purple-200 font-medium transition-all"
        >
          ✦ Interpret
        </button>
        <select
          value={selectedLeague}
          onChange={e => setSelectedLeague(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {availableLeagues.map(l => <option key={l}>{l}</option>)}
        </select>
        <select
          value={metric}
          onChange={e => setMetric(e.target.value as MetricKey)}
          className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="xg_attack">xG Attack vs Defense</option>
          <option value="possession">Possession vs Shots on Target</option>
          <option value="shots">Shots vs Goals</option>
          <option value="efficiency">Goals Scored vs Conceded</option>
        </select>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          {filteredTeams.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
              Loading team data…
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-3 relative overflow-x-auto">
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minHeight: 220 }}>
                {/* grid */}
                <defs>
                  <pattern id="qgrid" width="46" height="32" patternUnits="userSpaceOnUse" x={PAD.l} y={PAD.t}>
                    <path d="M 46 0 L 0 0 0 32" fill="none" stroke="#1f2937" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect x={PAD.l} y={PAD.t} width={plotW} height={plotH} fill="url(#qgrid)" />

                {/* average lines */}
                <line x1={px(avgX)} y1={PAD.t} x2={px(avgX)} y2={PAD.t + plotH} stroke="#4b5563" strokeWidth="1.5" strokeDasharray="4 3"/>
                <line x1={PAD.l} y1={py(avgY)} x2={PAD.l + plotW} y2={py(avgY)} stroke="#4b5563" strokeWidth="1.5" strokeDasharray="4 3"/>

                {/* axis labels */}
                <text x={PAD.l + plotW / 2} y={H - 6} textAnchor="middle" fill="#6b7280" fontSize="11">{cfg.xLabel}</text>
                <text x={10} y={PAD.t + plotH / 2} textAnchor="middle" fill="#6b7280" fontSize="11" transform={`rotate(-90 10 ${PAD.t + plotH / 2})`}>{cfg.yLabel}</text>

                {/* axis scales */}
                <text x={PAD.l} y={PAD.t + plotH + 14} fill="#6b7280" fontSize="9" textAnchor="middle">0</text>
                <text x={PAD.l + plotW} y={PAD.t + plotH + 14} fill="#6b7280" fontSize="9" textAnchor="end">{maxX.toFixed(1)}</text>
                <text x={PAD.l - 4} y={PAD.t + plotH} fill="#6b7280" fontSize="9" textAnchor="end">{0}</text>
                <text x={PAD.l - 4} y={PAD.t + 8} fill="#6b7280" fontSize="9" textAnchor="end">{maxY.toFixed(1)}</text>

                {/* data points */}
                {filteredTeams.map(team => {
                  const x = px((team as any)[cfg.xKey]);
                  const y = py((team as any)[cfg.yKey]);
                  const color = LEAGUE_COLORS[team.league] || '#8b5cf6';
                  const isHovered = hoveredTeam === team.team_name;
                  const label = team.common_name.length > 8 ? team.common_name.substring(0, 7) + '…' : team.common_name;
                  return (
                    <g key={team.team_name}
                      onMouseEnter={() => setHoveredTeam(team.team_name)}
                      onMouseLeave={() => setHoveredTeam(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle cx={x} cy={y} r={isHovered ? 7 : 5} fill={color} fillOpacity={isHovered ? 1 : 0.75} stroke={color} strokeWidth={isHovered ? 2 : 0}/>
                      {isHovered && (
                        <g>
                          <rect x={x + 9} y={y - 22} width={Math.max(label.length * 6.5 + 8, 60)} height={36} rx="4" fill="#1f2937" stroke={color} strokeWidth="1"/>
                          <text x={x + 13} y={y - 8} fill="#f9fafb" fontSize="11" fontWeight="600">{team.common_name}</text>
                          <text x={x + 13} y={y + 6} fill="#9ca3af" fontSize="9">{team.league}</text>
                        </g>
                      )}
                      {!isHovered && (
                        <text x={x} y={y - 7} textAnchor="middle" fill={color} fontSize="9" fontWeight="600">{label}</text>
                      )}
                    </g>
                  );
                })}

                {/* avg label */}
                <text x={px(avgX) + 3} y={PAD.t + 12} fill="#4b5563" fontSize="9">avg {avgX.toFixed(2)}</text>
                <text x={PAD.l + 4} y={py(avgY) - 3} fill="#4b5563" fontSize="9">avg {avgY.toFixed(2)}</text>
              </svg>
            </div>
          )}
        </div>

        {/* legend + stats */}
        <div className="space-y-3">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-semibold text-sm mb-3">Leagues</h3>
            <div className="space-y-2">
              {Object.entries(LEAGUE_COLORS).map(([league, color]) => (
                <div key={league} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }}/>
                  <span className="text-gray-300 text-xs">{league}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 space-y-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{filteredTeams.length}</div>
              <div className="text-gray-400 text-xs uppercase tracking-wide">Teams</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-400">{avgX.toFixed(2)}</div>
              <div className="text-gray-400 text-xs">Avg {cfg.xLabel.split(' (')[0]}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">{avgY.toFixed(2)}</div>
              <div className="text-gray-400 text-xs">Avg {cfg.yLabel.split(' (')[0]}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuadrantPlot;
