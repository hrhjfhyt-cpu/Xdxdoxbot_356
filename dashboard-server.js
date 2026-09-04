Enterconst http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const PORT = Number(process.env.PORT) || 3000;

// ========================================
// Dashboard Security
// ========================================

const DASHBOARD_TOKEN =
  process.env.DASHBOARD_TOKEN;

if (!DASHBOARD_TOKEN) {
  console.error(
    "❌ DASHBOARD_TOKEN is not configured."
  );

  process.exit(1);
}

// ========================================
// Bot Process
// ========================================

let botProcess = null;
let botStartedAt = null;

let logs = [];

function addLog(message) {
  const line =
    `[${new Date().toISOString()}] ${message}`;

  console.log(line);

  logs.push(line);

  if (logs.length > 300) {
    logs.shift();
  }
}

// ========================================
// Start Bot
// ========================================

function startBot() {

  if (
    botProcess &&
    !botProcess.killed
  ) {
    return false;
  }

  addLog("▶️ Starting bot...");

  botProcess = spawn(
    process.execPath,
    [
      path.join(
        __dirname,
        "index.js"
      )
    ],
    {
      cwd: __dirname,
      env: process.env,
      stdio: [
        "ignore",
        "pipe",
        "pipe"
      ]
    }
  );

  botStartedAt =
    new Date().toISOString();

  botProcess.stdout.on(
    "data",
    (data) => {

      const text =
        data.toString();

      text
        .split("\n")
        .filter(Boolean)
        .forEach((line) => {
          addLog(`BOT: ${line}`);
        });
    }
  );

  botProcess.stderr.on(
    "data",
    (data) => {

      const text =
        data.toString();

      text
        .split("\n")
        .filter(Boolean)
        .forEach((line) => {
          addLog(`BOT ERROR: ${line}`);
        });
    }
  );

  botProcess.on(
    "exit",
    (code, signal) => {

      addLog(
        `🛑 Bot stopped. code=${code} signal=${signal}`
      );

      botProcess = null;
      botStartedAt = null;
    }
  );

  botProcess.on(
    "error",
    (err) => {

      addLog(
        `❌ Bot process error: ${err.message}`
      );

      botProcess = null;
    }
  );

  return true;
}

// ========================================
// Stop Bot
// ========================================

function stopBot() {

  if (
    !botProcess ||
    botProcess.killed
  ) {
    return false;
  }

  addLog(
    "⏹️ Stopping bot completely..."
  );

  botProcess.kill(
    "SIGTERM"
  );

  return true;
}

// ========================================
// Auth
// ========================================

function authorized(req) {

  const auth =
    req.headers.authorization;

  if (!auth) {
    return false;
  }

  if (
    !auth.startsWith("Bearer ")
  ) {
    return false;
  }

  const token =
    auth.slice(7);

  return token ===
    DASHBOARD_TOKEN;
}

// ========================================
// JSON Body
// ========================================

function readBody(req) {

  return new Promise(
    (resolve, reject) => {

      let body = "";

      req.on(
        "data",
        (chunk) => {

          body += chunk;

          if (
            body.length >
            2 * 1024 * 1024
          ) {
            reject(
              new Error(
                "Request body too large"
              )
            );

            req.destroy();
          }
        }
      );

      req.on(
        "end",
        () => {

          if (!body) {
            resolve({});
            return;
          }

          try {
            resolve(
              JSON.parse(body)
            );
          } catch (e) {
            reject(
              new Error(
                "Invalid JSON"
              )
            );
          }
        }
      );

      req.on(
        "error",
        reject
      );
    }
  );
}

// ========================================
// JSON Response
// ========================================

function sendJSON(
  res,
  status,
  data
) {

  const output =
    JSON.stringify(data);

  res.writeHead(
    status,
    {
      "Content-Type":
        "application/json; charset=utf-8",
      "Content-Length":
        Buffer.byteLength(output)
    }
  );

  res.end(output);
}

// ========================================
// Wox Config
// ========================================

const woxConfigFile =
  path.join(
    __dirname,
    "wox_config.json"
  );

function getWoxConfig() {

  try {

    if (
      !fs.existsSync(
        woxConfigFile
      )
    ) {

      const defaultConfig = {
        enabled: true,
        interval: 15000,
        text: "Wox message"
      };

      fs.writeFileSync(
        woxConfigFile,
        JSON.stringify(
          defaultConfig,
          null,
          2
        ),
        "utf8"
      );

      return defaultConfig;
    }

    return JSON.parse(
      fs.readFileSync(
        woxConfigFile,
        "utf8"
      )
    );

  } catch (e) {

    return {
      enabled: true,
      interval: 15000,
      text: "Wox message"
    };
  }
}

function saveWoxConfig(config) {

  fs.writeFileSync(
    woxConfigFile,
    JSON.stringify(
      config,
      null,
      2
    ),
    "utf8"
  );
}

// ========================================
// HTTP Server
// ========================================

