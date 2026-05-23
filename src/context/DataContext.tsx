import React, { createContext, useState, useEffect } from 'react';
import { parseCSV, num } from '../utils/csvParser';

export interface Event {
  match_id: number;
  team_name: string;
  from_player_name?: string;
  to_player_name?: string;
  event: string;
  outcome?: string;
  minute?: number;
  x_location_start?: number;
  y_location_start?: number;
  x_location_end?: number;
  y_location_end?: number;
  pressure?: string;
  origin?: string;
  xg?: number;
}

export interface LineupPlayer {
  id: number;
  name: string;
  nickname: string;
  jersey: number;
  position: string;
  position_id: number;
  country: string;
  x: number;
  y: number;
}

export interface MatchMeta {
  match_id: number;
  home_team: string;
  away_team: string;
  date: string;
  stage: string;
  home_score: number;
  away_score: number;
}

export interface TeamStat {
  team_name: string;
  common_name: string;
  league: string;
  country: string;
  season: string;
  league_position: number;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_scored: number;
  goals_conceded: number;
  points_per_game: number;
  average_possession: number;
  shots: number;
  shots_on_target: number;
  corners_total: number;
  xg_for: number;
  xg_against: number;
}

export interface PlayerStat {
  full_name: string;
  age: number;
  league: string;
  season: string;
  position: string;
  club: string;
  nationality: string;
  minutes_played: number;
  appearances: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
}

interface DataContextType {
  events: Event[];
  setEvents: (events: Event[]) => void;
  matchMeta: MatchMeta[];
  lineups: Record<number, Record<string, LineupPlayer[]>>;
  selectedMatch: number | null;
  setSelectedMatch: (id: number | null) => void;
  teamStats: TeamStat[];
  playerStats: PlayerStat[];
  selectedLeague: string;
  setSelectedLeague: (l: string) => void;
  availableLeagues: string[];
  messages: any[];
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  sessionId: string;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  sendLangGraphQuery: (query: string, toolCall?: string, toolArgs?: any) => Promise<any>;
}

export const DataContext = createContext<DataContextType>({
  events: [],
  setEvents: () => {},
  matchMeta: [],
  lineups: {},
  selectedMatch: null,
  setSelectedMatch: () => {},
  teamStats: [],
  playerStats: [],
  selectedLeague: 'All',
  setSelectedLeague: () => {},
  availableLeagues: [],
  messages: [],
  setMessages: () => {},
  sessionId: 'default-session',
  isLoading: false,
  setIsLoading: () => {},
  sendLangGraphQuery: async () => {},
});

const TEAM_STAT_FILES = [
  { file: '/data/ref/teams-epl-24-25.csv', league: 'Premier League' },
  { file: '/data/ref/teams-laliga-24-25.csv', league: 'La Liga' },
  { file: '/data/ref/teams-bundesliga-24-25.csv', league: 'Bundesliga' },
  { file: '/data/ref/teams-seriea-24-25.csv', league: 'Serie A' },
  { file: '/data/ref/teams-ligue1-24-25.csv', league: 'Ligue 1' },
  { file: '/data/ref/teams-cl-24-25.csv', league: 'Champions League' },
];

const PLAYER_STAT_FILES = [
  { file: '/data/ref/players-epl-24-25.csv', league: 'Premier League' },
  { file: '/data/ref/players-laliga-24-25.csv', league: 'La Liga' },
  { file: '/data/ref/players-bundesliga-24-25.csv', league: 'Bundesliga' },
  { file: '/data/ref/players-cl-24-25.csv', league: 'Champions League' },
];

async function loadStatsBombEvents(): Promise<{ events: Event[]; matches: MatchMeta[]; lineups: Record<number, Record<string, LineupPlayer[]>> }> {
  try {
    const resp = await fetch('/data/statsbomb/wc2022.json');
    if (!resp.ok) throw new Error('StatsBomb data not found');
    const data = await resp.json();
    return {
      events: data.events as Event[],
      matches: data.matches as MatchMeta[],
      lineups: data.lineups ?? {},
    };
  } catch {
    return { events: [], matches: [], lineups: {} };
  }
}

