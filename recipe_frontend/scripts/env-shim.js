#!/usr/bin/env node
/**
 * PUBLIC_INTERFACE
 * env-shim.js
 * Cross-platform environment preparation for CRA start/build scripts.
 * - Ensures BROWSER, HOST, PORT defaults and other flags
 * - Respects existing env but fills safe defaults
 */
const cp = require('child_process');

const isWindows = process.platform === 'win32';

// Respect provided PORT, else default to 3000
process.env.PORT = process.env.PORT || process.env.REACT_APP_PORT || '3000';
// Ensure the dev server binds publicly for previews
process.env.HOST = process.env.HOST || '0.0.0.0';
// Avoid opening a browser in CI/preview
process.env.BROWSER = process.env.BROWSER || 'none';
// Keep source maps off by default to reduce memory
process.env.GENERATE_SOURCEMAP = process.env.GENERATE_SOURCEMAP ?? (process.env.REACT_APP_ENABLE_SOURCE_MAPS || 'false');
// Enable polling to avoid inotify issues in containers
process.env.CHOKIDAR_USEPOLLING = process.env.CHOKIDAR_USEPOLLING || 'true';
process.env.WATCHPACK_POLLING = process.env.WATCHPACK_POLLING || 'true';

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

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`Child process terminated by signal: ${signal}`);
    process.exit(137);
  }
  process.exit(code ?? 0);
});
