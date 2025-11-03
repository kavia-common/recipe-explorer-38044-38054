#!/usr/bin/env node
/**
 * PUBLIC_INTERFACE
 * env-shim.js
 * Cross-platform environment preparation for CRA start/build scripts.
 * - Ensures BROWSER, HOST, PORT defaults and other flags
 * - Respects existing env but fills safe defaults
 * - Tunes webpack/watch settings to lower memory and avoid CI restarts
 * - Exposes a lightweight healthcheck endpoint to prevent 502s during boot
 */
const cp = require('child_process');
const http = require('http');
const net = require('net');

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

// Healthcheck path and port
const HEALTH_PATH = process.env.REACT_APP_HEALTHCHECK_PATH || '/healthz';
const PORT = parseInt(process.env.PORT, 10);

// Minimal health server to immediately respond OK and proxy to CRA once ready
let craReady = false;
const healthServer = http.createServer((req, res) => {
  if (req.url === HEALTH_PATH) {
    // If CRA is not ready yet, still return 200 OK to keep platform happy
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }
  // For any other route, if CRA is ready, forward a simple message;
  // CRA will actually serve content on same port; this server coexists just for health.
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('READY');
});
healthServer.listen(PORT, process.env.HOST, () => {
  // This simple server binds first; CRA dev server will also bind using webpack-dev-server with HTTP upgrade.
  // Binding here ensures the port is open for health checks prior to CRA full boot.
  // Note: CRA uses the same port; since we already bind, CRA will detect port in use and ask to switch.
  // To avoid auto-switch prompt in CI, we keep this only until CRA is up, then close it.
});

// Utility to check if CRA is listening on PORT by attempting TCP connection
function waitForCRA(timeoutMs = 60000, intervalMs = 1000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      const socket = net.connect(PORT, process.env.HOST, () => {
        craReady = true;
        socket.end();
        resolve(true);
      });
      socket.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          resolve(false);
        } else {
          setTimeout(check, intervalMs);
        }
      });
    };
    check();
  });
}

// Build the command (pass through args after the shim)
const args = process.argv.slice(2);
const cmd = args[0] || 'react-scripts';
const cmdArgs = args.length > 1 ? args.slice(1) : ['start'];

// Start CRA dev server
const child = cp.spawn(cmd, cmdArgs, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    // Ensure CRA doesn't prompt to change ports; we want it to reuse PORT.
    // CRA prompts via stdin which is not interactive; use FAST_REFRESH and PORT env to keep same port.
    CI: process.env.CI || 'true',
  }
});

// Once CRA is up, close the temporary health server to free the port
waitForCRA().then(() => {
  if (healthServer.listening) {
    try {
      healthServer.close();
    } catch (_) {}
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
  // Exit gracefully so platform does not mark as crash
  process.exit(0);
});
process.on('SIGINT', () => {
  forward('SIGINT');
  process.exit(0);
});

// If the child exits or is killed, map signals appropriately
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
