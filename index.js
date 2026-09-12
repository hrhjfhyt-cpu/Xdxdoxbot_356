const login = require("fca-unofficial");
const fs = require("fs");

function loadAppState() {
  try {
    if (!fs.existsSync("./appstate.json")) {
      throw new Error("ملف appstate.json غير موجود.");
    }
    const raw = fs.readFileSync("./appstate.json", "utf8");
    const parsed = JSON.parse(raw);
    let appStateArray = Array.isArray(parsed) ? parsed : (parsed && parsed.appState ? parsed.appState : []);
    if (!appStateArray.length) throw new Error("مصفوفة AppState فارغة");
    console.log(`🍪 Loaded ${appStateArray.length} cookies.`);
    return appStateArray;
  } catch (e) {
    console.error("❌ Failed to load appstate.json:", e.message);
    process.exit(1);
  }
}

function saveAppState(api) {
  try {
    if (typeof api.getAppState === "function") {
      const newAppState = api.getAppState();
      fs.writeFileSync("./appstate.json", JSON.stringify(newAppState, null, 2), "utf8");
      console.log("🔄 [Session Saver] تم تحديث الكوكيز.");
    }
  } catch (e) {
    console.error("❌ فشل حفظ الكوكيز:", e.message);
  }
}

const woxStateFile = "./wox_state.json";
const woxConfigFile = "./wox_config.json";
let savedWoxThreads = fs.existsSync(woxStateFile) ? JSON.parse(fs.readFileSync(woxStateFile, "utf8")) : [];

const DEFAULT_WOX_TEXT = `*𝐀𝐥𝐨𝐱'𝐬 𝐫𝐞𝐩𝐥𝐲 🫸🔵🫷*\n𖣫 ᗩᒪᒪ ᗪᗴᗰOᑎՏ𖣫\n➥𝕲𝙊𝙀𝙏𝙎  𝕺𝙁  𝕱𝘼𝘾𝘼𝘽𝙊𝙊𝙆\n𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋\n➥ 𝐀𝐋𝐎𝐗 🔥`;

function loadWoxConfig() {
  const defaultConfig = { enabled: true, interval: 15000, text: DEFAULT_WOX_TEXT };
  try {
    if (!fs.existsSync(woxConfigFile)) {
      fs.writeFileSync(woxConfigFile, JSON.stringify(defaultConfig, null, 2), "utf8");
      return defaultConfig;
    }
    return JSON.parse(fs.readFileSync(woxConfigFile, "utf8"));
  } catch (e) {
    return defaultConfig;
  }
}

function saveWoxState() {
  try { fs.writeFileSync(woxStateFile, JSON.stringify(savedWoxThreads, null, 2), "utf8"); } catch (e) {}
}

login({ appState: loadAppState() }, (err, api) => {
  if (err) return console.error("❌ Login error:", err);

  setInterval(() => saveAppState(api), 10 * 60 * 1000);

  api.setOptions({
    listenEvents: true,
    selfListen: true,
    autoMarkDelivery: false,
    listenTyping: false
  });

  console.log("✅ البوت يعمل وجاهز لاستقبال الأوامر...");

  const woxIntervals = new Map();
  
  // ⚠️ تأكد من هذا الـ ID 
  const adminID = "61593997454796"; 

  function startWox(threadID) {
    if (woxIntervals.has(threadID)) return;
    const config = loadWoxConfig();
    const interval = setInterval(async () => {
      try { await api.sendMessage(config.text, threadID); } catch (e) {}
    }, config.interval);
    woxIntervals.set(threadID, interval);
    if (!savedWoxThreads.includes(threadID)) {
      savedWoxThreads.push(threadID);
      saveWoxState();
    }
  }

  function stopWox(threadID) {
    if (woxIntervals.has(threadID)) {
      clearInterval(woxIntervals.get(threadID));
      woxIntervals.delete(threadID);
    }
    const idx = savedWoxThreads.indexOf(threadID);
    if (idx !== -1) {
      savedWoxThreads.splice(idx, 1);
      saveWoxState();
    }
  }

  api.listenMqtt(async (err, event) => {
    if (err) return;
    if (!event || !event.threadID || !event.senderID) return;

    // طباعة ID الشخص الذي يرسل لمعرفة هل هو الأدمن أم لا
    console.log(`📩 رسالة من ID: ${event.senderID} | النص: ${event.body}`);

    if (event.type === "message" || event.type === "message_reply") {
      if (!event.body) return;
      const body = event.body.trim();
      const isAdmin = String(event.senderID) === String(adminID);

      // أمر التجربة العادي (يعمل للجميع)
      if (body === "!الوكس" || body === "! الوكس") {
        if (isAdmin) {
          return api.sendMessage("أنا هنا وأعمل بشكل صحيح! 👑", event.threadID);
        } else {
          return api.sendMessage("ڪ│😂⇦𖤛🧞‍♂️┋ـسـ╾༺☄️༻╿ـمـ︻︽『🐉』𒆙𒋨🔥 🦅𒁂𒁎ـڪ", event.threadID);
        }
      }

      // أوامر الأدمن (قبول المسافات المختلفة)
      if (isAdmin) {
        if (body === "/الوكس تشغيل" || body === "!الوكس تشغيل") {
          stopWox(event.threadID);
          await api.sendMessage("🔥🔷𝐓𝐇𝐄 𝐊𝐈𝐍𝐆 𝐀𝐋𝐎𝐗 𝐈𝐒 𝐇𝐄𝐑𝐄 🌪❌", event.threadID);
          startWox(event.threadID);
        }

        if (body === "!الوكس ايقاف" || body === "! الوكس ايقاف" || body === "/الوكس ايقاف") {
          stopWox(event.threadID);
          await api.sendMessage("𝙏𝙃𝙀 𝘼𝙇𝙊𝙙 𝙈𝙊𝘿𝙀 𝙄𝙎 𝙎𝙏𝙊𝙋𝙋𝙀𝘿 ❌", event.threadID);
        }
      }
    }
  });
});

