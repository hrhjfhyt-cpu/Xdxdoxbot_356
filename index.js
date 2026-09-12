const login = require("fca-unofficial");
const fs = require("fs");
const path = require("path");

// ===============================
// 0. حماية العملية من الكراش (Crash Guard)
// ===============================
process.on("uncaughtException", (err) => {
  console.error("⚠️ [Crash Prevented] تم إلتقاط خطأ غير معالج:", err.message || err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("⚠️ [Crash Prevented] تم إلتقاط وعد مرفوض:", reason);
});

// ===============================
// 1. تحميل وتجهيز الكوكيز (AppState)
// ===============================
function getValidAppState() {
  try {
    const appStatePath = path.join(__dirname, "appstate.json");
    if (!fs.existsSync(appStatePath)) {
      console.error("❌ ملف appstate.json غير موجود في المجلد الحالي.");
      process.exit(1);
    }

    const rawData = fs.readFileSync(appStatePath, "utf8");
    const parsedData = JSON.parse(rawData);

    let cookies = [];
    if (Array.isArray(parsedData)) {
      cookies = parsedData;
    } else if (parsedData && Array.isArray(parsedData.appState)) {
      cookies = parsedData.appState;
    }

    if (!cookies || cookies.length === 0) {
      throw new Error("مصفوفة الكوكيز فارغة أو غير صالحة.");
    }

    console.log(`🍪 تم تحميل ${cookies.length} كوكيز بنجاح.`);
    return cookies;
  } catch (err) {
    console.error("❌ خطأ أثناء قراءة appstate.json:", err.message);
    process.exit(1);
  }
}

// ===============================
// 2. إعدادات الوكس والتكوين
// ===============================
const adminID = "61593590627474";
const woxConfigFile = path.join(__dirname, "wox_config.json");
const woxStateFile = path.join(__dirname, "wox_state.json");

const DEFAULT_WOX_TEXT = `*𝐀𝐥𝐨x'𝐬 𝐫𝐞𝐩𝐥𝐲 🫸🔵🫷*\n𖣫 ᗩᒪᒪ ᗪᗴᗰOᑎՏ𖣫\n➥𝕲𝙊𝙀𝙏𝙎  𝕺𝙁  𝕱𝘼𝘾𝘼𝘽𝙊𝙊𝙆\n𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋\n➥ 𝐀𝐋𝐎𝐗 🔥`;

let activeWoxThreads = new Map();
let savedWoxThreads = [];

if (fs.existsSync(woxStateFile)) {
  try {
    savedWoxThreads = JSON.parse(fs.readFileSync(woxStateFile, "utf8"));
  } catch (e) {
    savedWoxThreads = [];
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

function persistState() {
  try {
    fs.writeFileSync(woxStateFile, JSON.stringify(savedWoxThreads, null, 2));
  } catch (e) {}
}

// ===============================
// 3. تسجيل الدخول وتشغيل البوت
// ===============================
login({ appState: getValidAppState() }, (loginError, api) => {
  if (loginError) {
    console.error("❌ فشل تسجيل الدخول:", loginError);
    return;
  }

  // ضبط خيارات الجلسة بشكل آمن
  api.setOptions({
    listenEvents: true,
    selfListen: true,
    autoMarkDelivery: false,
    listenTyping: false,
    forceLogin: true
  });

  console.log("🚀 تم تشغيل البوت والاستماع للأحداث بنجاح...");

  // دالة بدء الوكس مع معالجة الأخطاء
  function startWoxLoop(threadID) {
    if (activeWoxThreads.has(threadID)) return;

    const intervalId = setInterval(() => {
      try {
        const config = getWoxConfig();
        if (!config.enabled) return;

        api.sendMessage(config.text, threadID, (err) => {
          if (err) {
            // تتجاهل الأخطاء العابرة كي لا تتوقف العملية
          }
        });
      } catch (err) {
        console.error("⚠️ خطأ داخل الوكس لـ:", threadID, err.message);
      }
    }, getWoxConfig().interval);

    activeWoxThreads.set(threadID, intervalId);

    if (!savedWoxThreads.includes(threadID)) {
      savedWoxThreads.push(threadID);
      persistState();
    }
  }

  // دالة إيقاف الوكس
  function stopWoxLoop(threadID) {
    if (activeWoxThreads.has(threadID)) {
      clearInterval(activeWoxThreads.get(threadID));
      activeWoxThreads.delete(threadID);
    }
    const index = savedWoxThreads.indexOf(threadID);
    if (index !== -1) {
      savedWoxThreads.splice(index, 1);
      persistState();
    }
  }

  // استعادة المحادثات المشغلة سابقاً
  savedWoxThreads.forEach((tId) => startWoxLoop(tId));

  // ===============================
  // 4. محرك الاستماع (Event Listener)
  // ===============================
  api.listenMqtt((err, event) => {
    if (err) {
      // إهمال أخطاء MQTT التي تسبب الكراش
      return;
    }

    if (!event || !event.type) return;

    try {
      // التعامل مع مغادرة الأعضاء
      if (event.type === "event" && event.logMessageType === "log:unsubscribe") {
        api.sendMessage(" غادر المهرج المجموعة", event.threadID, () => {});
        return;
      }

      // التعامل مع الرسائل
      if (event.type === "message" || event.type === "message_reply") {
        const messageText = (event.body || "").trim();
        const sender = String(event.senderID);
        const thread = String(event.threadID);
        const isUserAdmin = sender === adminID;

        // الأوامر
        if (messageText === "/الوكس تشغيل" && isUserAdmin) {
          stopWoxLoop(thread);
          api.sendMessage("🔥🔷𝐓𝐇𝐄 𝐊𝐈𝐍𝐆 𝐀LWX 𝐈𝐒 𝐇𝐄𝐑𝐄 🌪❌", thread, () => {
            startWoxLoop(thread);
          });
        } else if ((messageText === "! الوكس ايقاف" || messageText === "!الوكس ايقاف") && isUserAdmin) {
          stopWoxLoop(thread);
          api.sendMessage("𝙏𝙃𝙀 𝘼𝙇𝙊𝙙 𝙈𝙊𝘿𝙀 𝙄𝙎 𝙎𝙏𝙊𝙋𝙋𝙀𝘿 ❌", thread, () => {});
        } else if (messageText === "! ألوكس" || messageText === "!ألوكس") {
          if (isUserAdmin) {
            api.sendMessage("👑 𝐀𝐥𝐨x'𝐬 𝐵𝑂َ𝑇 𝐢𝐬 𝐨𝐧 👑\n🔵 𝗬𝗼𝘂 𝘄𝗮𝗻𝘁 𝘁𝗼 𝘀𝘁𝗮𝗿𝘁?", thread, () => {});
          }
        } else if (messageText === "! الوكس" || messageText === "!الوكس") {
          if (isUserAdmin) {
            api.sendMessage("انا هنا !", thread, () => {});
          } else {
            api.sendMessage("ڪ│😂⇦𖤛🧞‍♂️┋ـسـ╾༺☄️༻╿ـمـ︻︽『🐉』𒆙🔥 🦅𒁂𒁎ـڪ", thread, () => {});
          }
        }
      }
    } catch (evtErr) {
      console.error("⚠️ خطأ في معالجة الحدث:", evtErr.message);
    }
  });
});

