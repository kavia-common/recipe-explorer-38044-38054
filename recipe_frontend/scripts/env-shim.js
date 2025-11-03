#!/usr/bin/env node
/**
 * PUBLIC_INTERFACE
 * env-shim.js
 * Cross-platform environment preparation for CRA start/build scripts.
 * - Ensures BROWSER, HOST, PORT defaults and other safe flags
 * - Respects existing env but fills safe defaults
 * - Avoids overriding webpack-dev-server options that would break CRA 5
 */
const cp = require('child_process');

// Respect provided PORT, else default to 3000
process.env.PORT = process.env.PORT || process.env.REACT_APP_PORT || '3000';
// Ensure the dev server binds publicly for previews
process.env.HOST = process.env.HOST || '0.0.0.0';
// Avoid opening a browser in CI/preview
process.env.BROWSER = process.env.BROWSER || 'none';

// Keep source maps off by default to reduce memory unless explicitly enabled
if (typeof process.env.GENERATE_SOURCEMAP === 'undefined') {
  process.env.GENERATE_SOURCEMAP = process.env.REACT_APP_ENABLE_SOURCE_MAPS || 'false';
}

// Enable polling to avoid inotify issues in containers (safe)
process.env.CHOKIDAR_USEPOLLING = process.env.CHOKIDAR_USEPOLLING || 'true';
process.env.WATCHPACK_POLLING = process.env.WATCHPACK_POLLING || 'true';

// IMPORTANT: Do NOT set WDS_SOCKET_* or client.webSocketURL related envs here.
// Leaving WDS_SOCKET_PORT as empty string caused "client.webSocketURL.port should be a non-empty string".
// Remove any previously injected invalid values.
if (process.env.WDS_SOCKET_PORT === '') delete process.env.WDS_SOCKET_PORT;

// Reduce dev overhead
process.env.DISABLE_ESLINT_PLUGIN = process.env.DISABLE_ESLINT_PLUGIN || 'true';

// Constrain memory to reduce OOM risks
if (!process.env.NODE_OPTIONS) {
  process.env.NODE_OPTIONS = '--max_old_space_size=256';
}

// Build the command (pass through args after the shim)
const args = process.argv.slice(2);
const cmd = args[0] || 'react-scripts';
const cmdArgs = args.length > 1 ? args.slice(1) : ['start'];

// Start CRA dev server without binding a competing temporary server
const child = cp.spawn(cmd, cmdArgs, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    CI: process.env.CI || 'true',
  }
});

// Forward termination signals to child and exit cleanly
const forward = (signal) => {
  if (child && child.pid) {
    try {
      process.kill(child.pid, signal);
    } catch (_) {}
  }
};
process.on('SIGTERM', () => {
  forward('SIGTERM');
  process.exit(0);
});
process.on('SIGINT', () => {
  forward('SIGINT');
  process.exit(0);
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`Child process terminated by signal: ${signal}`);
    if (signal === 'SIGTERM' || signal === 'SIGINT') {
      process.exit(0);
    }
    process.exit(137);
  }
  process.exit(code ?? 0);
});
