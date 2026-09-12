const express = require("express");
const login = require("ws3-fca");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===============================
// 1. الإعدادات والمتغيرات الأساسية
// ===============================
const ADMIN_IDS = ["61593590627474"]; // قائمة الآدمينات المصرح لهم
const APPSTATE_PATH = path.join(__dirname, "appstate.json");

let botStatus = "OFFLINE";
let activeWoxThreads = new Map();
let currentApi = null;

// نص الوكس المعتمد
let woxSettings = {
  enabled: false,
  interval: 15000,
  text: `*𝐀𝐥𝐨𝐱'𝐬 𝐫𝐞𝐩𝐥𝐲 🫸🔵🫷*
𖣫 ᗩᒪᒪ ᗪᗴᗰOᑎՏ𖣫
➥𝕲𝙊𝙀𝙏𝙎  𝕺𝙁  𝕱𝘼𝘾𝘼𝘽𝙊𝙊𝙆
𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋
𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋
𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋
𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋
𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋
𖥡┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅𖥡
𝑡𝔥𝔢 𝔮𝔩𝔬𝔵 𝔮𝔩𝑤𝔮𝑦𝑠 𝑠𝑡𝔢𝑝𝑠 𝑜𝑛 𝑠𝑝𝑖𝑑𝑒𝑟𝑠 𝔮𝑛𝑑 𝑖𝔫𝔰𝔢𝔠𝑡𝑠 𝔩𝔦𝔨𝔢 𝔪𝔬𝑐𝑟𝔬𝑤𝔮𝑡.

                           ↫🪫↬

   ➥『𝐖𝐄 𝐀𝐑𝐄 𝐇𝐈𝐒𝐓𝐎𝐑𝐘』╮

    ⌯        .ℙ𝕒𝕥𝕣𝕚𝕔𝕜.

➥ 𝐀𝐋𝐎𝐗 🔥

『༴̤☠︎︎⋆̤☯』⇣؍.َِ𝗧𝗛𝗘 𝗞𝗜𝗡𝗚⏤͟͟͞͞𝗔𝗟𝗢𝗫

        ➥【𝕯𝐸𝑀ϴ𝑁𝔖】

𝙇𝙀𝘼𝘿𝙀𝙍 𝙊𝙁 𝘼𝙇𝙇 𝙁𝘼𝘾𝙀𝘽𝙊𝙊𝙆 𒆙⌯𖠨𖠫𖠰𖠱𖠳

⏤͟͟͞͞🫸⛩️🫷𝐀𝐒𝐓𝐑𝐎`
};

// ===============================
// 2. نظام السجلات (Logs)
// ===============================
let logs = [];
function addLog(message) {
  const time = new Date().toISOString();
  const logLine = `[${time}] ${message}`;
  console.log(logLine);
  logs.push(logLine);
  if (logs.length > 200) logs.shift(); // الاحتفاظ بأحدث 200 سطر
}

// ===============================
// 3. دالة الإرسال الذكية (مضمونة وسريعة)
// ===============================
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

// ===============================
// 4. إدارة تشغيل وإيقاف الوكس التلقائي
// ===============================
function stopWoxLoop(threadID) {
  if (activeWoxThreads.has(threadID)) {
    clearInterval(activeWoxThreads.get(threadID));
    activeWoxThreads.delete(threadID);
    addLog(`🛑 تم إيقاف وكس التلقائي في المحادثة: ${threadID}`);
    return true;
  }
  return false;
}

function startWoxLoop(api, threadID) {
  stopWoxLoop(threadID); // إلغاء أي مؤقت سابق لضمان عدم التكرار

  addLog(`🚀 بداية تشغيل وكس التلقائي في المحادثة: ${threadID}`);
  
  // إرسال أول رسالة فوراً عند التشغيل
  sendMessageSmart(api, woxSettings.text, threadID);

  const timer = setInterval(() => {
    if (botStatus !== "ONLINE") {
      stopWoxLoop(threadID);
      return;
    }
    sendMessageSmart(api, woxSettings.text, threadID);
  }, woxSettings.interval);

  activeWoxThreads.set(threadID, timer);
}

