import React, { useState, useContext, useMemo } from 'react';
import { DataContext } from '../../context/DataContext';
import { useAppContext } from '../../context/AppContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const PressureTimeline = () => {
  const { events } = useContext(DataContext);
  const { activeMatchId, setCopilotQuery } = useAppContext();
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [timeInterval, setTimeInterval] = useState(5);

  const matchEvents = useMemo(() =>
    activeMatchId ? events.filter((e: any) => e.match_id === activeMatchId) : events,
    [events, activeMatchId]
  );

  const teams = useMemo(() => {
    const teamNames = [...new Set(matchEvents.map((e: any) => e.team_name).filter(Boolean))];
    return teamNames.sort();
  }, [matchEvents]);

  const filteredEvents = useMemo(() => {
    return selectedTeam === 'all'
      ? matchEvents
      : matchEvents.filter((e: any) => e.team_name === selectedTeam);
  }, [matchEvents, selectedTeam]);

  const pressureTimeline = useMemo(() => {
    const pressureEvents = filteredEvents.filter((e: any) => e.event === 'pressure');
    if (pressureEvents.length === 0) return [];
    const maxMinute = Math.max(...pressureEvents.map((e: any) => e.minute ?? 0));
    const timeSlots: { minute: string; direct: number; indirect: number; total: number }[] = [];

    for (let i = 0; i <= maxMinute; i += timeInterval) {
      const slotEnd = i + timeInterval;
      const inSlot = pressureEvents.filter((e: any) => {
        const m = e.minute ?? 0;
        return m >= i && m < slotEnd;
      });
      timeSlots.push({
        minute: `${i}`,
        direct: inSlot.filter((e: any) => e.under_pressure).length,
        indirect: inSlot.filter((e: any) => !e.under_pressure).length,
        total: inSlot.length,
      });
    }
    return timeSlots.filter(s => s.total > 0);
  }, [filteredEvents, timeInterval]);

  const pressureDistribution = useMemo(() => {
    const pressureTypes: any = {};
    filteredEvents.filter((e: any) => e.pressure).forEach((e: any) => {
      pressureTypes[e.pressure] = (pressureTypes[e.pressure] || 0) + 1;
    });
    
    const colors: any = {
      'direct_pressure': '#3B82F6',
      'indirect_pressure': '#10B981',
      'no_pressure': '#6B7280'
    };
    
    return Object.entries(pressureTypes).map(([type, count]) => ({
      name: type.replace('_', ' ').toUpperCase(),
      value: count,
      color: colors[type] || '#6B7280'
    }));
  }, [filteredEvents]);

  const handleInterpret = () => {
    const total = pressureTimeline.reduce((s, t) => s + t.total, 0);
    const peak = pressureTimeline.reduce((a, b) => b.total > a.total ? b : a, { minute: '0', total: 0 });
    const teamLabel = selectedTeam === 'all' ? 'both teams' : selectedTeam;
    setCopilotQuery(
      `Interpret this pressure timeline for ${teamLabel} in this WWC 2023 match. ` +
      `Total defensive actions: ${total}. Peak pressing window: around minute ${peak.minute} (${peak.total} actions). ` +
      `What does this pressing pattern reveal about the team's defensive strategy and how it shifted through the match?`
    );
  };

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden border border-white/10">
      <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Pressure Analysis</h2>
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
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm focus:outline-none"
            >
              <option value="all">All Teams</option>
              {teams.map((team: any) => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6 border border-white/5">
            <h3 className="text-lg font-semibold text-white mb-4">Pressure Intensity</h3>
            <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={pressureTimeline}>
                        <CartesianGrid strokeDasharray="3,3" stroke="#374151" />
                        <XAxis dataKey="minute" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', color: '#fff' }} />
                        <Line type="monotone" dataKey="direct" stroke="#3B82F6" strokeWidth={2} name="Direct" />
                        <Line type="monotone" dataKey="indirect" stroke="#10B981" strokeWidth={2} name="Indirect" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-white/5">
            <h3 className="text-lg font-semibold text-white mb-4">Distribution</h3>
            <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={pressureDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                            {pressureDistribution.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', color: '#fff' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PressureTimeline;