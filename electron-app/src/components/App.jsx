import React, { useState, useEffect, useRef } from 'react';
// Changed import from 'xterm' to '@xterm/xterm'
import { Terminal } from '@xterm/xterm';
// Changed CSS import from 'xterm/css/xterm.css' to '@xterm/xterm/css/xterm.css'
import '@xterm/xterm/css/xterm.css';
import '../index.css';

// Define the structure of the electronAPI for TypeScript/JSDoc type checking
/**
 * @typedef {object} ElectronAPI
 * @property {(data: any) => Promise<string>} runCommand - Sends a command to the main process.
 * @property {(callback: (message: string) => void) => void} onLog - Registers a callback for log messages from the main process.
 */

// Declare the electronAPI on the Window object for global access
// @ts-ignore
const electronAPI = window.electronAPI;

export default function App() {
  const [activeTab, setActiveTab] = useState('containers');
  const terminalRef = useRef(null); // Ref for the div where xterm will render
  const xtermRef = useRef(null);    // Ref for the xterm Terminal instance

  // Effect to initialize xterm.js and register the onLog listener
  useEffect(() => {
    console.log('[App] React component mounted. Initializing terminal.');

    // Only initialize xterm if the ref exists and it hasn't been initialized yet
    if (terminalRef.current && !xtermRef.current) {
      const term = new Terminal({
        cols: 80, // Adjust columns as needed, or calculate dynamically
        rows: 20, // Adjust rows as needed, or calculate dynamically
        theme: {
          background: '#1f2937', // bg-gray-800
          foreground: '#f9fafb', // text-gray-50
          cursor: '#f9fafb',
          selectionBackground: '#4a5568', // bg-gray-600
        },
        convertEol: true, // Convert LF to CRLF
        disableStdin: true, // We are only displaying output, not taking input directly
      });

      term.open(terminalRef.current);
      xtermRef.current = term; // Store the xterm instance in the ref

      // Register the onLog listener from electronAPI
      if (electronAPI && electronAPI.onLog) {
        console.log('[App] Registering electronAPI.onLog with xterm.');
        electronAPI.onLog((message) => {
          // xterm.js writeln adds a newline
          xtermRef.current.writeln(message);
        });
      } else {
        console.error('[App] electronAPI.onLog is undefined. Preload script might not have loaded or executed.');
        xtermRef.current.writeln('[Error] Failed to initialize electronAPI. Check preload.js and main.js.');
      }
    }

    // Cleanup function: This runs when the component unmounts
    return () => {
      console.log('[App] React component unmounting. Disposing xterm.');
      if (xtermRef.current) {
        xtermRef.current.dispose(); // Clean up xterm instance
        xtermRef.current = null;
      }
      // If you had a specific listener to remove, you'd do it here,
      // e.g., electronAPI.removeListener('log', yourLogCallback);
    };
  }, []); // Empty dependency array means this effect runs once on mount and cleanup on unmount


  const runCommand = async (data) => {
    if (!electronAPI || !electronAPI.runCommand) {
      console.error('[App] electronAPI.runCommand is undefined or electronAPI not available.');
      xtermRef.current?.writeln('[Error] electronAPI not available to run command.');
      return;
    }

    xtermRef.current?.writeln(`[App] Sending command: ${JSON.stringify(data)}`);
    try {
      const response = await electronAPI.runCommand(data);
      xtermRef.current?.writeln(`[App] Command response: ${response}`);
    } catch (error) {
      console.error('[App] Error sending command:', error);
      xtermRef.current?.writeln(`[Error] Failed to send command: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-inter p-6 flex flex-col items-center">
      {/*
        Removed: Tailwind CSS CDN and Font Import <style> block and <script> tag.
        These should be handled by your build process and included in '../index.css'
        or directly in your index.html if not using a build process for CSS.
      */}

      <h1 className="text-4xl font-bold text-center mb-8 text-indigo-400">
        GARE: Graphical Automation Runtime Environment
      </h1>

      {/* Tab Navigation */}
      <div className="flex justify-center space-x-4 mb-8 bg-gray-800 p-3 rounded-xl shadow-lg">
        {['containers', 'testing', 'scraping', 'scripting', 'monitoring'].map((tab) => (
          <button
            key={tab}
            className={`px-6 py-3 rounded-lg font-semibold transition duration-300 ease-in-out transform hover:scale-105
              ${activeTab === tab
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content Area */}
      <div className="w-full max-w-4xl bg-gray-800 p-8 rounded-xl shadow-lg mb-8">
        {activeTab === 'containers' && (
          <div>
            <h2 className="text-3xl font-semibold mb-4 text-gray-200">Container Management</h2>
            <p className="mb-6 text-gray-300">Manage Docker containers for automation tasks.</p>
            <button
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg mr-4 shadow-md transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              onClick={() => runCommand({ engine: 'puppeteer', action: 'run_container', url: 'https://example.com' })}
            >
              Run Puppeteer Container
            </button>
            <button
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg shadow-md transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              onClick={() => runCommand({ engine: 'docker', action: 'stop_all' })}
            >
              Stop All Containers
            </button>
          </div>
        )}
        {activeTab === 'testing' && (
          <div>
            <h2 className="text-3xl font-semibold mb-4 text-gray-200">Automated Testing</h2>
            <p className="mb-6 text-gray-300">Run automated UI tests using Puppeteer or Playwright.</p>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-md transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              onClick={() => runCommand({ engine: 'puppeteer', action: 'run_test', test_suite: 'login_flow' })}
            >
              Run UI Test
            </button>
          </div>
        )}
        {activeTab === 'scraping' && (
          <div>
            <h2 className="text-3xl font-semibold mb-4 text-gray-200">Web Scraping</h2>
            <p className="mb-6 text-gray-300">Scrape data from websites using Puppeteer.</p>
            <button
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg shadow-md transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              onClick={() => runCommand({ engine: 'puppeteer', action: 'scrape_data', target_url: 'https://news.ycombinator.com' })}
            >
              Start Scraping
            </button>
          </div>
        )}
        {activeTab === 'scripting' && (
          <div>
            <h2 className="text-3xl font-semibold mb-4 text-gray-200">Script Execution</h2>
            <p className="mb-6 text-gray-300">Execute custom Python scripts in a containerized environment.</p>
            <button
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg shadow-md transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              onClick={() => runCommand({ engine: 'python', action: 'run_script', script_name: 'data_processor.py' })}
            >
              Run Python Script
            </button>
          </div>
        )}
        {activeTab === 'monitoring' && (
          <div>
            <h2 className="text-3xl font-semibold mb-4 text-gray-200">System Monitoring</h2>
            <p className="mb-6 text-gray-300">View real-time metrics and logs from your automation environment.</p>
            <button
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg shadow-md transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              onClick={() => runCommand({ engine: 'prometheus', action: 'get_metrics', query: 'up' })}
            >
              Fetch Metrics
            </button>
          </div>
        )}
      </div>

      {/* Terminal Output Area */}
      <div className="w-full max-w-4xl bg-gray-800 text-white p-6 rounded-xl shadow-lg">
        <h3 className="text-2xl font-semibold mb-4 text-gray-200">Terminal Output</h3>
        <div
          ref={terminalRef}
          className="bg-gray-900 rounded-lg border border-gray-700 p-2"
          style={{ minHeight: '300px', width: '100%' }} // Ensure terminal has a visible area
        >
          {/* xterm.js will render the terminal here */}
        </div>
      </div>
    </div>
  );
}
