const login = require("fca-unofficial"); // أو اسم المكتبة التي تستخدمها
const fs = require("fs");

// ===============================
// Login / AppState Parsing & Saving
// ===============================

function loadAppState() {
  try {
    if (!fs.existsSync("./appstate.json")) {
      throw new Error("ملف appstate.json غير موجود.");
    }

    const raw = fs.readFileSync("./appstate.json", "utf8");
    const parsed = JSON.parse(raw);

    let appStateArray = [];

    if (Array.isArray(parsed)) {
      appStateArray = parsed;
    } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.appState)) {
      appStateArray = parsed.appState;
    } else {
      throw new Error("ملف appstate.json لا يحتوي على مصفوفة JSON صالحة.");
    }

    console.log(`🍪 Loaded ${appStateArray.length} cookies.`);
    return appStateArray;

  } catch (e) {
    console.error("❌ Failed to load appstate.json:", e.message);
    process.exit(1);
  }
}

// دالة تجديد وحفظ الكوكيز في الملف
function saveAppState(api) {
  try {
    if (typeof api.getAppState === "function") {
      const newAppState = api.getAppState();
      fs.writeFileSync("./appstate.json", JSON.stringify(newAppState, null, 2), "utf8");
      console.log("🔄 [Session Saver] تم تجديد وحفظ الكوكيز بنجاح في appstate.json");
    }
  } catch (e) {
    console.error("❌ فشل تجديد الكوكيز تلقائياً:", e.message);
  }
}

// ===============================
// Wox state & Config
// ===============================

const woxStateFile = "./wox_state.json";
const woxConfigFile = "./wox_config.json";

let savedWoxThreads = [];

try {
  if (fs.existsSync(woxStateFile)) {
    const savedData = JSON.parse(fs.readFileSync(woxStateFile, "utf8"));
    if (Array.isArray(savedData)) {
      savedWoxThreads = savedData;
    }
  }
} catch (e) {
  savedWoxThreads = [];
}

const DEFAULT_WOX_TEXT = `*𝐀𝐥𝐨𝐱'𝐬 𝐫𝐞𝐩𝐥𝐲 🫸🔵🫷*
𖣫 ᗩᒪᒪ ᗪᗴᗰOᑎՏ𖣫
➥𝕲𝙊𝙀𝙏𝙎  𝕺𝙁  𝕱𝘼𝘾𝘼𝘽𝙊𝙊𝙆
𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋
𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋
𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋
𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋
𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋
𖥡┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅𖥡
𝑡𝔥𝔢 𝔮𝔩𝔬𝔵 𝔮𝔩𝑤𝔮𝑦𝑠 𝑠𝑡𝔢𝑝𝑠 𝑜𝑛 𝑠𝑝𝑖𝑑𝑒𝑟𝑠 𝔮𝑛𝔡 𝑖𝔫𝑠𝑒𝑐𝑡𝑠 𝔩𝔦𝔨𝔢 𝔪𝔬𝑐𝑟𝔬𝑤𝔮𝑡.

                           ↫🪫↬


   ➥『𝐖𝐄 𝐀𝐑𝐄 𝐇𝐈𝐒𝐓𝐎𝐑𝐘』╮


    ⌯        .ℙ𝕒𝕥𝕣𝕚𝕔𝕜.

➥ 𝐀𝐋𝐎𝐗 🔥

『༴̤☠︎︎⋆̤☯』⇣؍.َِ𝗧𝗛𝗘 𝗞𝗜𝗡𝗚⏤͟͟͞͞𝗔𝗟𝗢𝗫

        ➥【𝕯𝐸𝑀ϴ𝑁𝔖】

𝙇𝙀𝘼𝘿𝙀𝙍 𝙊𝙁 𝘼𝙇𝙇 𝙁𝘼𝘾𝙀𝘽𝙊𝙊𝙆 𒆙⌯𖠨𖠫𖠰𖠱𖠳

⏤͟͟͞͞🫸⛩️🫷𝐀𝐒𝐓𝐑𝐎`;

function loadWoxConfig() {
  const defaultConfig = {
    enabled: true,
    interval: 15000,
    text: DEFAULT_WOX_TEXT
  };

  try {
    if (!fs.existsSync(woxConfigFile)) {
      fs.writeFileSync(woxConfigFile, JSON.stringify(defaultConfig, null, 2), "utf8");
      return defaultConfig;
    }

    const savedConfig = JSON.parse(fs.readFileSync(woxConfigFile, "utf8"));

    return {
      enabled: typeof savedConfig.enabled === "boolean" ? savedConfig.enabled : true,
      interval: Number(savedConfig.interval) >= 1000 ? Number(savedConfig.interval) : 15000,
      text: typeof savedConfig.text === "string" && savedConfig.text.length > 0 ? savedConfig.text : DEFAULT_WOX_TEXT
    };
  } catch (e) {
    console.error("❌ Wox config error:", e.message);
    return defaultConfig;
  }
}

