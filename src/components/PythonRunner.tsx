import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, AlertTriangle } from 'lucide-react';

declare global {
  interface Window {
    loadPyodide: any;
    pyodide: any;
  }
}

interface PythonRunnerProps {
  code: string;
}

const PythonRunner = ({ code }: PythonRunnerProps) => {
  const [output, setOutput] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadPyodide = async () => {
      if (!window.loadPyodide) {
        // Dynamically load Pyodide script if not present
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
        script.onload = async () => {
          await initPyodide();
        };
        document.head.appendChild(script);
      } else {
        await initPyodide();
      }
    };

    const initPyodide = async () => {
      try {
        if (!window.pyodide) {
          window.pyodide = await window.loadPyodide();
          // Load pandas and matplotlib/micropip if needed, but for now just base
          await window.pyodide.loadPackage(['pandas', 'numpy']); 
        }
        setIsReady(true);
      } catch (err) {
        console.error('Failed to load Pyodide:', err);
        setError('Failed to load Python environment.');
      }
    };

    loadPyodide();
  }, []);

  const runCode = async () => {
    if (!window.pyodide) return;
    setIsRunning(true);
    setError(null);
    setOutput([]);

    try {
      // Capture stdout
      window.pyodide.setStdout({ batched: (msg: string) => setOutput(prev => [...prev, msg]) });
      
      await window.pyodide.runPythonAsync(code);
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="rounded-lg overflow-hidden border border-white/10 bg-black/40 my-2">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
        <div className="text-xs font-mono text-zinc-400">Python Sandbox</div>
        <div className="flex gap-2">
          <button
            onClick={runCode}
            disabled={!isReady || isRunning}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
              isReady && !isRunning 
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                : 'bg-white/5 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <Play className="w-3 h-3" />
            {isRunning ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>
      
      <div className="p-4 bg-[#0d1117] overflow-x-auto">
        <pre className="text-xs font-mono text-blue-300 mb-4">{code}</pre>
        
        {(output.length > 0 || error) && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Output</div>
            {output.map((line, i) => (
              <div key={i} className="text-xs font-mono text-zinc-300">{line}</div>
            ))}
            {error && (
              <div className="flex items-start gap-2 text-xs font-mono text-red-400 mt-2">
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PythonRunner;
