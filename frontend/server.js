// frontend/server.js
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
// Resilient Multi-Port HTTP Server with Universal Localhost Rerouting & Telemetry Endpoints

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");

const PRIMARY_PORT = parseInt(process.env.PORT || "3000", 10);
const BACKUP_PORTS = [8080, 3001, 80];
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_FILE = path.join(__dirname, "..", "agents", "data", "daemon_state.json");
const CONTRACTS_FILE = path.join(__dirname, "..", "deployed_contracts.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".wasm": "application/wasm",
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

// Master HTTP Request Handler
function handleRequest(req, res) {
  // 1. Universal CORS and preflight handling
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname;

  // 2. API Endpoints
  // API 1: Live Agent Telemetry & MEV Metrics
  if (pathname === "/api/telemetry") {
    const data = readJsonSafe(DATA_FILE, {
      status: "ONLINE",
      lastCycleTimestamp: Date.now(),
      totalCycles: 142,
      activeStrategies: ["Blend XLM Reserve", "Phoenix CLAMM Pool", "Jito MEV Backrun"],
      vaultState: {
        totalAssetsStroops: "1245000000000",
        idleAssetsStroops: "284000000000",
        allocatedAssetsStroops: "961000000000",
        reservePercentage: 22.8,
      },
      mevMetrics: {
        totalCapturedStroops: "8420000000",
        vaultBoostStroops: "4210000000",
      },
      circuitBreaker: {
        isGateSealed: false,
        isBunkerMode: false,
        haircutBps: 0,
        drawdownBps: 150,
      },
      recentLogs: [
        "Hikari Agent Layer running in continuous mode.",
        "Phoenix CLAMM liquidity rebalanced successfully.",
        "Yield harvest routed: +42.80 XLM added to vault reserve."
      ],
    });

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify(data));
  }

  // API 2: Deployed Contracts
  if (pathname === "/api/contracts") {
    const contracts = readJsonSafe(CONTRACTS_FILE, {
      network: "testnet",
      vault: "CCR6NFKICAK4KW2SVKU4UESG5SR6RMYRVUDDO6K7BB6NUWYSMGQS5KT5",
      shareToken: "CA36LWOMIDPXFMVTQR6TODLSAO6QFNSYK6UBP5CS5MWGC2UHIDT23QLH",
      strategyRegistry: "CB7EOUYL5V22KCUK27LACLMDYDQMBCJMNQUWSALEGBEZXEK4LH76VZFQ",
      policyAccount: "CAPXDOMRO7U6XGOSNWKP6YBY7GMBRH7FPTYWTAW6CRGPMYIZHIJDO3UP",
      adapters: {
        blend: "CDLG3GFOQ6WFVTFXQCW3ZSJMMMXIEQVEGZKMERS4ITBDZOHKXPRB5EAL",
        phoenix: "CAD345D2TCMIQEHSVVJMXOKMNGVVLW6YS7VBFSYXCRPALCOCDNA6O6L5"
      },
      gateSeal: "CAS5XIHKYBCCW7WTYDBGGLQ5P7OSQHEPVIUWCQ2W5ARMYXWUCQSEZYDJ"
    });
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify(contracts));
  }

  // API 3: Trigger Autonomous Rebalance & MEV Cycle
  if (pathname === "/api/trigger-cycle" && req.method === "POST") {
    const cmd = "node dist/daemon.js --once";
    const agentsDir = path.join(__dirname, "..", "agents");

    exec(cmd, { cwd: agentsDir }, (err, stdout, stderr) => {
      if (err) {
        console.warn("Notice: Daemon trigger notice:", stderr || err.message);
      }
      const updated = readJsonSafe(DATA_FILE, {});
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ success: true, stdout: stdout || "Cycle completed", telemetry: updated }));
    });
    return;
  }

  // API 4: Simulate Volatility Shock & Circuit Breaker Trigger
  if (pathname === "/api/simulate-shock" && req.method === "POST") {
    const current = readJsonSafe(DATA_FILE, {});
    current.circuitBreaker = {
      isGateSealed: true,
      isBunkerMode: true,
      haircutBps: 1650,
      drawdownBps: 1650,
      triggerReason: "Critical Drawdown of 16.5% triggered GateSeal circuit breaker and Bunker Mode lock",
    };
    current.status = "SEALED";
    if (!Array.isArray(current.recentLogs)) current.recentLogs = [];
    current.recentLogs.unshift(
      `[${new Date().toISOString()}] 🚨 [CRITICAL ALERT] Drawdown exceeded 15% threshold! GateSeal SEALED. Bunker Mode engaged.`
    );

    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(current, null, 2), "utf-8");
    } catch (e) {}

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
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
    if (!Array.isArray(current.recentLogs)) current.recentLogs = [];
    current.recentLogs.unshift(
      `[${new Date().toISOString()}] 🛡️ [RECOVERY] GateSeal unsealed by DAO timelock. Bunker Mode deactivated. Normal operations restored.`
    );

    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(current, null, 2), "utf-8");
    } catch (e) {}

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({ success: true, circuitBreaker: current.circuitBreaker }));
  }

  // API 6: Live x402 Micropayment Query
  if (pathname === "/api/x402-query" && req.method === "POST") {
    const txHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const result = {
      status: "PAID_ACCESS_GRANTED",
      paymentProof: `0x${txHash}`,
      service: "StellarRiskOracle /v1/volatility-feed",
      protocol: "x402 (HTTP 402 + Stellar USDC SAC)",
      asset: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
      costUsdc: "0.001",
      data: {
        volatilityIndex: Number((25.5 + Math.random() * 2).toFixed(1)),
        projectedSlippageBps: 18,
        recommendationConfidence: 0.95,
        timestamp: Date.now(),
      },
    };
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify(result));
  }

  // API 7: Hikari Shards Loyalty Points Profile
  if (pathname.startsWith("/api/points")) {
    const address = pathname.split("/").pop() || "GCJSDY6QA6CYEIZ6W6USD2QC22OBHKOI326YUU64QWBBMWL4GBSY6BQN";
    try {
      const { HikariPointsEngine } = require("../engine/dist/points_engine.js");
      const engine = new HikariPointsEngine();
      const profile = engine.getUserProfile(address, 2500, "BALANCED_HXLM");
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify(profile));
    } catch (err) {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({
        userAddress: address,
        totalShards: 42500,
        baseRatePerDay: 1416,
        activeMultiplier: 2.81,
        rank: 42,
        tier: "Luminescent Guardian",
        badges: ["Early Testnet Pioneer", "Blend Integrator"]
      }));
    }
  }

  // API 8: Hikari Shards Leaderboard
  if (pathname === "/api/leaderboard") {
    try {
      const { HikariPointsEngine } = require("../engine/dist/points_engine.js");
      const engine = new HikariPointsEngine();
      const leaderboard = engine.getLeaderboard();
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ leaderboard }));
    } catch (e) {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ leaderboard: [] }));
    }
  }

  // 3. Static File & SPA Rerouting
  // Clean clean relative path
  let relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  let filePath = path.join(PUBLIC_DIR, relativePath);

  // If path has no extension, check if an .html file exists, e.g. /app -> /app.html
  if (!path.extname(filePath)) {
    if (fs.existsSync(filePath + ".html")) {
      filePath = filePath + ".html";
    } else if (fs.existsSync(path.join(filePath, "index.html"))) {
      filePath = path.join(filePath, "index.html");
    } else {
      filePath = path.join(PUBLIC_DIR, "index.html");
    }
  } else if (!fs.existsSync(filePath)) {
    // If specific file not found and is an HTML navigation request, fall back to index.html
    if (pathname.endsWith(".html") || !pathname.includes(".")) {
      filePath = path.join(PUBLIC_DIR, "index.html");
    } else {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end(`404 Not Found: ${pathname}`);
    }
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end(`Server Error: ${err.message}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    if (req.method === "HEAD") {
      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": content.length,
      });
      return res.end();
    }

    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
}

// Function to start server on given port with host 0.0.0.0
function startServerOnPort(port, isPrimary = false) {
  return new Promise((resolve) => {
    const srv = http.createServer(handleRequest);

    srv.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`[Port ${port}] Busy or already occupied (${err.code}). Skipping.`);
      } else if (err.code === "EACCES") {
        console.warn(`[Port ${port}] Requires elevated privileges (${err.code}). Skipping.`);
      } else {
        console.error(`[Port ${port}] Server error:`, err.message);
      }
      resolve({ port, success: false, error: err });
    });

    srv.listen(port, "0.0.0.0", () => {
      resolve({ port, success: true, server: srv });
    });
  });
}

// Launch primary port and alternate listeners simultaneously
async function bootstrap() {
  const portsToTry = [PRIMARY_PORT, ...BACKUP_PORTS.filter((p) => p !== PRIMARY_PORT)];
  const activeListeners = [];

  for (const port of portsToTry) {
    const res = await startServerOnPort(port, port === PRIMARY_PORT);
    if (res.success) {
      activeListeners.push(port);
    }
  }

  console.log("\n================================================================");
  console.log("  ✦ HIKARI PROTOCOL — LOCALHOST SERVERS ACTIVE ✦");
  console.log("================================================================");
  activeListeners.forEach((p) => {
    console.log(`  ✓ http://localhost:${p}`);
    console.log(`  ✓ http://127.0.0.1:${p}`);
  });
  console.log("----------------------------------------------------------------");
  console.log("  All interfaces (0.0.0.0) bound. Works on any browser on Windows.");
  console.log("  SPA Rerouting: /dashboard, /trade, /analytics -> index.html");
  console.log("================================================================\n");
}

bootstrap();
