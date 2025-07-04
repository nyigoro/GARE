import React, { useState, useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import 'tailwindcss';

export default function App() {
  const [activeTab, setActiveTab] = useState('containers');
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current && !xtermRef.current) {
      xtermRef.current = new Terminal({
        cols: 80,
        rows: 20,
        theme: { background: '#1f2937', foreground: '#f9fafb' },
      });
      xtermRef.current.open(terminalRef.current);
      window.electronAPI.onLog((message) => {
        xtermRef.current.writeln(message);
      });
    }
  }, []);

  const runCommand = async (data) => {
    await window.electronAPI.runCommand(data);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold text-center mb-6">GARE: Graphical Automation Runtime Environment</h1>
      <div className="flex justify-center space-x-4 mb-6">
        {['containers', 'testing', 'scraping', 'scripting', 'monitoring'].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 rounded ${activeTab === tab ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      <div className="bg-white p-6 rounded shadow">
        {activeTab === 'containers' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Container Management</h2>
            <p className="mb-4">Manage Docker containers for automation tasks.</p>
            <button
              className="bg-green-500 text-white px-4 py-2 rounded mr-2"
              onClick={() => runCommand({ engine: 'puppeteer', url: 'https://example.com' })}
            >
              Run Puppeteer Container
            </button>
          </div>
        )}
        {activeTab === 'testing' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Testing</h2>
            <p className="mb-4">Run automated UI tests using Puppeteer.</p>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded"
              onClick={() => runCommand({ engine: 'puppeteer', url: 'https://example.com' })}
            >
              Run Test
            </button>
          </div>
        )}
        {activeTab === 'scraping' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Web Scraping</h2>
            <p className="mb-4">Scrape data using Puppeteer.</p>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded"
              onClick={() => runCommand({ engine: 'puppeteer', url: 'https://example.com' })}
            >
              Start Scraping
            </button>
          </div>
        )}
        {activeTab === 'scripting' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Scripting</h2>
            <p className="mb-4">Execute Python scripts in a containerized environment.</p>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded"
              onClick={() => runCommand({ engine: 'python', url: '' })}
            >
              Run Script
            </button>
          </div>
        )}
        {activeTab === 'monitoring' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Monitoring</h2>
            <p className="mb-4">View metrics from containerized applications.</p>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded"
              onClick={() => runCommand({ engine: 'prometheus', url: 'http://prometheus:9090/api/v1/query?query=up' })}
            >
              View Metrics
            </button>
          </div>
        )}
      </div>
      <div className="mt-6 bg-gray-800 text-white p-4 rounded">
        <h3 className="text-lg font-semibold mb-2">Output</h3>
        <div ref={terminalRef} className="bg-gray-800"></div>
      </div>
    </div>
  );
}
