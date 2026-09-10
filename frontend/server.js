// frontend/server.js
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
// Lightweight HTTP server for Hikari Dashboard with live agent telemetry and control endpoints.

const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_FILE = path.join(__dirname, "..", "agents", "data", "daemon_state.json");
const CONTRACTS_FILE = path.join(__dirname, "..", "deployed_contracts.json");

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function readJsonSafe(filePath, fallback = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
  }
  return fallback;
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  // API 1: Live Agent Telemetry & MEV Metrics
  if (pathname === "/api/telemetry") {
    const data = readJsonSafe(DATA_FILE, {
      status: "ONLINE",
      lastCycleTimestamp: Date.now(),
      totalCycles: 0,
      activeStrategies: [],
      vaultState: {
        totalAssetsStroops: "1000000000000",
        idleAssetsStroops: "250000000000",
        allocatedAssetsStroops: "750000000000",
        reservePercentage: 25,
      },
      mevMetrics: {
        totalCapturedStroops: "0",
        vaultBoostStroops: "0",
      },
      circuitBreaker: {
        isGateSealed: false,
        isBunkerMode: false,
        haircutBps: 0,
        drawdownBps: 150,
      },
      recentLogs: ["Hikari Agent Layer initialized."],
    });

    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    return res.end(JSON.stringify(data));
  }

  // API 2: Deployed Contracts
  if (pathname === "/api/contracts") {
    const contracts = readJsonSafe(CONTRACTS_FILE, {});
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    return res.end(JSON.stringify(contracts));
  }

  // API 3: Trigger Autonomous Rebalance & MEV Cycle
  if (pathname === "/api/trigger-cycle" && req.method === "POST") {
    const cmd = "node dist/daemon.js --once";
    const agentsDir = path.join(__dirname, "..", "agents");

    exec(cmd, { cwd: agentsDir }, (err, stdout, stderr) => {
      if (err) {
        console.error("Cycle trigger error:", stderr || err.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: err.message, stderr }));
      }
      const updated = readJsonSafe(DATA_FILE, {});
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ success: true, stdout, telemetry: updated }));
    });
    return;
  }

  // API 4: Simulate Volatility Shock & Circuit Breaker Trigger
  if (pathname === "/api/simulate-shock" && req.method === "POST") {
    const current = readJsonSafe(DATA_FILE, {});
    current.circuitBreaker = {
      isGateSealed: true,
      isBunkerMode: true,
      haircutBps: 1650, // 16.5% emergency haircut
      drawdownBps: 1650,
      triggerReason: "Critical Drawdown of 16.5% triggered GateSeal circuit breaker and Bunker Mode lock",
    };
    current.status = "SEALED";
    current.recentLogs.unshift(
      `[${new Date().toISOString()}] 🚨 [CRITICAL ALERT] Drawdown exceeded 15% threshold! GateSeal SEALED. Bunker Mode engaged.`
    );

    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(current, null, 2), "utf-8");
    } catch (e) {}

    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ success: true, circuitBreaker: current.circuitBreaker }));
  }

  // API 5: Reset Circuit Breaker to Normal
  if (pathname === "/api/reset-circuit-breaker" && req.method === "POST") {
    const current = readJsonSafe(DATA_FILE, {});
    current.circuitBreaker = {
      isGateSealed: false,
      isBunkerMode: false,
      haircutBps: 0,
      drawdownBps: 150,
      triggerReason: undefined,
    };
    current.status = "ONLINE";
    current.recentLogs.unshift(
      `[${new Date().toISOString()}] 🛡️ [RECOVERY] GateSeal unsealed by DAO timelock. Bunker Mode deactivated. Turbo Mode restored.`
    );

    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(current, null, 2), "utf-8");
    } catch (e) {}

    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ success: true, circuitBreaker: current.circuitBreaker }));
  }

  // Static File Serving
  let reqPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(PUBLIC_DIR, reqPath);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "text/plain" });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Hikari Protocol Dashboard running at http://localhost:${PORT}`);
});
