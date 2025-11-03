import React, { useState, useEffect } from 'react';
import logo from './logo.svg';
import './App.css';

/**
 * PUBLIC_INTERFACE
 * App
 * Root component for Recipe Explorer demo.
 * Includes a theme toggle and displays a simple landing message.
 * Healthcheck file is served at `${process.env.REACT_APP_HEALTHCHECK_PATH || '/healthz'}` from public/.
 * A bootstrap health server is also provided by scripts/env-shim.js for CI/preview reliability.
 */
function App() {
  const [theme, setTheme] = useState('light');

  // Effect to apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="App">
      <header className="App-header">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <p>
          Current theme: <strong>{theme}</strong>
        </p>
        <a
          className="App-link"
          href={process.env.REACT_APP_BACKEND_URL || 'https://reactjs.org'}
          target="_blank"
          rel="noopener noreferrer"
        >
          {process.env.REACT_APP_BACKEND_URL ? 'Backend URL' : 'Learn React'}
        </a>
      </header>
    </div>
  );
}

export default App;
