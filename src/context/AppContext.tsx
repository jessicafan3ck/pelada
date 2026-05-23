import React, { createContext, useState, useContext } from 'react';

export type UserMode = 'fan' | 'analyst';

export interface SelectedPlayer {
  id: number;
  name: string;
  nickname: string;
  jersey: number;
  position: string;
  position_id: number;
  team: string;
  match_id: number;
  country: string;
  x: number;
  y: number;
}

interface AppContextType {
  userMode: UserMode;
  setUserMode: (m: UserMode) => void;
  selectedPlayer: SelectedPlayer | null;
  setSelectedPlayer: (p: SelectedPlayer | null) => void;
  contextPanelOpen: boolean;
  setContextPanelOpen: (open: boolean) => void;
  activeMatchId: number | null;
  setActiveMatchId: (id: number | null) => void;
  activeTeam: string | null;
  setActiveTeam: (team: string | null) => void;
  // Co-Pilot pre-load
  copilotQuery: string | null;
  setCopilotQuery: (q: string | null) => void;
}

const AppContext = createContext<AppContextType>({
  userMode: 'fan',
  setUserMode: () => {},
  selectedPlayer: null,
  setSelectedPlayer: () => {},
  contextPanelOpen: false,
  setContextPanelOpen: () => {},
  activeMatchId: null,
  setActiveMatchId: () => {},
  activeTeam: null,
  setActiveTeam: () => {},
  copilotQuery: null,
  setCopilotQuery: () => {},
});

export const useAppContext = () => useContext(AppContext);

export const AppContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [userMode, setUserMode] = useState<UserMode>('fan');
  const [selectedPlayer, setSelectedPlayer] = useState<SelectedPlayer | null>(null);
  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState<number | null>(3869685);
  const [activeTeam, setActiveTeam] = useState<string | null>(null);
  const [copilotQuery, setCopilotQuery] = useState<string | null>(null);

  const handleSetSelectedPlayer = (p: SelectedPlayer | null) => {
    setSelectedPlayer(p);
    if (p) setContextPanelOpen(true);
  };

  return (
    <AppContext.Provider value={{
      userMode, setUserMode,
      selectedPlayer, setSelectedPlayer: handleSetSelectedPlayer,
      contextPanelOpen, setContextPanelOpen,
      activeMatchId, setActiveMatchId,
      activeTeam, setActiveTeam,
      copilotQuery, setCopilotQuery,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
