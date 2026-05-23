# Pelada System Integration Notes

## Overview

This document outlines the integration of LangGraph backend support, code sandbox functionality, and enhanced visualizations into the Pelada platform with the iOS 26 Liquid Glass aesthetic.

## What Was Integrated

### 1. **DataContext Enhancement** (`/context/DataContext.tsx`)
- **LangGraph Backend Integration**: Added `sendLangGraphQuery()` function to communicate with the LangGraph backend at `/api/langgraph`
- **Session Management**: Each session gets a unique ID for backend tracking
- **Mock Event Data**: Generates 500 mock football events with realistic fields (passes, shots, pressure, coordinates, etc.)
- **Graceful Degradation**: Falls back to mock responses when backend is unavailable

### 2. **Code Sandbox Runners**
Already in place and functional:
- **ReactRunner** (`/components/ReactRunner.tsx`): Displays React/JSX code with preview placeholder
- **PythonRunner** (`/components/PythonRunner.tsx`): Executes Python code using Pyodide with:
  - Pandas and NumPy support
  - Live output capture
  - Error handling
  - Run/Reset controls

### 3. **MessageBubble Component** (`/components/MessageBubble.tsx`)
- Displays user/agent messages in chat interface
- Detects code blocks and routes them to appropriate runners:
  - `content.lang === 'jsx'` or `'react'` → ReactRunner
  - `content.lang === 'python'` → PythonRunner
- Supports "Continue Execution" button for multi-step workflows
- Integrated with Pelada's glassmorphic design

### 4. **Visualizations**

#### **PassMap** (`/components/visualizations/PassMap.tsx`)
- Visualizes passing networks on a football pitch
- Features:
  - Team filtering
  - Outcome filtering (complete/incomplete/assists)
  - Color-coded pass lines (cyan=complete, red=incomplete, orange=assist)
  - Performance limited to 100 passes for optimization
  - Statistics panel with pass accuracy

#### **PressureTimeline** (`/components/visualizations/PressureTimeline.tsx`)
- Analyzes pressure application over match time
- Features:
  - Direct vs indirect pressure tracking
  - Time interval selection (1/5/10/15 min)
  - Line chart showing pressure intensity
  - Pie chart for pressure type distribution
  - Team filtering

#### **QuadrantPlot** (`/components/visualizations/QuadrantPlot.tsx`)
- Multi-metric quadrant analysis tool
- Features:
  - 4 analysis modes: Pressure, Passing, Attacking, Movement
  - Team selection with multi-select
  - Average lines showing league standards
  - Interactive SVG-based scatter plot
  - Summary statistics panel

#### **SetPieceAnalysis** (`/components/visualizations/SetPieceAnalysis.tsx`) ⭐ **NEW**
- Comprehensive set piece analytics
- Features:
  - Origin filtering (corner, freekick, penalty)
  - Team filtering
  - Effectiveness bar charts
  - Outcome distribution pie chart
  - Pitch-based location markers
  - Body type usage analysis
  - Time distribution analysis
  - Summary statistics (conversion rate, goals, etc.)

### 5. **PeladaAgent Enhancement** (`/components/PeladaAgent.tsx`)
- Enhanced to support visualization generation
- New trigger phrases:
  - "pass map" → shows PassMap
  - "pressure timeline" → shows PressureTimeline
  - "quadrant plot" → shows QuadrantPlot
  - "set piece analysis" → shows SetPieceAnalysis
- Maintains existing navigation capabilities
- Integrated with DataContext for LangGraph queries

### 6. **App Structure** (`/App.tsx`)
- Wrapped entire app with `DataContextProvider`
- All child components now have access to:
  - Event data
  - Messages state
  - Session ID
  - Loading state
  - LangGraph query function

## LangGraph Backend Integration

### API Endpoint
The frontend expects a backend endpoint at `/api/langgraph` that accepts:

```typescript
{
  message: string,        // User's natural language query
  session_id: string,     // Unique session identifier
  tool_call?: string,     // Optional tool to execute
  tool_args?: object,     // Optional arguments for tool
  reinject?: boolean      // Whether to pause for confirmation
}
```

### Expected Response
```typescript
{
  final_response?: string,           // Text response from agent
  tool_output?: object,              // Data from tool execution
  visualization_type?: string,       // Which viz to render
  tool_call?: string,                // Next tool to execute
  tool_args?: object,                // Args for next tool
  debug_trace?: string[]             // Debug information
}
```