async function loadTeamStats(): Promise<TeamStat[]> {
  const all: TeamStat[] = [];
  await Promise.all(TEAM_STAT_FILES.map(async ({ file, league }) => {
    try {
      const resp = await fetch(file);
      if (!resp.ok) return;
      const rows = parseCSV(await resp.text());
      for (const r of rows) {
        if (!r.team_name) continue;
        all.push({
          team_name: r.team_name,
          common_name: r.common_name || r.team_name,
          league,
          country: r.country || '',
          season: r.season || '2024/2025',
          league_position: num(r.league_position),
          matches_played: num(r.matches_played),
          wins: num(r.wins),
          draws: num(r.draws),
          losses: num(r.losses),
          goals_scored: num(r.goals_scored),
          goals_conceded: num(r.goals_conceded),
          points_per_game: num(r.points_per_game),
          average_possession: num(r.average_possession),
          shots: num(r.shots),
          shots_on_target: num(r.shots_on_target),
          corners_total: num(r.corners_total),
          xg_for: num(r.xg_for_avg_overall),
          xg_against: num(r.xg_against_avg_overall),
        });
      }
    } catch { /* silently skip */ }
  }));
  return all;
}

async function loadPlayerStats(): Promise<PlayerStat[]> {
  const all: PlayerStat[] = [];
  await Promise.all(PLAYER_STAT_FILES.map(async ({ file, league }) => {
    try {
      const resp = await fetch(file);
      if (!resp.ok) return;
      const rows = parseCSV(await resp.text());
      for (const r of rows) {
        if (!r.full_name || num(r.minutes_played_overall) === 0) continue;
        all.push({
          full_name: r.full_name,
          age: num(r.age),
          league,
          season: r.season || '2024/2025',
          position: r.position || '',
          club: r['Current Club'] || '',
          nationality: r.nationality || '',
          minutes_played: num(r.minutes_played_overall),
          appearances: num(r.appearances_overall),
          goals: num(r.goals_overall),
          assists: num(r.assists_overall),
          yellow_cards: num(r.yellow_cards_overall),
          red_cards: num(r.red_cards_overall),
        });
      }
    } catch { /* silently skip */ }
  }));
  return all;
}

export const DataContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [matchMeta, setMatchMeta] = useState<MatchMeta[]>([]);
  const [lineups, setLineups] = useState<Record<number, Record<string, LineupPlayer[]>>>({});
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const [teamStats, setTeamStats] = useState<TeamStat[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>('All');
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState('session_' + Math.random().toString(36).substring(2, 9));

  useEffect(() => {
    loadStatsBombEvents().then(({ events: evs, matches, lineups: lus }) => {
      setEvents(evs);
      setMatchMeta(matches);
      setLineups(lus);
    });
    loadTeamStats().then(setTeamStats);
    loadPlayerStats().then(setPlayerStats);
  }, []);

  const availableLeagues = ['All', ...Array.from(new Set(teamStats.map(t => t.league))).sort()];

  const sendLangGraphQuery = async (query: string, toolCall?: string, toolArgs?: any) => {
    try {
      const response = await fetch('/api/langgraph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          session_id: sessionId,
          tool_call: toolCall,
          tool_args: toolArgs,
          reinject: false
        }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('LangGraph query error:', error);
      return {
        final_response: 'Backend not available. Showing mock visualization.',
        tool_output: { events: events.slice(0, 50) },
        visualization_type: null
      };
    }
  };

  return (
    <DataContext.Provider value={{
      events, setEvents,
      matchMeta, lineups, selectedMatch, setSelectedMatch,
      teamStats, playerStats,
      selectedLeague, setSelectedLeague,
      availableLeagues,
      messages, setMessages,
      sessionId,
      isLoading, setIsLoading,
      sendLangGraphQuery,
    }}>
      {children}
    </DataContext.Provider>
  );
};
