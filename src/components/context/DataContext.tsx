import React, { createContext, useState, useEffect } from 'react';

// Mock Data Generation
const generateMockEvents = () => {
  const events = [];
  const teams = ['Arsenal', 'Man City', 'Liverpool', 'Real Madrid'];
  const eventTypes = ['pass', 'shot', 'tackle', 'interception', 'save'];
  const outcomes = ['complete', 'incomplete', 'goal', 'miss', 'save', 'block', 'assist'];
  const origins = ['open_play', 'corner', 'freekick', 'penalty'];
  
  for (let i = 0; i < 500; i++) {
    const team = teams[Math.floor(Math.random() * teams.length)];
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    let outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
    
    // Correlate outcome with type slightly
    if (type === 'pass' && (outcome === 'goal' || outcome === 'save')) outcome = 'complete';
    if (type === 'shot' && (outcome === 'complete' || outcome === 'incomplete')) outcome = 'miss';

    events.push({
      id: `evt_${i}`,
      match_id: 1,
      team_name: team,
      player_name: `Player ${Math.floor(Math.random() * 11) + 1}`,
      event: type,
      event_type: type === 'pass' ? 'distribution' : 'action',
      outcome: outcome,
      timestamp: Date.now() - Math.floor(Math.random() * 90 * 60 * 1000),
      match_time_in_ms: Math.floor(Math.random() * 90 * 60 * 1000),
      x: Math.random(),
      y: Math.random(),
      x_location_start: Math.random(),
      y_location_start: Math.random(),
      x_location_end: Math.random(),
      y_location_end: Math.random(),
      pressure: Math.random() > 0.7 ? 'direct_pressure' : Math.random() > 0.4 ? 'indirect_pressure' : 'no_pressure',
      body_type: Math.random() > 0.8 ? 'head' : 'right_foot',
      origin: Math.random() > 0.9 ? origins[Math.floor(Math.random() * origins.length)] : undefined,
    });
  }
  return events;
};

export const DataContext = createContext<{
  events: any[];
  sessionId: string;
  messages: any[];
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  sendLangGraphQuery: (query: string, toolCall?: string, toolArgs?: any) => Promise<any>;
}>({
  events: [],
  sessionId: 'default',
  messages: [],
  setMessages: () => {},
  isLoading: false,
  setIsLoading: () => {},
  sendLangGraphQuery: async () => {},
});

export const DataContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', content: 'Hello! I am Pelada. Ask me to analyze matches, visualize passing networks, or simulate tactical scenarios.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const sessionId = 'session_' + Math.random().toString(36).substr(2, 9);

  useEffect(() => {
    // Load mock data
    setEvents(generateMockEvents());
  }, []);

  // LangGraph integration function
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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('LangGraph query error:', error);
      // Return mock response for development when backend is not available
      return {
        final_response: 'Backend not available. Showing mock visualization.',
        tool_output: { events: events.slice(0, 50) },
        visualization_type: null
      };
    }
  };

  return (
    <DataContext.Provider value={{ events, sessionId, messages, setMessages, isLoading, setIsLoading, sendLangGraphQuery }}>
      {children}
    </DataContext.Provider>
  );
};