// ===============================
// 5. محرك تشغيل البوت المباشر
// ===============================
function startBot() {
  if (!fs.existsSync(APPSTATE_PATH)) {
    addLog("⚠️ لم يتم العثور على ملف appstate.json! الرجاء إضافة الكوكيز أولاً.");
    botStatus = "OFFLINE";
    return;
  }

  try {
    const appState = JSON.parse(fs.readFileSync(APPSTATE_PATH, "utf8"));
    addLog("🔑 جاري تسجيل الدخول باستخدام الكوكيز...");

    login({ appState }, (err, api) => {
      if (err) {
        addLog(`❌ فشل تسجيل الدخول: ${err.errorDescription || err.message || JSON.stringify(err)}`);
        botStatus = "OFFLINE";
        return;
      }

      currentApi = api;
      botStatus = "ONLINE";
      addLog("✅ تم تشغيل البوت بنجاح ومستعد لاستقبال الأوامر!");

      // إعدادات الممر والاستماع
      api.setOptions({
        listenEvents: true,
        selfListen: false,
        logLevel: "silent"
      });

      api.listenMqtt((err, event) => {
        if (err) {
          addLog(`❌ خطأ في الاستماع الأحداث: ${err.message || err}`);
          return;
        }

        // تسجيل الأحداث الواردة
        if (event.type === "message" || event.type === "message_reply") {
          const senderID = event.senderID;
          const threadID = event.threadID;
          const body = (event.body || "").trim();

          addLog(`📡 [EVENT RECEIVED] Type: ${event.type} | SenderID: ${senderID} | Body: "${body}"`);

          // التحقق من صلاحيات الأدمن
          if (!ADMIN_IDS.includes(senderID)) {
            addLog(`⚠️ تم تجاهل أمر من حساب غير مسجل كأدمن (ID الحالي: ${senderID})`);
            return;
          }

          addLog(`📩 [أمر أدمن مقبول] من ID: (${senderID}) | النص: "${body}"`);

          // معالجة الأوامر
          if (body === "/الوكس تشغيل" || body === "الوكس تشغيل") {
            startWoxLoop(api, threadID);
            sendMessageSmart(api, "✅ تم تفعيل الوكس التلقائي بنجاح!", threadID);
          } else if (body === "/الوكس ايقاف" || body === "/الوكس إيقاف" || body === "الوكس ايقاف") {
            if (stopWoxLoop(threadID)) {
              sendMessageSmart(api, "🛑 تم إيقاف الوكس التلقائي في هذه المحادثة.", threadID);
            } else {
              sendMessageSmart(api, "⚠️ الوكس غير مفعل حالياً في هذه المحادثة.", threadID);
            }
          }
        }
      });
    });
  } catch (e) {
    addLog(`❌ خطأ في قراءة ملف الكوكيز: ${e.message}`);
    botStatus = "OFFLINE";
  }
}

function stopBot() {
  // إيقاف جميع حلقات الوكس
  for (const [threadID, timer] of activeWoxThreads.entries()) {
    clearInterval(timer);
  }
  activeWoxThreads.clear();

  if (currentApi) {
    try {
      currentApi.logout();
    } catch (e) {}
    currentApi = null;
  }
  botStatus = "OFFLINE";
  addLog("⛔ تم إيقاف البوت وجميع المهام التلقائية.");
}

