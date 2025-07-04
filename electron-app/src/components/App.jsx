// electron-app/src/components/App.jsx
import React, { useEffect, useState } from 'react';

export default function App() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    window.electronAPI.onLog(msg => {
      setLogs(prev => [...prev, msg]);
    });
  }, []);

  const handleRun = () => {
    const url = prompt('Enter URL for Puppeteer:');
    window.electronAPI.runCommand({ engine: 'puppeteer', url });
  };

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>🧪 GARE - Graphical Automation Runtime Environment</h1>
      <button onClick={handleRun}>▶ Run Puppeteer Example</button>
      <pre style={{ background: '#000', color: '#0f0', padding: 10, marginTop: 20, height: 400, overflow: 'auto' }}>
        {logs.map((line, i) => <div key={i}>{line}</div>)}
      </pre>
    </div>
  );
}