function saveWoxState() {
  try {
    fs.writeFileSync(woxStateFile, JSON.stringify(savedWoxThreads, null, 2), "utf8");
  } catch (e) {
    console.error("❌ Wox state save error:", e.message);
  }
}

function addWoxThread(threadID) {
  if (!savedWoxThreads.includes(threadID)) {
    savedWoxThreads.push(threadID);
    saveWoxState();
  }
}

function removeWoxThread(threadID) {
  const index = savedWoxThreads.indexOf(threadID);
  if (index !== -1) {
    savedWoxThreads.splice(index, 1);
    saveWoxState();
  }
}

// ===============================
// Login Execution
// ===============================

login({ appState: loadAppState() }, (err, api) => {
  if (err) {
    return console.error("❌ Login error:", err);
  }

  // ===============================
  // Session Guard & Automatic Renew
  // ===============================

  // 1. استخدام sessionGuard إذا كانت مدعومة بالمكتبة
  try {
    if (typeof api.sessionGuard === "function") {
      api.sessionGuard("./appstate.json", {
        interval: 3 * 60 * 1000,
        debounce: 30 * 1000
      });
      console.log("🔄 SessionGuard is active.");
    }
  } catch (e) {
    console.error("❌ SessionGuard error:", e.message);
  }

  // 2. تجديد الكوكيز وتحديث الملف كل 10 دقائق تلقائياً لحماية الجلسة
  setInterval(() => {
    saveAppState(api);
  }, 10 * 60 * 1000);

  // ضبط إعدادات الاستماع
  api.setOptions({
    listenEvents: true,
    selfListen: true,
    autoMarkDelivery: false,
    listenTyping: false
  });

  console.log("✅ Bot is running with Session Refresh active...");

  // ===============================
  // Send with typing
  // ===============================

  async function sendMessageWithTyping(text, threadID, delayMs = 1500) {
    try {
      if (typeof api.sendTypingIndicator === "function") {
        api.sendTypingIndicator(threadID, () => {});
      }

      await new Promise(resolve => setTimeout(resolve, delayMs));
      return await api.sendMessage(text, threadID);
    } catch (e) {
      return await api.sendMessage(text, threadID).catch(() => {});
    }
  }

  // ===============================
  // Wox intervals
  // ===============================

  const woxIntervals = new Map();
  const adminID = "61593590627474";

  function startWox(threadID, announce = false) {
    if (woxIntervals.has(threadID)) return;

    const config = loadWoxConfig();

    const newInterval = setInterval(async () => {
      const currentConfig = loadWoxConfig();
      if (!currentConfig.enabled) return;

      try {
        await api.sendMessage(currentConfig.text, threadID);
      } catch (e) {
        // تجاهل أخطاء الإرسال المستمرة
      }
    }, config.interval);

    woxIntervals.set(threadID, newInterval);
    addWoxThread(threadID);

    if (announce) {
      sendMessageWithTyping("🔥🔷𝐓𝐇𝐄 𝐊𝐈𝐍𝐆 𝐀𝐋𝐎𝐗 𝐈𝐒 𝐇𝐄𝐑𝐄 🌪❌", threadID);
    }
  }

  function stopWox(threadID) {
    if (woxIntervals.has(threadID)) {
      clearInterval(woxIntervals.get(threadID));
      woxIntervals.delete(threadID);
    }
    removeWoxThread(threadID);
  }

  function restartAllWoxIntervals() {
    const activeThreads = Array.from(woxIntervals.keys());
    for (const threadID of activeThreads) {
      clearInterval(woxIntervals.get(threadID));
      woxIntervals.delete(threadID);
    }

    for (const threadID of savedWoxThreads) {
      startWox(threadID, false);
    }

    console.log("🔄 Wox intervals reloaded from configuration.");
  }

  // ===============================
  // Watch Wox config
  // ===============================

  let lastWoxConfig = "";

  try {
    lastWoxConfig = fs.existsSync(woxConfigFile) ? fs.readFileSync(woxConfigFile, "utf8") : "";

    fs.watchFile(woxConfigFile, { interval: 1000 }, () => {
      try {
        const newConfig = fs.readFileSync(woxConfigFile, "utf8");
        if (newConfig !== lastWoxConfig) {
          lastWoxConfig = newConfig;
          restartAllWoxIntervals();
        }
      } catch (e) {
        console.error("❌ Wox config watch error:", e.message);
      }
    });
  } catch (e) {
    console.error("❌ Failed to watch Wox config:", e.message);
  }

  // ===============================
  // Restore Wox
  // ===============================

  if (savedWoxThreads.length > 0) {
    console.log(`🔄 Restoring Wox mode for ${savedWoxThreads.length} thread(s)...`);
    for (const threadID of savedWoxThreads) {
      startWox(threadID, false);
    }
    console.log("✅ Previous Wox states restored.");
  }

  // ===============================
  // Messenger listener
  // ===============================

  api.listenMqtt(async (err, event) => {
    if (err) {
      if (err.message && err.message.includes("E2EE")) return;
      return console.error("❌ Mqtt error:", err);
    }

    if (!event || !event.threadID || !event.senderID) return;

    try {
      if (event.type === "event" && event.logMessageType === "log:unsubscribe") {
        return sendMessageWithTyping(" غادر المهرج المجموعة", event.threadID);
      }

      if (event.type === "message" || event.type === "message_reply") {
        if (!event.body || typeof event.body !== "string") return;

        const body = event.body.trim();
        const text = body.toLowerCase();
        const isAdmin = event.senderID === adminID;

        if (body === "/الوكس تشغيل" && isAdmin) {
          stopWox(event.threadID);
          await sendMessageWithTyping("🔥🔷𝐓𝐇𝐄 𝐊𝐈𝐍𝐆 𝐀𝐋𝐎𝐗 𝐈𝐒 𝐇𝐄𝐑𝐄 🌪❌", event.threadID);
          startWox(event.threadID, false);
          return;
        }

        if (body === "! الوكس ايقاف" && isAdmin) {
          if (woxIntervals.has(event.threadID)) {
            stopWox(event.threadID);
            await sendMessageWithTyping(" 𝙏𝙃𝙀 𝘼𝙇𝙊𝙙 𝙈𝙊𝘿𝙀 𝙄𝙎 𝙎𝙏𝙊𝙋𝙋𝙀𝘿 ❌", event.threadID);
          } else {
            removeWoxThread(event.threadID);
            await sendMessageWithTyping(" متت اختفو 😂", event.threadID);
          }
          return;
        }

        if (text === "!ألوكس" && isAdmin) {
          await sendMessageWithTyping(
            `👑𝐀𝐥𝐨x'𝐬 𝐵𝑂َ𝑇 𝐢𝐬 𝐨𝐧👑\nꪱׁׁׁׅׅׅܻ⨍ ɑׁׅ݊ꪀᨮׁׅ֮ᨵׁׅׅ݊ꪀꫀׁׅܻ݊ ժׁׅ݊ɑׁׅꭈׁׅꫀׁׅܻׅ݊꯱ tׁׅᨵׁׅׅ݊ ᝯׁ֒hׁׅ֮ɑׁׅᥣׁׅ֪ᥣׁׅ֪ꫀׁׅܻ݊݊ꪀᧁׁꫀׁׅܻ݊ hׁׅ֮ꪱׁׁׁׅׅׅꩇׁׅ֪݊ , hׁׁׅׅ֮֮ꫀׁׅܻ݊'꯱ ᧁׁᨵׁׅׅ݊ꪀ݊ꪀɑׁׅ υׁׅׅ꯱ꫀׁׅܻ݊ :\nٱﺂݪو໑ڪَِكٍْسہًٍۦـس قݪ ݪهَـْہ‌‍َِٰمَِـۥـِمٛ ٱﺂݪصࢪٱﺂحٍَـحهَـْہ‌‍َِٰ!\n🔵𝗬𝗼𝘂 𝘄𝗮𝗻𝘁 𝘁𝗼 𝘀𝘁𝗮𝗿𝘁?`,
            event.threadID
          );
          return;
        }

        if (body === "! الوكس") {
          if (isAdmin) {
            return sendMessageWithTyping("انا هنا ! ", event.threadID);
          }
          sendMessageWithTyping("ڪ│😂⇦𖤛🧞‍♂️┋ـسـ╾༺☄️༻╿ـمـ︻︽『🐉』𒆙𒋨🔥 🦅𒁂𒁎ـڪ ", event.threadID);
        }
      }
    } catch (e) {
      console.error("❌ Error processing event:", e.message);
    }
  });
});