// ===============================
// 6. لوحة التحكم والداشبورد (Express Dashboard)
// ===============================
app.get("/", (req, res) => {
  let appStateText = "";
  if (fs.existsSync(APPSTATE_PATH)) {
    appStateText = fs.readFileSync(APPSTATE_PATH, "utf8");
  }

  const html = `
  <!DOCTYPE html>
  <html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>👑 Alox Dashboard & Control Unit</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
      .container { max-width: 900px; margin: 0 auto; }
      .card { background: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #334155; }
      h1, h2 { margin-top: 0; color: #38bdf8; }
      .status-online { color: #22c55e; font-weight: bold; }
      .status-offline { color: #ef4444; font-weight: bold; }
      .btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; margin-left: 10px; text-decoration: none; display: inline-block; }
      .btn-start { background-color: #22c55e; color: white; }
      .btn-stop { background-color: #ef4444; color: white; }
      .btn-save { background-color: #3b82f6; color: white; margin-top: 10px; }
      textarea, input[type="number"] { width: 100%; background: #0f172a; border: 1px solid #334155; color: #f8fafc; padding: 10px; border-radius: 6px; box-sizing: border-box; }
      textarea { height: 150px; font-family: monospace; }
      .logs { background: #000; color: #00ff66; padding: 15px; border-radius: 8px; font-family: monospace; height: 300px; overflow-y: scroll; white-space: pre-wrap; font-size: 13px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>👑 Alox Dashboard & Control Unit</h1>
      
      <!-- حالة البوت -->
      <div class="card">
        <h2>حالة البوت العامة</h2>
        <p>الحالة الحالية: <span class="${botStatus === "ONLINE" ? "status-online" : "status-offline"}">${botStatus === "ONLINE" ? "🟢 ONLINE" : "🔴 OFFLINE"}</span></p>
        <form action="/api/control" method="POST" style="display:inline;">
          <input type="hidden" name="action" value="start">
          <button class="btn btn-start" type="submit">▶️ تشغيل البوت (Start)</button>
        </form>
        <form action="/api/control" method="POST" style="display:inline;">
          <input type="hidden" name="action" value="stop">
          <button class="btn btn-stop" type="submit">⛔ إيقاف البوت (Stop)</button>
        </form>
      </div>

      <!-- إدارة الكوكيز -->
      <div class="card">
        <h2>🍪 إدارة الكوكيز (appstate.json)</h2>
        <form action="/api/save-cookies" method="POST">
          <label>انسخ كود JSON الخاص بالكوكيز هنا:</label><br><br>
          <textarea name="appstate" placeholder="[...]">${appStateText}</textarea><br>
          <button class="btn btn-save" type="submit">💾 حفظ الكوكيز وتحديث الجلسة</button>
        </form>
      </div>

      <!-- إعدادات الوكس -->
      <div class="card">
        <h2>🔵 إعدادات الوكس (Wox Settings)</h2>
        <form action="/api/save-wox" method="POST">
          <label>الفارق الزمني بين الرسائل (بالميلي ثانية):</label><br>
          <input type="number" name="interval" value="${woxSettings.interval}" required><br><br>
          <label>نص Wox:</label><br>
          <textarea name="text">${woxSettings.text}</textarea><br>
          <button class="btn btn-save" type="submit">💾 حفظ إعدادات Wox</button>
        </form>
      </div>

      <!-- السجلات الحية -->
      <div class="card">
        <h2>📜 السجلات والأنشطة (Live Logs)</h2>
        <button class="btn btn-save" onclick="location.reload()" style="margin-bottom: 10px;">🔄 تحديث السجلات</button>
        <div class="logs">${logs.join("\n")}</div>
      </div>
    </div>
  </body>
  </html>
  `;
  res.send(html);
});

// API التحكم بالتشغيل والإيقاف
app.post("/api/control", (req, res) => {
  const { action } = req.body;
  if (action === "start") {
    if (botStatus !== "ONLINE") startBot();
  } else if (action === "stop") {
    stopBot();
  }
  res.redirect("/");
});

// API حفظ الكوكيز
app.post("/api/save-cookies", (req, res) => {
  const { appstate } = req.body;
  try {
    const parsed = JSON.parse(appstate);
    fs.writeFileSync(APPSTATE_PATH, JSON.stringify(parsed, null, 4), "utf8");
    addLog("✅ تم حفظ الكوكيز الجديدة بنجاح في ملف appstate.json.");
    if (botStatus === "ONLINE") {
      stopBot();
      startBot();
    }
  } catch (e) {
    addLog(`❌ خطأ أثناء حفظ الكوكيز: ${e.message}`);
  }
  res.redirect("/");
});

// API حفظ إعدادات الوكس
app.post("/api/save-wox", (req, res) => {
  const { interval, text } = req.body;
  if (interval) woxSettings.interval = parseInt(interval, 10);
  if (text) woxSettings.text = text;
  addLog("✅ تم تحديث إعدادات الوكس بنجاح.");
  res.redirect("/");
});

// ===============================
// 7. تشغيل السيرفر تلقائياً
// ===============================
app.listen(PORT, () => {
  addLog(`🌐 يعمل خادم الداشبورد على المنفذ: ${PORT}`);
  startBot(); // تشغيل تلقائي عند بدء التشغيل
});

