const express = require("express");
const { login } = require("ws3-fca");
const fs = require("fs");
const path = require("path");

// ===============================
// 0. حماية كاملة من الكراش وسقوط السيرفر
// ===============================
process.on("uncaughtException", (err) => {
  const errStr = String(err.stack || err.message || err);
  if (errStr.includes("getSeqId") || errStr.includes("Not logged in")) {
    return;
  }
  console.error("⚠️ [Crash Prevented] خطأ غير معالج:", errStr);
});

process.on("unhandledRejection", (reason) => {
  console.error("⚠️ [Crash Prevented] وعد مرفوض:", reason);
});

// ===============================
// 1. الإعدادات والمسارات العامة
// ===============================
const PORT = process.env.PORT || 8080;
const adminID = "61593590627474";

const appStateFile = path.join(__dirname, "appstate.json");
const woxConfigFile = path.join(__dirname, "wox_config.json");
const woxStateFile = path.join(__dirname, "wox_state.json");

const DEFAULT_WOX_TEXT = `𝐀𝐋𝐎҈𝐗 𝒯𝐇𝐄 𝐊𝐈⃟𝐍𝐆 𝐈𝐒 𝐏𝐋𝐀𝐘𝐈𝐍𝐆 𝐖𝐈⏤͟͟͞͞𝐓𝐇 𝐔𝐑 𝐌𝐎𝑴𒆜\n𝚂𝚌𝚊𝚛𝚢 𝚊𝚗𝚐𝚎𝚛 𝚖𝚘𝚍𝚎🔴𝑻𝒉𝒆 𝒏𝒊𝒈𝒉𝒕𝒎𝒂𝒓𝒆 𝒅𝒐𝒆𝒔𝒏'𝒕 𝒋𝒐𝒄𝒌⇲\n      \n                 〘𝗛𝗔𝗞𝗔𝗜 𝗢𝗙 𝗟𝗘𝗔?? Organisations𫞒𫞓💠〙\n\n💦◈𝑪᷿⃔⃜⊹༒⥤┆𝘿꙲┆👑٭☓▶┋🐍┋⊹༅💦◈𝑪᷿⃔⃜⊹༒⥤┆𝘿꙲┆👑٭☓▶┋🐍┋⊹༅\n\n⊰⊱༈⏤͟͟͞͞■𝘼𝐋⃢𝐎⃟乂 𒈔𖣘\n\n∫✺↳✺ ✓∫ ඞ↳↳ ⟬ ᒍ𐌵ᛇᛘ ᚱ𐌵ᚻ ᚣᏔᚣᚶ ᚶᛟ𐌵 ᛈᚣᚻ'ᛘ ᚱᛊᛇᚽᛇᛇᛘ ⟭ ☄️\n╼╼╼╼╼『𝘑𝘈𝘜𝘎𝘌𝘙𝘈𝘜𝘕𝘛 𝘐𝘚 𝑭ᖭᖫ𝑲𝑰𝑵𝑮 𝘎𝘙𝘌𝘈𝘛』╾╾╾╾╾\n\n▶ͲᎻ٭Ꭼ ՏͲᎡ⃢ϴ⃝ΝᏀᎬՏͲ ՏႮ⃢Ꭱ⃟𝑉Ꮖ⏤͟͟͞͞■𝑉ᎬՏ ┆🌬\n➫🩸𝐓𝐇𝐄 𝐄𝐍𝐃 →↗︎↘︎𖣘`;

