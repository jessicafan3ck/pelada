import React, { useMemo } from 'react';

interface ReactRunnerProps {
  code: string;
  height?: number;
}

function stripFences(raw: string): string {
  return raw.replace(/^```(?:jsx?|tsx?|javascript|typescript)?\n?/i, '').replace(/\n?```\s*$/i, '').trim();
}

const ReactRunner = ({ code, height = 280 }: ReactRunnerProps) => {
  const cleanCode = stripFences(code);
  const iframeContent = useMemo(() => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://unpkg.com/recharts@2.15.2/umd/recharts.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 16px; background: #0d1117; color: #e4e4e7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    #root { width: 100%; }
    #error-display { color: #f87171; font-size: 12px; font-family: monospace; padding: 12px; white-space: pre-wrap; background: #1f0a0a; border-radius: 8px; margin: 8px; }
  </style>
</head>
<body>
  <div id="root"></div>
  <div id="error-display" style="display:none"></div>
  <script type="text/babel" data-presets="react">
    const { useState, useEffect, useMemo, useCallback, useRef, useReducer } = React;
    const {
      LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
      AreaChart, Area, ScatterChart, Scatter,
      RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
      XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
      ComposedChart, ReferenceLine
    } = Recharts;

    try {
      ${cleanCode}

      const rootEl = document.getElementById('root');
      const root = ReactDOM.createRoot(rootEl);
      root.render(React.createElement(Widget));
    } catch (e) {
      const errEl = document.getElementById('error-display');
      errEl.style.display = 'block';
      errEl.textContent = 'Error: ' + e.message;
    }
  </script>
</body>
</html>`, [cleanCode]);

  if (!cleanCode) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/20 flex items-center justify-center p-8 text-zinc-500 text-sm">
        No code to preview.
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-white/10 bg-[#0d1117]">
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03] border-b border-white/5">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500/40 border border-red-500/60" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/40 border border-yellow-500/60" />
          <span className="w-3 h-3 rounded-full bg-green-500/40 border border-green-500/60" />
        </div>
        <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Live Preview</span>
        <div />
      </div>
      <iframe
        srcDoc={iframeContent}
        style={{ width: '100%', height, border: 'none', display: 'block', background: 'transparent' }}
        sandbox="allow-scripts"
        title="Widget Live Preview"
      />
    </div>
  );
};

export default ReactRunner;
