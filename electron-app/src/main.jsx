import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App'; 

// Get the root element from the HTML
const container = document.getElementById('root');

// Create a root and render the App component
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error('Failed to find the root element to mount the React application.');
}
