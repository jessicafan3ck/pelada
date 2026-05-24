import { useMemo } from 'react';

interface ReactRunnerProps {
  code: string;
  height?: number;
}

export function stripFences(raw: string): string {
  return raw
    .replace(/^```(?:jsx?|tsx?|javascript|typescript)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();
}

function braceDepth(code: string): number {
  let depth = 0;
  let inStr = false;
  let strChar = '';
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (inStr) {
      if (ch === strChar && code[i - 1] !== '\\') inStr = false;
    } else if (ch === '"' || ch === "'" || ch === '`') {
      inStr = true; strChar = ch;
    } else if (ch === '{') depth++;
    else if (ch === '}') depth--;
  }
  return depth;
}

const ReactRunner = ({ code, height = 280 }: ReactRunnerProps) => {
  const cleanCode = stripFences(code);

  // Catch obviously truncated code before touching the iframe
  const truncated = cleanCode && braceDepth(cleanCode) > 0;

  const iframeContent = useMemo(() => {
    // Safely embed the code so </script> inside JSX strings can't break the HTML
    const escaped = JSON.stringify(cleanCode).replace(/<\/script/gi, '<\\/script');
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 16px; background: #0d1117; color: #e4e4e7;
           font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    #root { width: 100%; }
    #err  { display: none; color: #f87171; font-size: 11px; font-family: monospace;
            padding: 12px; white-space: pre-wrap; background: #1f0a0a;
            border: 1px solid #7f1d1d; border-radius: 8px; margin: 4px; }
  </style>
  <script>
    function showErr(msg) {
      var el = document.getElementById('err');
      el.style.display = 'block';
      el.textContent = String(msg);
    }
    window.onerror = function(msg) { showErr('Runtime error: ' + msg); return true; };
  <\/script>
  <script src="https://unpkg.com/react@18/umd/react.development.js"
          onerror="showErr('Failed to load React from CDN — check your internet connection.')"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"
          onerror="showErr('Failed to load ReactDOM from CDN.')"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"
          onerror="showErr('Failed to load Babel from CDN.')"><\/script>
  <script src="https://unpkg.com/recharts@2.15.2/umd/recharts.min.js"
          onerror="showErr('Failed to load Recharts from CDN.')"><\/script>
</head>
<body>
  <div id="root"></div>
  <div id="err"></div>
  <script>
    window.addEventListener('load', function () {
      var rawCode = ${escaped};
      try {
        if (typeof Babel === 'undefined') throw new Error('Babel did not load. Try refreshing.');
        if (typeof React === 'undefined') throw new Error('React did not load. Try refreshing.');

        var useState    = React.useState;
        var useEffect   = React.useEffect;
        var useMemo     = React.useMemo;
        var useCallback = React.useCallback;
        var useRef      = React.useRef;
        var useReducer  = React.useReducer;
        var R = (typeof Recharts !== 'undefined') ? Recharts : {};
        var LineChart = R.LineChart, Line = R.Line, BarChart = R.BarChart, Bar = R.Bar,
            PieChart = R.PieChart, Pie = R.Pie, Cell = R.Cell,
            AreaChart = R.AreaChart, Area = R.Area,
            ScatterChart = R.ScatterChart, Scatter = R.Scatter,
            RadarChart = R.RadarChart, Radar = R.Radar,
            PolarGrid = R.PolarGrid, PolarAngleAxis = R.PolarAngleAxis,
            PolarRadiusAxis = R.PolarRadiusAxis,
            XAxis = R.XAxis, YAxis = R.YAxis,
            CartesianGrid = R.CartesianGrid, Tooltip = R.Tooltip,
            Legend = R.Legend, ResponsiveContainer = R.ResponsiveContainer,
            ComposedChart = R.ComposedChart, ReferenceLine = R.ReferenceLine;

        var src = '(function(){\\n' + rawCode + '\\nreturn (typeof Widget !== "undefined" ? Widget : null);\\n})()';
        var transformed = Babel.transform(src, { presets: ['react'] }).code;
        var Widget = eval(transformed);

        if (typeof Widget !== 'function') {
          throw new Error('No function named Widget found. Make sure your code defines a function Widget().');
        }

        ReactDOM.createRoot(document.getElementById('root')).render(
          React.createElement(Widget)
        );
      } catch (e) {
        showErr('Widget error: ' + e.message);
      }
    });
  <\/script>
</body>
</html>`;
  }, [cleanCode]);

  if (!cleanCode) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-900 flex items-center justify-center p-8 text-zinc-500 text-sm">
        Describe a widget and hit Generate.
      </div>
    );
  }

  if (truncated) {
    return (
      <div className="rounded-xl border border-red-800/40 bg-red-900/10 p-4 text-red-400 text-xs font-mono leading-relaxed">
        The generated code looks truncated (unclosed braces). Try generating again — sometimes a shorter or simpler description produces more reliable code.
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
        style={{ width: '100%', height, border: 'none', display: 'block' }}
        title="Widget Live Preview"
      />
    </div>
  );
};

export default ReactRunner;
