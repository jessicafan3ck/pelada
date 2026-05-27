/**
 * Standalone embed player — renders a single widget fullscreen with no app chrome.
 * Loaded when URL contains ?embed=<base64-encoded-widget-code>
 */
import { useEffect, useState } from 'react';
import { buildWidgetSrcdoc } from './components/ReactRunner';

export default function EmbedPlayer() {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('embed');
    if (!raw) { setError('No widget code provided.'); return; }
    try {
      const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
      setCode(new TextDecoder().decode(bytes));
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
      srcDoc={buildWidgetSrcdoc(code)}
      style={{ width:'100%', height:'100vh', border:'none', display:'block', background:'#0a0a0a' }}
      sandbox="allow-scripts"
      title="Pelada Widget"
    />
  );
}