### Backend Files (Reference)
The provided backend code includes:
- `graph.py`: LangGraph workflow with planning and tool execution nodes
- `state.py`: State definitions for the graph
- `tool_registry.py`: Tool definitions (query_events, etc.)
- `langgraph_chat.py`: FastAPI endpoint handler
- `main.py`: Test harness

## Design System

### Glassmorphic Styling
All new components use the iOS 26 Liquid Glass aesthetic:
- `bg-black/40 backdrop-blur-xl` - Semi-transparent backgrounds
- `border border-white/10` - Subtle borders
- `rounded-2xl` - Large border radius
- `shadow-2xl` - Deep shadows
- Gradient accents: purple/blue for headers

### Color Palette
- Primary: Purple (#8B5CF6) / Blue (#3B82F6)
- Success: Green (#10B981)
- Warning: Yellow (#F59E0B)
- Error: Red (#EF4444)
- Neutral: Zinc scale

## Data Schema

### Event Object
```typescript
{
  match_id: number;
  team_name: string;
  from_player_name?: string;
  to_player_name?: string;
  event: string;                    // 'pass', 'shot', 'pressure', etc.
  event_type?: string;              // 'distribution', 'action', etc.
  outcome?: string;                 // 'complete', 'incomplete', 'goal', etc.
  match_time_in_ms?: number;
  x?: number;                       // Normalized 0-1
  y?: number;                       // Normalized 0-1
  x_location_start?: number;
  y_location_start?: number;
  x_location_end?: number;
  y_location_end?: number;
  pressure?: string;                // 'direct_pressure', 'indirect_pressure', 'no_pressure'
  body_type?: string;               // 'right_foot', 'left_foot', 'head'
  origin?: string;                  // 'corner', 'freekick', 'penalty'
  save_type?: string;
  save_detail?: string;
  movement?: string;
}
```

## Usage Examples

### Accessing Event Data in Components
```tsx
import { useContext } from 'react';
import { DataContext } from '../context/DataContext';

function MyComponent() {
  const { events, sessionId, sendLangGraphQuery } = useContext(DataContext);
  
  // Use event data
  const passes = events.filter(e => e.event === 'pass');
  
  // Query backend
  const handleQuery = async () => {
    const result = await sendLangGraphQuery('Show me all goals');
    console.log(result);
  };
}
```

### Displaying Code in Messages
```tsx
const message = {
  role: 'assistant',
  content: {
    type: 'code',
    lang: 'python',
    code: 'import pandas as pd\nprint("Hello")'
  }
};

<MessageBubble message={message} />
```

## Next Steps / Future Enhancements

1. **Connect Real Backend**: Currently using mock data; connect to actual LangGraph backend
2. **Enhance ReactRunner**: Add live preview using `react-live` or `sandpack`
3. **Add More Visualizations**: Heatmaps, shot charts, defensive shapes
4. **Player-Level Analysis**: Extend visualizations to show individual players
5. **Real-time Updates**: WebSocket support for live match data
6. **Export Functionality**: Allow users to export visualizations as images
7. **Custom Queries**: Let users define custom filters and metrics

## Files Modified/Created

### Created
- `/components/visualizations/SetPieceAnalysis.tsx`
- `/INTEGRATION_NOTES.md`

### Modified
- `/context/DataContext.tsx` - Added LangGraph integration
- `/components/PeladaAgent.tsx` - Added visualization triggers
- `/components/visualizations/PassMap.tsx` - Updated import path
- `/components/visualizations/PressureTimeline.tsx` - Updated import path
- `/components/visualizations/QuadrantPlot.tsx` - Updated import path
- `/App.tsx` - Wrapped with DataContextProvider

### Deleted
- `/components/context/DataContext.tsx` - Duplicate file removed

## Dependencies

Already available:
- `recharts` - For charts in visualizations
- `lucide-react` - For icons
- `motion/react` (Framer Motion) - For animations
- Pyodide (CDN) - For Python execution

## Notes

- All visualizations use mock data by default
- Backend integration is prepared but requires actual FastAPI server
- Code sandbox (Python) loads Pyodide asynchronously
- All components maintain responsive design principles
- Discovery Hub workflow is preserved across all tools