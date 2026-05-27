/**
 * Standalone embed player — renders a single widget fullscreen with no app chrome.
 * Loaded when URL contains ?embed=<base64-encoded-widget-code>
 */
import { useEffect, useRef, useState } from 'react';

const RECHARTS_COMPONENTS = `
  const { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, ScatterChart, Scatter } = Recharts;
`;

function buildSrcdoc(code: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/recharts@2/umd/Recharts.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0a; color: #e4e4e7; font-family: system-ui, sans-serif; min-height: 100vh; display: flex; flex-direction: column; }
    #root { flex: 1; display: flex; flex-direction: column; padding: 16px; }
    .error { color: #f87171; padding: 16px; font-size: 12px; font-family: monospace; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useMemo, useRef, useCallback } = React;
    ${RECHARTS_COMPONENTS}
    try {
      ${code}
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(Widget));
    } catch(e) {
      document.getElementById('root').innerHTML = '<div class="error">Error: ' + e.message + '</div>';
    }
  </script>
</body>
</html>`;
}

export default function EmbedPlayer() {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('embed');
    if (!raw) { setError('No widget code provided.'); return; }
    try {
      const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
      const decoded = new TextDecoder().decode(bytes);
      setCode(decoded);
    } catch {
      setError('Invalid embed parameter.');
    }
  }, []);

  if (error) return (
    <div style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <p style={{ color:'#f87171', fontSize:13, fontFamily:'monospace' }}>{error}</p>
    </div>
  );

  if (!code) return (
    <div style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:24, height:24, border:'2px solid #7c3aed', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <iframe
      ref={iframeRef}
      srcDoc={buildSrcdoc(code)}
      style={{ width:'100%', height:'100vh', border:'none', display:'block', background:'#0a0a0a' }}
      sandbox="allow-scripts"
      title="Pelada Widget"
    />
  );
}
