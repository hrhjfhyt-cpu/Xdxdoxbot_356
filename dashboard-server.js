const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.DASHBOARD_TOKEN;

if (!TOKEN) {
  console.error("❌ DASHBOARD_TOKEN is not set.");
  process.exit(1);
}

const publicDir = path.join(__dirname, "public");

let botProcess = null;
let logs = [];

function addLog(text) {
  const line = `[${new Date().toISOString()}] ${text}`;
  logs.push(line);

  if (logs.length > 300) {
    logs.shift();
  }

  console.log(line);
}

function isBotRunning() {
  return botProcess && !botProcess.killed;
}

function startBot() {
  if (isBotRunning()) {
    addLog("⚠️ Bot is already running.");
    return false;
  }

  addLog("▶️ Starting bot...");

  botProcess = spawn(process.execPath, ["index.js"], {
    cwd: __dirname,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  botProcess.stdout.on("data", data => {
    String(data)
      .split("\n")
      .filter(Boolean)
      .forEach(line => addLog(line));
  });

  botProcess.stderr.on("data", data => {
    String(data)
      .split("\n")
      .filter(Boolean)
      .forEach(line => addLog(`ERR! ${line}`));
  });

  botProcess.on("close", code => {
    addLog(`⛔ Bot process stopped. Exit code: ${code}`);
    botProcess = null;
  });

  botProcess.on("error", err => {
    addLog(`❌ Bot process error: ${err.message}`);
    botProcess = null;
  });

  return true;
}

function stopBot() {
  if (!isBotRunning()) {
    addLog("⚠️ Bot is already stopped.");
    return false;
  }

  addLog("⛔ Stopping bot...");

  botProcess.kill("SIGTERM");

  return true;
}

function authenticated(req) {
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${TOKEN}`;
}

function sendJSON(res, status, data) {
  const body = JSON.stringify(data);

  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });

  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", chunk => {
      body += chunk;

      if (body.length > 5 * 1024 * 1024) {
        reject(new Error("Request too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

function serveIndex(res) {
  const file = path.join(publicDir, "index.html");

  if (!fs.existsSync(file)) {
    res.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8"
    });

    return res.end("Dashboard file not found.");
  }

  const html = fs.readFileSync(file);

  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8"
  });

  res.end(html);
}

const server = http.createServer(async (req, res) => {
  try {
    // Dashboard page
    if (req.method === "GET" && req.url === "/") {
      return serveIndex(res);
    }

    // Health
    if (req.method === "GET" && req.url === "/health") {
      return sendJSON(res, 200, {
        ok: true,
        dashboard: true,
        botRunning: isBotRunning()
      });
    }

    // Everything below requires authentication
    if (!authenticated(req)) {
      return sendJSON(res, 401, {
        error: "Unauthorized"
      });
    }

    // Status
    if (req.method === "GET" && req.url === "/api/status") {
      return sendJSON(res, 200, {
        running: isBotRunning(),
        pid: botProcess ? botProcess.pid : null
      });
    }

    // Start
    if (req.method === "POST" && req.url === "/api/bot/start") {
      const started = startBot();

      return sendJSON(res, 200, {
        ok: true,
        running: isBotRunning(),
        started
      });
    }

    // Stop
    if (req.method === "POST" && req.url === "/api/bot/stop") {
      const stopped = stopBot();

      return sendJSON(res, 200, {
        ok: true,
        running: isBotRunning(),
        stopped
      });
    }

    // Logs
    if (req.method === "GET" && req.url === "/api/logs") {
      return sendJSON(res, 200, {
        logs
      });
    }

    // Wox config
    if (req.method === "GET" && req.url === "/api/wox") {
      let config = {
        enabled: true,
        interval: 15000,
        text: ""
      };

      try {
        if (fs.existsSync("./wox_config.json")) {
          config = {
            ...config,
            ...JSON.parse(
              fs.readFileSync("./wox_config.json", "utf8")
            )
          };
        }
      } catch (e) {
        addLog(`❌ Wox config read error: ${e.message}`);
      }

      return sendJSON(res, 200, config);
    }

    // Update Wox config
    if (req.method === "POST" && req.url === "/api/wox") {
      const data = await readBody(req);

      const config = {
        enabled: Boolean(data.enabled),
        interval: Math.max(
          1000,
          Number(data.interval) || 15000
        ),
        text: typeof data.text === "string"
          ? data.text
          : ""
      };

      fs.writeFileSync(
        "./wox_config.json",
        JSON.stringify(config, null, 2),
        "utf8"
      );

      addLog("⚙️ Wox settings updated.");

      return sendJSON(res, 200, {
        ok: true,
        config
      });
    }

    // AppState update
    if (req.method === "POST" && req.url === "/api/appstate") {
      const data = await readBody(req);

      if (!Array.isArray(data.appState)) {
        return sendJSON(res, 400, {
          error: "appState must be an array"
        });
      }

      fs.writeFileSync(
        "./appstate.json",
        JSON.stringify(data.appState, null, 2),
        "utf8"
      );

      addLog("🔐 AppState updated. Restart bot to apply.");

      return sendJSON(res, 200, {
        ok: true,
        message: "AppState saved. Restart the bot to apply it."
      });
    }

    return sendJSON(res, 404, {
      error: "Not found"
    });

  } catch (err) {
    console.error(err);

    return sendJSON(res, 500, {
      error: err.message
    });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  addLog(`🌐 Dashboard server running on port ${PORT}`);

  // تشغيل البوت تلقائيًا عند تشغيل Railway
  startBot();
});

function shutdown() {
  addLog("🛑 Shutting down dashboard...");

  if (isBotRunning()) {
    botProcess.kill("SIGTERM");
  }

  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