let logsHistory = [];
function addLog(msg) {
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] ${msg}`;
  console.log(formatted);
  logsHistory.push(formatted);
  if (logsHistory.length > 250) logsHistory.shift();
}

// ===============================
// 2. إدارة ملفات التهيئة والكوكيز
// ===============================
function getValidAppState() {
  if (!fs.existsSync(appStateFile)) return null;
  try {
    const rawData = fs.readFileSync(appStateFile, "utf8");
    const parsed = JSON.parse(rawData);
    let cookies = Array.isArray(parsed) ? parsed : (parsed && parsed.appState ? parsed.appState : []);
    return cookies.length ? cookies : null;
  } catch (e) {
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

function getSavedWoxThreads() {
  try {
    if (fs.existsSync(woxStateFile)) {
      return JSON.parse(fs.readFileSync(woxStateFile, "utf8"));
    }
  } catch (e) {}
  return [];
}

function saveSavedWoxThreads(threads) {
  try {
    fs.writeFileSync(woxStateFile, JSON.stringify(threads, null, 2));
  } catch (e) {}
}

// ===============================
// 3. المحرك المتقدم ومحاكاة الكتابة
// ===============================
let botStatus = "OFFLINE";
let activeWoxThreads = new Map();
let currentApi = null;

// دالة مساعدة لإرسال الرسالة مع تفعيل مؤشر الكتابة (Typing Indicator) لبضع ثوانٍ
function sendMessageWithTyping(api, messageText, threadID, durationMs = 3000) {
  return new Promise((resolve) => {
    // تفعيل وضع "جاري الكتابة..."
    api.sendTypingIndicator(threadID, (err) => {
      setTimeout(() => {
        // إيقاف مؤشر الكتابة وإرسال الرسالة
        api.sendTypingIndicator(threadID, () => {});
        api.sendMessage(messageText, threadID, (sendErr, messageInfo) => {
          if (sendErr) {
            addLog(`❌ خطأ إرسال لـ ${threadID}: ${sendErr.message || sendErr}`);
          }
          resolve(messageInfo);
        });
      }, durationMs);
    });
  });
}

function stopBotEngine() {
  activeWoxThreads.forEach((intervalId) => clearInterval(intervalId));
  activeWoxThreads.clear();
  currentApi = null;
  botStatus = "OFFLINE";
  addLog("⛔ تم إيقاف عملية البوت.");
}

function startBotEngine() {
  if (botStatus === "ONLINE") return;

  const cookies = getValidAppState();
  if (!cookies) {
    addLog("❌ ملف appstate.json غير موجود أو يحتوي تركيبة خاطئة.");
    botStatus = "OFFLINE";
    return;
  }

  addLog(`▶️ جاري تشغيل البوت...`);

  login({ appState: cookies }, (loginErr, api) => {
    if (loginErr) {
      addLog(`❌ فشل تسجيل الدخول: ${loginErr.message || JSON.stringify(loginErr)}`);
      botStatus = "OFFLINE";
      return;
    }

    currentApi = api;
    botStatus = "ONLINE";

    api.setOptions({
      listenEvents: true,
      selfListen: true,
      autoMarkDelivery: false,
      listenTyping: false
    });

    addLog("✅ تم تشغيل البوت بنجاح ومستعد لاستقبال الأوامر!");

    let savedThreads = getSavedWoxThreads();

    function startWoxLoop(threadID) {
      if (activeWoxThreads.has(threadID)) return;
      const intervalId = setInterval(() => {
        const config = getWoxConfig();
        if (!config.enabled || botStatus !== "ONLINE") return;
        sendMessageWithTyping(api, config.text, threadID, 2500);
      }, getWoxConfig().interval);

      activeWoxThreads.set(threadID, intervalId);
      if (!savedThreads.includes(threadID)) {
        savedThreads.push(threadID);
        saveSavedWoxThreads(savedThreads);
      }
    }

    function stopWoxLoop(threadID) {
      if (activeWoxThreads.has(threadID)) {
        clearInterval(activeWoxThreads.get(threadID));
        activeWoxThreads.delete(threadID);
      }
      const idx = savedThreads.indexOf(threadID);
      if (idx !== -1) {
        savedThreads.splice(idx, 1);
        saveSavedWoxThreads(savedThreads);
      }
    }

    // استعادة المحادثات النشطة السابقة
    savedThreads.forEach((tId) => startWoxLoop(tId));

    // الاستماع للأحداث الرسائل والأوامر
    api.listenMqtt(async (err, event) => {
      try {
        if (err) return;
        if (!event || !event.threadID) return;

        // ⚡ خروج عضو من المجموعة
        if (event.type === "event" && event.logMessageType === "log:unsubscribe") {
          await sendMessageWithTyping(api, "غادر المهرج المجموعة", event.threadID, 2000);
          return;
        }

        // ⚡ معالجة الرسائل والأوامر النصية
        if (event.type === "message" || event.type === "message_reply") {
          if (!event.body || typeof event.body !== "string") return;

          const body = event.body.trim();
          const senderID = String(event.senderID || "");
          const threadID = String(event.threadID);
          const isAdmin = senderID === adminID;

          addLog(`📩 [رسالة] من ${senderID} في ${threadID}: ${body}`);

          // أمر: الوكس قل لهم الصراحة
          if (body === "! الوكس قل لهم الصراحة" && isAdmin) {
            stopWoxLoop(threadID);
            await sendMessageWithTyping(api, "🔥🔷𝐓𝐇𝐄 𝐊𝐈𝐍𝐆 𝐀𝐋𝐎𝐗 𝐈𝐒 𝐇𝐄𝐑𝐄 🌪❌", threadID, 3000);
            startWoxLoop(threadID);
          }

          // أمر: الوكس ايقاف
          else if ((body === "! الوكس ايقاف" || body === "!الوكس ايقاف" || body === "/الوكس ايقاف") && isAdmin) {
            if (activeWoxThreads.has(threadID)) {
              stopWoxLoop(threadID);
              await sendMessageWithTyping(api, "𝙏𝙃𝙀 𝘼𝙇𝙊𝙓 𝙈𝙊𝘿𝙀 𝙄𝙎 𝙎𝙏𝙊𝙋𝙋𝙀𝘿 ❌", threadID, 2500);
            } else {
              await sendMessageWithTyping(api, "متت اختفو 😂", threadID, 2000);
            }
          }

          // أمر: !ألوكس
          else if (body === "!ألوكس" || body === "! ألوكس") {
            if (isAdmin) {
              const replyText = `👑𝐀𝐥𝐨𝐱'𝐬 𝐵𝑂َ𝑇 𝐢𝐬 𝐨𝐧👑\nꪱׁׁׁׅׅׅܻ⨍ ɑׁׅ݊ꪀᨮׁׅ֮ᨵׁׅׅ݊ꪀꫀׁׅܻ݊ ժׁׅ݊ɑׁׅꭈׁׅꫀׁׅܻׅ݊꯱ tׁׅᨵׁׅׅ hׁׅ֮ɑׁׅᥣׁׅ֪ᥣׁׅ֪ꫀׁׅܻ݊݊ꪀᧁׁꫀׁׅܻ݊ hׁׅ֮ꪱׁׁׁׅׅׅꩇׁׅ֪݊ , hׁׁׅׅ֮֮ꫀׁׅܻ݊'꯱ ᧁׁᨵׁׅׅ݊ꪀ݊ꪀɑׁׅ υׁׅׅ꯱ꫀׁׅܻ݊ :\nٱﺂݪو໑ڪَِكٍْسہًٍۦـس قݪ ݪهَـْہ‌‍َِٰمَِـۥـِمٛ ٱﺂݪصࢪٱﺂحٍَـحهَـْہ‌‍َِٰ!\n🔵𝗬𝗼𝘂 𝘄𝗮𝗻𝘁 𝘁𝗼 𝘀𝘁𝗮𝗿𝘁?`;
              await sendMessageWithTyping(api, replyText, threadID, 3000);
            }
          }

          // أمر: ! الوكس (تحقق)
          else if (body === "! الوكس" || body === "!الوكس") {
            if (isAdmin) {
              await sendMessageWithTyping(api, "انا هنا !", threadID, 2000);
            } else {
              await sendMessageWithTyping(api, "ڪ│😂⇦𖤛🧞‍♂️┋ـسـ╾༺☄️༻╿ـمـ︻︽『🐉🈴』𒆙𒋨🔥🦅𒁂فـڪ", threadID, 2500);
            }
          }
        }
      } catch (e) {
        addLog(`❌ [Catch Error]: ${e.message}`);
      }
    });
  });
}

// ===============================
// 4. خادم الداشبورد وواجهة التحكم
// ===============================
const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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
    textarea, input[type="text"], input[type="number"] { width: 100%; background: #0f172a; color: #38bdf8; border: 1px solid #334155; border-radius: 6px; padding: 12px; box-sizing: border-box; margin-top: 6px; font-family: monospace; }
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
      <h2>🍪 إدارة الجلسة (appstate.json)</h2>
      <form action="/save-appstate" method="POST">
        <label>انسخ كود JSON الخاص بالكوكيز هنا:</label>
        <textarea name="appState" rows="8">${currentAppState}</textarea>
        <button type="submit" class="btn btn-save">💾 حفظ الكوكيز وتحديث الجلسة</button>
      </form>
    </div>

    <div class="card">
      <h2>🔵 إعدادات الوكس (Wox Settings)</h2>
      <form action="/save-wox" method="POST">
        <label><input type="checkbox" name="enabled" ${woxConfig.enabled ? 'checked' : ''}> تفعيل إرسال Wox التلقائي</label><br><br>
        <label>الفارق الزمني بين الرسائل (بالميلي ثانية - 15000 تعني 15 ثانية):</label>
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

// المسارات التشغيلية للواجهة
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
    addLog("💾 تم تحديث وحفظ الكوكيز بنجاح من الداشبورد.");
  } catch (e) {
    addLog("❌ فشل حفظ الكوكيز: تأكد من إدخال JSON صحيح.");
  }
  res.redirect("/");
});

app.post("/save-wox", (req, res) => {
  try {
    const config = {
      enabled: req.body.enabled === "on",
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

// إطلاق خادم الويب والبوت
app.listen(PORT, () => {
  addLog(`🌐 يعمل خادم الداشبورد على المنفذ (Port): ${PORT}`);
  startBotEngine();
});