const server =
  http.createServer(
    async (req, res) => {

      try {

        // --------------------------------
        // Health
        // --------------------------------

        if (
          req.method === "GET" &&
          req.url === "/health"
        ) {

          return sendJSON(
            res,
            200,
            {
              ok: true,
              dashboard: true,
              bot:
                !!botProcess &&
                !botProcess.killed
            }
          );
        }

        // --------------------------------
        // Authentication
        // --------------------------------

        if (
          !authorized(req)
        ) {

          return sendJSON(
            res,
            401,
            {
              ok: false,
              error:
                "Unauthorized"
            }
          );
        }

        // --------------------------------
        // Status
        // --------------------------------

        if (
          req.method === "GET" &&
          req.url === "/api/status"
        ) {

          return sendJSON(
            res,
            200,
            {
              ok: true,

              bot:
                !!botProcess &&
                !botProcess.killed,

              startedAt:
                botStartedAt,

              uptime:
                botStartedAt
                  ? Date.now() -
                    new Date(
                      botStartedAt
                    ).getTime()
                  : 0
            }
          );
        }

        // --------------------------------
        // Start
        // --------------------------------

        if (
          req.method === "POST" &&
          req.url === "/api/bot/start"
        ) {

          const started =
            startBot();

          return sendJSON(
            res,
            200,
            {
              ok: true,
              started
            }
          );
        }

        // --------------------------------
        // Stop
        // --------------------------------

        if (
          req.method === "POST" &&
          req.url === "/api/bot/stop"
        ) {

          const stopped =
            stopBot();

          return sendJSON(
            res,
            200,
            {
              ok: true,
              stopped
            }
          );
        }

        // --------------------------------
        // Logs
        // --------------------------------

        if (
          req.method === "GET" &&
          req.url === "/api/logs"
        ) {

          return sendJSON(
            res,
            200,
            {
              ok: true,
              logs
            }
          );
        }

        // --------------------------------
        // Wox Config GET
        // --------------------------------

        if (
          req.method === "GET" &&
          req.url === "/api/wox"
        ) {

          return sendJSON(
            res,
            200,
            {
              ok: true,
              config:
                getWoxConfig()
            }
          );
        }

        // --------------------------------
        // Wox Config UPDATE
        // --------------------------------

        if (
          req.method === "POST" &&
          req.url === "/api/wox"
        ) {

          const body =
            await readBody(req);

          const oldConfig =
            getWoxConfig();

          const newConfig = {
            enabled:
              typeof body.enabled ===
              "boolean"
                ? body.enabled
                : oldConfig.enabled,

            interval:
              Number(body.interval) >=
              1000
                ? Number(body.interval)
                : oldConfig.interval,

            text:
              typeof body.text ===
              "string"
                ? body.text
                : oldConfig.text
          };

          saveWoxConfig(
            newConfig
          );

          addLog(
            "⚙️ Wox configuration updated."
          );

          return sendJSON(
            res,
            200,
            {
              ok: true,
              config:
                newConfig
            }
          );
        }

        // --------------------------------
        // AppState Update
        // --------------------------------

        if (
          req.method === "POST" &&
          req.url === "/api/appstate"
        ) {

          const body =
            await readBody(req);

          if (
            !Array.isArray(
              body.appState
            )
          ) {

            return sendJSON(
              res,
              400,
              {
                ok: false,
                error:
                  "appState must be an array"
              }
            );
          }

          fs.writeFileSync(
            path.join(
              __dirname,
              "appstate.json"
            ),
            JSON.stringify(
              body.appState,
              null,
              2
            ),
            "utf8"
          );

          addLog(
            "🍪 AppState updated."
          );

          return sendJSON(
            res,
            200,
            {
              ok: true,
              message:
                "AppState saved. Restart the bot to apply it."
            }
          );
        }

        // --------------------------------
        // 404
        // --------------------------------

        return sendJSON(
          res,
          404,
          {
            ok: false,
            error:
              "Not found"
          }
        );

      } catch (e) {

        addLog(
          `❌ API error: ${e.message}`
        );

        return sendJSON(
          res,
          500,
          {
            ok: false,
            error:
              e.message
          }
        );
      }
    }
  );

// ========================================
// Start Dashboard
// ========================================

server.listen(
  PORT,
  "0.0.0.0",
  () => {

    addLog(
      `🌐 Dashboard API running on port ${PORT}`
    );

    // تشغيل البوت تلقائيًا
    startBot();
  }
);

// ========================================
// Shutdown
// ========================================

function shutdown() {

  addLog(
    "🛑 Dashboard shutting down..."
  );

  if (
    botProcess &&
    !botProcess.killed
  ) {

    botProcess.kill(
      "SIGTERM"
    );
  }

  server.close(
    () => {
      process.exit(0);
    }
  );
}

process.on(
  "SIGTERM",
  shutdown
);

process.on(
  "SIGINT",
  shutdown
);
