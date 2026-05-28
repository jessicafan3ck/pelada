import { useEffect, useRef, useState } from 'react';

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

const RECHARTS_KEYS = [
  'BarChart','Bar','LineChart','Line','AreaChart','Area',
  'PieChart','Pie','Cell','XAxis','YAxis','CartesianGrid',
  'Tooltip','Legend','ResponsiveContainer',
  'RadarChart','Radar','PolarGrid','PolarAngleAxis','ScatterChart','Scatter',
];

// ─── Standalone srcdoc for EmbedPlayer (deployed embed URLs) ─────────────────
// Code is JSON-encoded so backticks / </script> in widget code can't corrupt HTML.
export function buildWidgetSrcdoc(rawCode: string): string {
  const code = rawCode
    .replace(/^```(?:jsx?|tsx?|javascript|typescript)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .replace(/^import\s[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^import\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/\bexport\s+default\s+/g, '')
    .replace(/\bexport\s+\{[^}]*\};?/g, '')
    .trim();

  // Escape < > so the HTML parser never sees </script> inside the string literal
  const safe = JSON.stringify(code).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

  const hookNames = ['React','useState','useEffect','useMemo','useRef','useCallback','useReducer'];
  const allParams = [...hookNames, ...RECHARTS_KEYS].map(p => `"${p}"`).join(',');
  const hookArgs  = ['React','React.useState','React.useEffect','React.useMemo',
                     'React.useRef','React.useCallback','React.useReducer'];
  const allArgs   = [...hookArgs, ...RECHARTS_KEYS.map(k => `R.${k}`)].join(',');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<script src="https://unpkg.com/react@18.2.0/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/recharts@2.10.3/umd/Recharts.js"></script>
<script src="https://unpkg.com/@babel/standalone@7.23.9/babel.min.js"></script>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0a0a0a;color:#e4e4e7;font-family:system-ui,sans-serif}#root{padding:16px}.err{color:#f87171;padding:16px;font-size:12px;font-family:monospace;white-space:pre-wrap}</style>
</head><body>
<div id="root"></div>
<script>(function(){
var c=${safe};
var R=window.Recharts||{};
try{
var t=Babel.transform(c,{presets:["react","typescript"],sourceType:"module",filename:"widget.tsx"}).code;
var fn=new Function(${allParams},t+"\\nreturn typeof Widget!='undefined'?Widget:null;");
var W=fn(${allArgs});
if(!W)throw new Error("No Widget() function defined.");
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(W));
}catch(err){document.getElementById("root").innerHTML="<div class='err'>"+err.message+"</div>";}
})();</script>
</body></html>`;
}

// ─── Persistent sandbox for in-app preview ────────────────────────────────────
// String.raw preserves all regex backslashes literally — no double-escaping needed.
// CDN scripts load ONCE when the component mounts; subsequent widget renders are
// instant via postMessage instead of rebuilding and re-fetching the entire srcdoc.
const SANDBOX_SRCDOC = String.raw`<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<script src="https://unpkg.com/react@18.2.0/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/recharts@2.10.3/umd/Recharts.js"></script>
<script src="https://unpkg.com/@babel/standalone@7.23.9/babel.min.js"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a0a;color:#e4e4e7;font-family:system-ui,sans-serif}
#root{padding:16px}
.err{color:#f87171;padding:16px;font-size:12px;font-family:monospace;white-space:pre-wrap}
</style>
</head><body>
<div id="root"></div>
<script>
var _root = null;
var R = window.Recharts || {};
var RC = ['BarChart','Bar','LineChart','Line','AreaChart','Area','PieChart','Pie','Cell',
          'XAxis','YAxis','CartesianGrid','Tooltip','Legend','ResponsiveContainer',
          'RadarChart','Radar','PolarGrid','PolarAngleAxis','ScatterChart','Scatter'];
var PARAMS = ['React','useState','useEffect','useMemo','useRef','useCallback','useReducer'].concat(RC);
var ARGS   = [React, React.useState, React.useEffect, React.useMemo,
              React.useRef, React.useCallback, React.useReducer]
             .concat(RC.map(function(k){ return R[k]; }));

function render(raw) {
  var el = document.getElementById('root');
  try {
    var code = raw
      .replace(/^import\s[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
      .replace(/^import\s+['"][^'"]+['"];?\s*$/gm, '')
      .replace(/\bexport\s+default\s+/g, '')
      .replace(/\bexport\s+\{[^}]*\};?/g, '')
      .trim();
    var t = Babel.transform(code, { presets: ['react', 'typescript'], sourceType: 'module', filename: 'widget.tsx' }).code;
    var fn = new Function(...PARAMS, t + '\nreturn typeof Widget !== "undefined" ? Widget : null;');
    var W  = fn(...ARGS);
    if (!W) throw new Error('Widget() not defined. Code must define: function Widget() { ... }');
    if (!_root) _root = ReactDOM.createRoot(el);
    _root.render(React.createElement(W));
  } catch (e) {
    el.innerHTML = '<div class="err">' + e.message + '</div>';
  }
}

window.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'RENDER') render(e.data.code);
});
</script>
</body></html>`;

// ─── Component ────────────────────────────────────────────────────────────────
const ReactRunner = ({ code, height = 320 }: ReactRunnerProps) => {
  const iframeRef   = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const cleanCode   = stripFences(code);

  // When sandbox is ready (CDN scripts loaded) OR code changes, postMessage to render
  useEffect(() => {
    if (!ready || !cleanCode || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({ type: 'RENDER', code: cleanCode }, '*');
  }, [ready, cleanCode]);

  if (!cleanCode) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-900 flex items-center justify-center p-8 text-zinc-500 text-sm">
        Describe a widget and hit Generate.
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
      {!ready && (
        <div className="flex items-center justify-center gap-3 text-zinc-600 text-xs" style={{ height }}>
          <div className="w-4 h-4 border-2 border-purple-500/40 border-t-purple-500 rounded-full animate-spin" />
          Loading sandbox…
        </div>
      )}
      <iframe
        ref={iframeRef}
        srcDoc={SANDBOX_SRCDOC}
        style={{ width: '100%', height, border: 'none', display: ready ? 'block' : 'none', background: '#0a0a0a' }}
        sandbox="allow-scripts"
        onLoad={() => setReady(true)}
        title="Widget Sandbox"
      />
    </div>
  );
};

export default ReactRunner;
