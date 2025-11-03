#!/usr/bin/env node
/**
 * PUBLIC_INTERFACE
 * env-shim.js
 * Cross-platform environment preparation for CRA start/build scripts.
 * - Ensures BROWSER, HOST, PORT defaults and other flags
 * - Respects existing env but fills safe defaults
 * - Tunes webpack/watch settings to lower memory and avoid CI restarts
 */
const cp = require('child_process');

// Respect provided PORT, else default to 3000
process.env.PORT = process.env.PORT || process.env.REACT_APP_PORT || '3000';
// Ensure the dev server binds publicly for previews
process.env.HOST = process.env.HOST || '0.0.0.0';
// Avoid opening a browser in CI/preview
process.env.BROWSER = process.env.BROWSER || 'none';
// Keep source maps off by default to reduce memory
process.env.GENERATE_SOURCEMAP =
  process.env.GENERATE_SOURCEMAP ?? (process.env.REACT_APP_ENABLE_SOURCE_MAPS || 'false');
// Enable polling to avoid inotify issues in containers
process.env.CHOKIDAR_USEPOLLING = process.env.CHOKIDAR_USEPOLLING || 'true';
process.env.WATCHPACK_POLLING = process.env.WATCHPACK_POLLING || 'true';

// Additional low-memory webpack/watch tuning
process.env.WDS_SOCKET_PORT = process.env.WDS_SOCKET_PORT || ''; // avoid port mismatch noise
process.env.DISABLE_ESLINT_PLUGIN = process.env.DISABLE_ESLINT_PLUGIN || 'true'; // reduce dev overhead
process.env.REACT_DISABLE_NEW_JSX_TRANSFORM = process.env.REACT_DISABLE_NEW_JSX_TRANSFORM || 'false';
// Limit file watching intensity
process.env.WEBPACK_DEV_SERVER_WATCH_OPTIONS_POLL = process.env.WEBPACK_DEV_SERVER_WATCH_OPTIONS_POLL || '1000';
process.env.WEBPACK_DEV_SERVER_WATCH_OPTIONS_AGGREGATE_TIMEOUT =
  process.env.WEBPACK_DEV_SERVER_WATCH_OPTIONS_AGGREGATE_TIMEOUT || '1200';

// Constrain memory to reduce OOM risks
// If NODE_OPTIONS already set, keep it; otherwise set max_old_space_size
if (!process.env.NODE_OPTIONS) {
  process.env.NODE_OPTIONS = '--max_old_space_size=256';
}

// Build the command (pass through args after the shim)
const args = process.argv.slice(2);
const cmd = args[0] || 'react-scripts';
const cmdArgs = args.length > 1 ? args.slice(1) : ['start'];

const child = cp.spawn(cmd, cmdArgs, {
  stdio: 'inherit',
  shell: true,
  env: process.env
});

// Forward termination signals to child and exit cleanly
const forward = (signal) => {
  if (child && child.pid) {
    try {
      process.kill(child.pid, signal);
    } catch (_) {}
  }
};
process.on('SIGTERM', () => forward('SIGTERM'));
process.on('SIGINT', () => forward('SIGINT'));

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`Child process terminated by signal: ${signal}`);
    // Map common termination signals to 0 to avoid CI misinterpreting container stop as a failure
    if (signal === 'SIGTERM' || signal === 'SIGINT') {
      process.exit(0);
    }
    // Non-graceful kills (e.g., SIGKILL) still propagate as 137 for visibility
    process.exit(137);
  }
  process.exit(code ?? 0);
});
