import React, { useState, useContext, useMemo } from 'react';
import { DataContext } from '../../context/DataContext';
import { useAppContext } from '../../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const SetPieceAnalysis = () => {
  const { events } = useContext(DataContext);
  const { activeMatchId, setCopilotQuery } = useAppContext();
  const [selectedOrigin, setSelectedOrigin] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState('all');

  const hasValidCoords = (e: any) =>
    (e.x !== null && e.y !== null) ||
    (e.x_location_start !== null && e.y_location_start !== null) ||
    (e.x_location_end !== null && e.y_location_end !== null);

  const matchEvents = useMemo(() =>
    activeMatchId ? events.filter((e: any) => e.match_id === activeMatchId) : events,
    [events, activeMatchId]
  );

  // Get unique teams and origins
  const teams = useMemo(() => {
    const teamNames = [...new Set(matchEvents.map((e: any) => e.team_name).filter(Boolean))];
    return teamNames.sort();
  }, [matchEvents]);

  const origins = useMemo(() => {
    const originTypes = [...new Set(matchEvents.map((e: any) => e.origin).filter(Boolean))];
    return originTypes.sort();
  }, [matchEvents]);

  // Filter events
  const filteredEvents = useMemo(() => {
    let filtered = matchEvents;

    if (selectedTeam !== 'all') {
      filtered = filtered.filter((e: any) => e.team_name === selectedTeam);
    }

    if (selectedOrigin !== 'all') {
      filtered = filtered.filter((e: any) => e.origin === selectedOrigin);
    }

    return filtered;
  }, [matchEvents, selectedTeam, selectedOrigin]);

  // Set piece events
  const setPieceEvents = useMemo(() => {
    return filteredEvents.filter(e => e.origin);
  }, [filteredEvents]);

  // Origin type analysis
  const originAnalysis = useMemo(() => {
    const originStats: Record<string, any> = {};
    
    setPieceEvents.forEach(e => {
      const key = e.origin;
      
      if (!originStats[key]) {
        originStats[key] = {
          total: 0,
          goals: 0,
          onTarget: 0,
          successful: 0,
          events: []
        };
      }
      
      originStats[key].total++;
      originStats[key].events.push(e);
      
      if (e.outcome === 'goal') {
        originStats[key].goals++;
      }
      
      if (e.outcome && (e.outcome.includes('complete') || e.outcome === 'goal' || e.outcome.includes('on_target'))) {
        originStats[key].successful++;
      }
    });
    
    return Object.entries(originStats)
      .map(([origin, stats]) => ({
        origin,
        total: stats.total,
        goals: stats.goals,
        onTarget: stats.onTarget,
        successful: stats.successful,
        conversionRate: stats.total > 0 ? ((stats.goals / stats.total) * 100).toFixed(1) : 0,
        accuracyRate: stats.total > 0 ? ((stats.onTarget / stats.total) * 100).toFixed(1) : 0,
        successRate: stats.total > 0 ? ((stats.successful / stats.total) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [setPieceEvents]);

  // Outcome distribution for set pieces
  const outcomeDistribution = useMemo(() => {
    const outcomes: Record<string, number> = {};
    setPieceEvents.filter(e => e.outcome).forEach(e => {
      outcomes[e.outcome] = (outcomes[e.outcome] || 0) + 1;
    });
    
    const colors: Record<string, string> = {
      'goal': '#10B981',
      'save': '#3B82F6',
      'miss': '#EF4444',
      'block': '#F59E0B',
      'complete': '#8B5CF6',
      'incomplete': '#EC4899'
    };
    
    return Object.entries(outcomes)
      .map(([outcome, count]) => ({
        name: outcome.replace('_', ' ').toUpperCase(),
        value: count,
        color: colors[outcome] || '#6B7280'
      }))
      .sort((a, b) => b.value - a.value);
  }, [setPieceEvents]);

  // Body type analysis for set pieces
  const bodyTypeAnalysis = useMemo(() => {
    const bodyTypes: Record<string, number> = {};
    setPieceEvents.filter(e => e.body_type).forEach(e => {
      bodyTypes[e.body_type] = (bodyTypes[e.body_type] || 0) + 1;
    });
    
    return Object.entries(bodyTypes)
      .map(([bodyType, count]) => ({
        bodyType: bodyType.replace('_', ' ').toUpperCase(),
        count,
        percentage: ((count / setPieceEvents.filter(e => e.body_type).length) * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count);
  }, [setPieceEvents]);

  // Set piece locations
  const setPieceLocations = useMemo(() => {
    return setPieceEvents.filter(hasValidCoords).map(e => ({
      ...e,
      x: e.x ?? e.x_location_start ?? e.x_location_end,
      y: e.y ?? e.y_location_start ?? e.y_location_end
    }));
  }, [setPieceEvents]);

  // Time analysis
  const timeAnalysis = useMemo(() => {
    const timeSlots: any[] = [];
    const maxTime = Math.max(...setPieceEvents.map(e => e.match_time_in_ms || 0));
    const slotDuration = 15 * 60 * 1000;
    
    for (let i = 0; i < maxTime; i += slotDuration) {
      const startTime = i;
      const endTime = i + slotDuration;
      const startMinute = Math.floor(i / 60000);
      const endMinute = Math.floor(endTime / 60000);
      
      const eventsInSlot = setPieceEvents.filter(e => 
        e.match_time_in_ms >= startTime && e.match_time_in_ms < endTime
      );
      
      if (eventsInSlot.length > 0) {
        timeSlots.push({
          period: `${startMinute}-${endMinute}min`,
          count: eventsInSlot.length,
          goals: eventsInSlot.filter(e => e.outcome === 'goal').length
        });
      }
    }
    
    return timeSlots;
  }, [setPieceEvents]);

  const handleInterpret = () => {
    const teamLabel = selectedTeam === 'all' ? 'both teams' : selectedTeam;
    const summary = originAnalysis.slice(0, 4).map(o =>
      `${o.origin}: ${o.total} situations, ${o.goals} goals (${o.conversionRate}% conversion)`
    ).join('; ');
    setCopilotQuery(
      `Interpret this set piece analysis for ${teamLabel} in this WWC 2023 match. ` +
      `${summary || 'No set piece data available'}. ` +
      `What does this tell us about how the team exploited or defended dead-ball situations?`
    );
  };

  return (
    <div className="bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/10 to-blue-600/10 px-6 py-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Set Piece Analysis</h2>
          <div className="flex gap-3">
            <button
              onClick={handleInterpret}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-xs text-purple-200 font-medium transition-all"
            >
              ✦ Interpret
            </button>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 backdrop-blur-sm"
            >
              <option value="all">All Teams</option>
              {teams.map((team: string) => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
            
            <select
              value={selectedOrigin}
              onChange={(e) => setSelectedOrigin(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 backdrop-blur-sm"
            >
              <option value="all">All Set Pieces</option>
              {origins.map((origin: string) => (
                <option key={origin} value={origin}>{origin}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Set Piece Type Effectiveness */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Set Piece Effectiveness</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={originAnalysis}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis 
                  dataKey="origin" 
                  stroke="#9CA3AF" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  fontSize={11}
                />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none', 
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                  labelStyle={{ color: '#F9FAFB' }}
                />
                <Bar dataKey="total" fill="#3B82F6" name="Total" />
                <Bar dataKey="goals" fill="#10B981" name="Goals" />
                <Bar dataKey="onTarget" fill="#F59E0B" name="On Target" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Outcome Distribution */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Set Piece Outcomes</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={outcomeDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  fontSize={12}
                >
                  {outcomeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none', 
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Set Piece Locations */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Set Piece Locations</h3>
            <div className="bg-green-800/20 border border-green-500/20 rounded-lg p-4 relative" style={{ aspectRatio: '1.5/1' }}>
              {/* Pitch outline */}
              <div className="absolute inset-4 border-2 border-white/20">
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/20 -translate-x-1/2"></div>
                <div className="absolute left-0 top-1/3 w-4 h-1/3 border-2 border-white/20 border-l-0"></div>
                <div className="absolute right-0 top-1/3 w-4 h-1/3 border-2 border-white/20 border-r-0"></div>
                <div className="absolute left-0 top-1/4 w-16 h-1/2 border-2 border-white/20 border-l-0"></div>
                <div className="absolute right-0 top-1/4 w-16 h-1/2 border-2 border-white/20 border-r-0"></div>
              </div>

              {/* Set piece markers */}
              {setPieceLocations.map((event, i) => {
                const getMarkerColor = () => {
                  if (event.outcome === 'goal') return '#10B981';
                  if (event.outcome === 'miss') return '#EF4444';
                  return '#F59E0B';
                };
                
                const getMarkerSymbol = () => {
                  if (event.origin === 'freekick') return '▲';
                  if (event.origin === 'corner') return '◆';
                  if (event.origin === 'penalty') return '●';
                  return '■';
                };

                return (
                  <div
                    key={i}
                    className="absolute text-sm cursor-pointer hover:scale-125 transition-transform z-10 font-bold"
                    style={{
                      left: `${event.x * 100}%`,
                      top: `${event.y * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      color: getMarkerColor()
                    }}
                    title={`${event.origin} - ${event.outcome || 'unknown'}`}
                  >
                    {getMarkerSymbol()}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex gap-6 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-green-500 font-bold">▲</span>
                <span className="text-gray-300">Free Kick</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-500 font-bold">◆</span>
                <span className="text-gray-300">Corner</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-yellow-500 font-bold">●</span>
                <span className="text-gray-300">Penalty</span>
              </div>
            </div>
          </div>

          {/* Body Type Analysis */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Body Type Usage</h3>
            <div className="space-y-3">
              {bodyTypeAnalysis.map(item => (
                <div key={item.bodyType} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span className="text-white font-medium text-sm">{item.bodyType}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-semibold">{item.count}</div>
                    <div className="text-gray-400 text-xs">{item.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Time Distribution */}
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Set Pieces Over Match Time</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={timeAnalysis}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis dataKey="period" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none', 
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                  labelStyle={{ color: '#F9FAFB' }}
                />
                <Bar dataKey="count" fill="#3B82F6" name="Total Set Pieces" />
                <Bar dataKey="goals" fill="#10B981" name="Goals from Set Pieces" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center border border-white/10">
            <div className="text-3xl font-bold text-blue-400 mb-2">{setPieceEvents.length}</div>
            <div className="text-gray-300 text-xs uppercase tracking-wide">Total Set Pieces</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center border border-white/10">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {setPieceEvents.filter(e => e.outcome === 'goal').length}
            </div>
            <div className="text-gray-300 text-xs uppercase tracking-wide">Goals</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center border border-white/10">
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              {setPieceEvents.length > 0 ? 
                ((setPieceEvents.filter(e => e.outcome === 'goal').length / setPieceEvents.length) * 100).toFixed(1) 
                : 0}%
            </div>
            <div className="text-gray-300 text-xs uppercase tracking-wide">Conversion Rate</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center border border-white/10">
            <div className="text-3xl font-bold text-purple-400 mb-2">{origins.length}</div>
            <div className="text-gray-300 text-xs uppercase tracking-wide">Set Piece Types</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetPieceAnalysis;