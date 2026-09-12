const express = require("express");
const { login } = require("ws3-fca");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ===============================
// 1. الإعدادات وقائمة الأدمن
// ===============================
const ADMINS = new Set(["61593590627474", "61593997454796"]);
function isAdmin(senderID) {
  return ADMINS.has(String(senderID).trim());
}

const appStateFile = path.join(__dirname, "appstate.json");
const woxConfigFile = path.join(__dirname, "wox_config.json");

const DEFAULT_WOX_TEXT = `*𝐀𝐥𝐨𝐱'𝐬 𝐫𝐞𝐩𝐥𝐲 🫸🔵🫷*\n𖣫 ᗩᒪᒪ ᗪᗴᗰOᑎՏ𖣫\n➥𝕲𝙊𝙀𝙏𝙎  𝕺𝙁  𝕱𝘼𝘾𝘼𝘽𝙊𝙊𝙆\n𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋\n𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋\n𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋\n𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋\n𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋\n𖥡┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅𖥡\n𝑡𝔥𝔢 𝔮𝔩𝔬𝔵 𝔮𝔩𝑤𝔮𝑦𝑠 𝑠𝑡𝔢𝑝𝑠 𝑜𝑛 𝑠𝑝𝑖𝑑𝑒𝑟𝑠 𝔮𝑛𝑑 𝑖𝔫𝔰𝔢𝔠𝑡𝔰 𝔩𝔦𝔨𝔢 𝔪𝑜𝑐𝑟𝑜𝑤𝔮𝑡.\n\n                           ↫🪫↬\n\n   ➥『𝐖𝐄 𝐀𝐑𝐄 𝐇𝐈𝐒𝐓𝐎𝐑𝐘』╮\n\n    ⌯        .ℙ𝕒𝕥𝕣𝕚𝕔𝕜.\n\n➥ 𝐀𝐋𝐎𝐗 🔥\n\n『༴̤☠︎︎⋆̤☯』⇣؍.َِ𝗧𝗛𝗘 𝗞𝗜𝗡𝗚⏤͟͟͞͞𝗔𝗟𝗢𝗫\n\n        ➥【𝕯𝐸𝑀ϴ𝑁𝔖】\n\n𝙇𝙀𝘼𝘿𝙀𝙍 𝙊𝙁 𝘼𝙇𝙇 𝙁𝘼𝘾𝙀𝘽𝙊𝙊𝙆 𒆙⌯𖠨𖠫𖠰𖠱𖠳\n\n⏤͟͟͞͞🫸⛩️🫷𝐀𝐒𝐓𝐑𝐎`;

let logsHistory = [];
function addLog(msg) {
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] ${msg}`;
  console.log(formatted);
  logsHistory.push(formatted);
  if (logsHistory.length > 300) logsHistory.shift();
}

// ===============================
// 2. قراءة الكوكيز والإعدادات الموثوقة
// ===============================
function getValidAppState() {
  if (!fs.existsSync(appStateFile)) return null;
  try {
    const rawData = fs.readFileSync(appStateFile, "utf8").trim();
    if (!rawData) return null;
    return JSON.parse(rawData);
  } catch (e) {
    addLog(`❌ خطأ في قراءة ملف appstate.json: ${e.message}`);
    return null;
  }
}

function getWoxConfig() {
  try {
    if (!fs.existsSync(woxConfigFile)) {
      const def = { enabled: true, interval: 15000, text: DEFAULT_WOX_TEXT };
      fs.writeFileSync(woxConfigFile, JSON.stringify(def, null, 2));
      return def;
    }
    return JSON.parse(fs.readFileSync(woxConfigFile, "utf8"));
  } catch (e) {
    return { enabled: true, interval: 15000, text: DEFAULT_WOX_TEXT };
  }
}

// ===============================
// 3. المحرك ودوال الإرسال المضمونة
// ===============================
let botStatus = "OFFLINE";
let activeWoxThreads = new Map();
let currentApi = null;

async function sendMessageSmart(api, messageText, threadID, delayMs = 300) {
  if (delayMs > 0) {
    await new Promise((r) => setTimeout(r, delayMs));
  }

  return new Promise((resolve) => {
    try {
      api.sendMessage(messageText, threadID, (err, info) => {
        if (err) {
          addLog(`❌ فشل الإرسال إلى (${threadID}): ${err.errorDescription || err.message || JSON.stringify(err)}`);
        } else {
          addLog(`📤 تم الإرسال بنجاح إلى (${threadID})`);
        }
        resolve(info);
      });
    } catch (e) {
      addLog(`❌ خطأ غير متوقع عند الإرسال: ${e.message}`);
      resolve(null);
    }
  });
}

function stopWoxLoop(threadID) {
  if (activeWoxThreads.has(threadID)) {
    clearInterval(activeWoxThreads.get(threadID));
    activeWoxThreads.delete(threadID);
    addLog(`🛑 تم إيقاف الوكس التلقائي في: ${threadID}`);
    return true;
  }
  return false;
}

function startWoxLoop(api, threadID) {
  stopWoxLoop(threadID);

  const config = getWoxConfig();
  addLog(`🚀 بداية تشغيل الوكس في المحادثة: ${threadID}`);
  sendMessageSmart(api, config.text, threadID, 300);

  const timer = setInterval(() => {
    if (botStatus !== "ONLINE") {
      stopWoxLoop(threadID);
      return;
    }
    const cfg = getWoxConfig();
    sendMessageSmart(api, cfg.text, threadID, 300);
  }, config.interval);

  activeWoxThreads.set(threadID, timer);
}

function stopBotEngine() {
  activeWoxThreads.forEach((timer) => clearInterval(timer));
  activeWoxThreads.clear();
  currentApi = null;
  botStatus = "OFFLINE";
  addLog("⛔ تم إيقاف البوت بشكل كامل.");
}

function startBotEngine() {
  if (botStatus === "ONLINE") return;

  const appStateParsed = getValidAppState();
  if (!appStateParsed) {
    addLog("❌ ملف appstate.json غير موجود أو كود JSON غير صالح.");
    botStatus = "OFFLINE";
    return;
  }

  addLog(`▶️ جاري تسجيل الدخول بالكريدينشالز...`);

  login({ appState: appStateParsed }, (loginErr, api) => {
    if (loginErr) {
      addLog(`❌ فشل تسجيل الدخول: ${loginErr.error || loginErr.message || JSON.stringify(loginErr)}`);
      botStatus = "OFFLINE";
      return;
    }

    currentApi = api;
    botStatus = "ONLINE";

    try {
      api.setOptions({
        listenEvents: true,
        selfListen: false,
        autoMarkDelivery: false,
        listenTyping: false
      });
    } catch (e) {}

    addLog("✅ تم تشغيل البوت بنجاح ومستعد لاستقبال الأوامر!");

    api.listenMqtt((err, event) => {
      try {
        if (err) {
          addLog(`❌ MQTT ERROR: ${JSON.stringify(err)}`);
          return;
        }

        if (!event) return;

        addLog(`📡 [EVENT RECEIVED] Type: ${event.type} | SenderID: ${event.senderID} | Body: "${event.body || ''}"`);

        if (event.type === "message" || event.type === "message_reply") {
          const body = String(event.body || "").trim();
          const senderID = String(event.senderID || "").trim();
          const threadID = String(event.threadID || "").trim();

          if (!body) return;

          if (!isAdmin(senderID)) {
            addLog(`⚠️ تم تجاهل أمر من حساب غير مسجل كأدمن (ID الحالي: ${senderID})`);
            return;
          }

          addLog(`📩 [أمر أدمن مقبول] من ID: (${senderID}) | النص: "${body}"`);

          if (body.includes("/الوكس تشغيل") || body.includes("الوكس تشغيل")) {
            startWoxLoop(api, threadID);
            sendMessageSmart(api, "🔥🔷𝐓𝐇𝐄 𝐊𝐈𝐍𝐆 𝐀𝐋𝐎𝐗 𝐈𝐒 𝐇𝐄𝐑𝐄 🌪❌", threadID, 500);
          } else if (body.includes("/stop") || body.includes("الوكس ايقاف") || body.includes("الوكس إيقاف")) {
            if (stopWoxLoop(threadID)) {
              sendMessageSmart(api, "𝙏𝙃𝙀 𝘼𝙇𝙊𝙓 𝙈𝙊𝘿𝙀 𝙄𝙎 𝙎𝙏𝙊𝙋𝙋𝙀𝘿 ❌", threadID, 500);
            } else {
              sendMessageSmart(api, "متت اختفو 😂", threadID, 500);
            }
          }
        }
      } catch (e) {
        addLog(`❌ [Error in listenMqtt]: ${e.message}`);
      }
    });
  });
}

// ===============================
// 4. خادم الداشبورد
// ===============================
app.get("/", (req, res) => {
  const currentAppState = fs.existsSync(appStateFile) ? fs.readFileSync(appStateFile, "utf8") : "[]";
  const woxConfig = getWoxConfig();

  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>👑 Alox Dashboard</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 900px; margin: auto; background: #1e293b; padding: 25px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    h1, h2 { color: #38bdf8; margin-top: 0; }
    .status-badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 14px; }
    .status-online { background-color: #10b981; color: #fff; }
    .status-offline { background-color: #ef4444; color: #fff; }
    .btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 15px; margin-right: 8px; font-weight: bold; transition: 0.2s; }
    .btn:hover { opacity: 0.9; }
    .btn-start { background-color: #0284c7; color: white; }
    .btn-stop { background-color: #dc2626; color: white; }
    .btn-save { background-color: #16a34a; color: white; width: 100%; margin-top: 10px; }
    textarea, input[type="number"] { width: 100%; background: #0f172a; color: #38bdf8; border: 1px solid #334155; border-radius: 6px; padding: 12px; box-sizing: border-box; margin-top: 6px; font-family: monospace; }
    .card { background: #1e293b; padding: 18px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #334155; }
    .logs-box { background: #020617; color: #34d399; font-family: monospace; padding: 12px; height: 260px; overflow-y: scroll; border-radius: 6px; white-space: pre-wrap; font-size: 13px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <h1>👑 Alox Dashboard & Control Unit</h1>
    
    <div class="card">
      <h2>حالة البوت العامة</h2>
      <p>الحالة الحالية: <span class="status-badge ${botStatus === 'ONLINE' ? 'status-online' : 'status-offline'}">${botStatus === 'ONLINE' ? '🟢 ONLINE' : '🔴 OFFLINE'}</span></p>
      <button class="btn btn-start" onclick="controlBot('start')">▶️ تشغيل البوت (Start)</button>
      <button class="btn btn-stop" onclick="controlBot('stop')">⛔ إيقاف البوت (Stop)</button>
    </div>

    <div class="card">
      <h2>🍪 إدارة الكوكيز (appstate.json)</h2>
      <form action="/save-appstate" method="POST">
        <label>انسخ كود JSON الخاص بالكوكيز هنا:</label>
        <textarea name="appState" rows="8">${currentAppState}</textarea>
        <button type="submit" class="btn btn-save">💾 حفظ الكوكيز وتحديث الجلسة</button>
      </form>
    </div>

    <div class="card">
      <h2>🔵 إعدادات الوكس (Wox Settings)</h2>
      <form action="/save-wox" method="POST">
        <label>الفارق الزمني بين الرسائل (بالميلي ثانية):</label>
        <input type="number" name="interval" value="${woxConfig.interval}"><br><br>
        <label>نص Wox:</label>
        <textarea name="text" rows="6">${woxConfig.text}</textarea>
        <button type="submit" class="btn btn-save">💾 حفظ إعدادات Wox</button>
      </form>
    </div>

    <div class="card">
      <h2>📜 السجلات والأنشطة (Live Logs)</h2>
      <button class="btn btn-start" onclick="location.reload()" style="margin-bottom: 12px;">🔄 تحديث السجلات</button>
      <div class="logs-box" id="logsBox">${logsHistory.join('\n')}</div>
    </div>
  </div>

  <script>
    function controlBot(action) {
      fetch('/bot-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action })
      }).then(() => location.reload());
    }
    const box = document.getElementById('logsBox');
    box.scrollTop = box.scrollHeight;
  </script>
</body>
</html>
  `;
  res.send(html);
});

app.post("/bot-control", (req, res) => {
  const { action } = req.body;
  if (action === "start") startBotEngine();
  else if (action === "stop") stopBotEngine();
  res.json({ success: true });
});

app.post("/save-appstate", (req, res) => {
  try {
    const raw = req.body.appState;
    JSON.parse(raw);
    fs.writeFileSync(appStateFile, raw, "utf8");
    addLog("💾 تم تحديث وحفظ الكوكيز بنجاح.");
    if (botStatus === "ONLINE") {
      stopBotEngine();
    }
    startBotEngine();
  } catch (e) {
    addLog("❌ فشل حفظ الكوكيز: تأكد من إدخال JSON صحيح.");
  }
  res.redirect("/");
});

app.post("/save-wox", (req, res) => {
  try {
    const config = {
      enabled: true,
      interval: parseInt(req.body.interval) || 15000,
      text: req.body.text || DEFAULT_WOX_TEXT
    };
    fs.writeFileSync(woxConfigFile, JSON.stringify(config, null, 2), "utf8");
    addLog("💾 تم حفظ وتحديث إعدادات Wox.");
  } catch (e) {
    addLog("❌ فشل حفظ إعدادات Wox.");
  }
  res.redirect("/");
});

app.listen(PORT, () => {
  addLog(`🌐 يعمل خادم الداشبورد على المنفذ: ${PORT}`);
  startBotEngine();
});

