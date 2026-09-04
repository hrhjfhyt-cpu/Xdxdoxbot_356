Enterconst { login } = require("@eryxenx/fca");
const fs = require("fs");

const loginOptions = {
  appState: JSON.parse(fs.readFileSync("./appstate.json", "utf8"))
};

// ===============================
// Wox State
// ===============================

const woxStateFile = "./wox_state.json";
const woxConfigFile = "./wox_config.json";

let savedWoxThreads = [];

try {
  if (fs.existsSync(woxStateFile)) {
    const savedData = JSON.parse(
      fs.readFileSync(woxStateFile, "utf8")
    );

    if (Array.isArray(savedData)) {
      savedWoxThreads = savedData;
    }
  }
} catch (e) {
  savedWoxThreads = [];
}

// ===============================
// Wox Config
// ===============================

const defaultWoxConfig = {
  enabled: true,
  interval: 15000,
  text: "Wox message"
};

function loadWoxConfig() {
  try {
    if (!fs.existsSync(woxConfigFile)) {
      fs.writeFileSync(
        woxConfigFile,
        JSON.stringify(defaultWoxConfig, null, 2),
        "utf8"
      );

      return { ...defaultWoxConfig };
    }

    const data = JSON.parse(
      fs.readFileSync(woxConfigFile, "utf8")
    );

    return {
      ...defaultWoxConfig,
      ...data
    };
  } catch (e) {
    console.error("❌ Wox config error:", e.message);
    return { ...defaultWoxConfig };
  }
}

function saveWoxConfig(config) {
  try {
    fs.writeFileSync(
      woxConfigFile,
      JSON.stringify(config, null, 2),
      "utf8"
    );

    return true;
  } catch (e) {
    console.error("❌ Wox config save error:", e.message);
    return false;
  }
}

// ===============================
// Save Wox State
// ===============================

function saveWoxState() {
  try {
    fs.writeFileSync(
      woxStateFile,
      JSON.stringify(savedWoxThreads, null, 2),
      "utf8"
    );
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
// Login
// ===============================

login(loginOptions, (err, api) => {
  if (err) {
    console.error("❌ Login error:", err);
    process.exit(1);
  }

  // ===============================
  // Session Guard
  // ===============================

  try {
    api.sessionGuard("./appstate.json", {
      interval: 3 * 60 * 1000,
      debounce: 30 * 1000
    });

    console.log("🔄 SessionGuard is active.");
  } catch (e) {
    console.error("❌ SessionGuard error:", e.message);
  }

  // ===============================
  // Options
  // ===============================

  api.setOptions({
    listenEvents: true,
    selfListen: true,
    autoMarkDelivery: false,
    listenTyping: false
  });

  console.log("✅ Bot is running with E2EE library...");

  // ===============================
  // Presence
  // ===============================

  let isOnline = true;

  function schedulePresenceCycle() {
    const activeDuration =
      Math.floor(
        Math.random() * (7200000 - 3600000 + 1)
      ) + 3600000;

    setTimeout(() => {
      isOnline = false;

      api.setOptions({
        online: false
      });

      console.log(
        "🌙 Bot is now offline/inactive for 15 minutes."
      );

      setTimeout(() => {
        isOnline = true;

        api.setOptions({
          online: true
        });

        console.log("☀️ Bot is back online.");

        schedulePresenceCycle();
      }, 900000);

    }, activeDuration);
  }

  api.setOptions({
    online: true
  });

  schedulePresenceCycle();

  // ===============================
  // Typing + Message
  // ===============================

  async function sendMessageWithTyping(
    text,
    threadID,
    delayMs = 1500
  ) {
    try {
      api.sendTypingIndicator(
        threadID,
        () => {}
      );

      await new Promise((resolve) =>
        setTimeout(resolve, delayMs)
      );

      return await api.sendMessage(
        text,
        threadID
      );
    } catch (e) {
      return await api
        .sendMessage(text, threadID)
        .catch(() => {});
    }
  }

  // ===============================
  // Wox
  // ===============================

  const woxIntervals = new Map();
  const adminID = "61594108102958";

  function startWox(threadID, announce = false) {

    if (woxIntervals.has(threadID)) {
      return;
    }

    const config = loadWoxConfig();

    if (!config.enabled) {
      console.log(
        "⚠️ Wox is disabled from configuration."
      );
      return;
    }

    const interval =
      Number(config.interval) >= 1000
        ? Number(config.interval)
        : 15000;

    const newInterval = setInterval(() => {

      const currentConfig = loadWoxConfig();

      if (!currentConfig.enabled) {
        return;
      }

      api
        .sendMessage(
          currentConfig.text,
          threadID
        )
        .catch(() => {});

    }, interval);

    woxIntervals.set(
      threadID,
      newInterval
    );

    addWoxThread(threadID);

    console.log(
      `🔥 Wox started for ${threadID} every ${interval}ms`
    );

    if (announce) {
      sendMessageWithTyping(
        "🔥🔷𝐓𝐇𝐄 𝐊𝐈𝐍𝐆 𝐀𝐋𝐎𝐗 𝐈𝐒 𝐇𝐄𝐑𝐄 🌪❌",
        threadID
      );
    }
  }

  function stopWox(threadID) {

    if (woxIntervals.has(threadID)) {

      clearInterval(
        woxIntervals.get(threadID)
      );

      woxIntervals.delete(threadID);
    }

    removeWoxThread(threadID);
  }

  // ===============================
  // Restore Wox
  // ===============================

  if (savedWoxThreads.length > 0) {

    console.log(
      `🔄 Restoring Wox mode for ${savedWoxThreads.length} thread(s)...`
    );

    for (const threadID of savedWoxThreads) {
      startWox(threadID, false);
    }

    console.log(
      "✅ Previous Wox states restored."
    );
  }

  // ===============================
  // MQTT
  // ===============================

  api.listenMqtt(async (err, event) => {

    try {

      if (err) {

        if (
          err.message &&
          err.message.includes("E2EE")
        ) {
          return;
        }

        return console.error(
          "❌ Mqtt error:",
          err
        );
      }

      if (
        !event ||
        !event.threadID ||
        !event.senderID
      ) {
        return;
      }

      // ===============================
      // Group Leave
      // ===============================

      if (
        event.type === "event" &&
        event.logMessageType ===
          "log:unsubscribe"
      ) {

        return sendMessageWithTyping(
          " غادر المهرج المجموعة",
          event.threadID
        );
      }

      // ===============================
      // Messages
      // ===============================

      if (
        event.type === "message" ||
        event.type === "message_reply"
      ) {

        if (
          !event.body ||
          typeof event.body !== "string"
        ) {
          return;
        }

        const body =
          event.body.trim();

        // ===============================
        // Wox Start
        // ===============================

        if (
          body === "/الوكس تشغيل" &&
          event.senderID === adminID
        ) {

          if (
            woxIntervals.has(
              event.threadID
            )
          ) {

            clearInterval(
              woxIntervals.get(
                event.threadID
              )
            );

            woxIntervals.delete(
              event.threadID
            );
          }

          await sendMessageWithTyping(
            "🔥🔷𝐓𝐇𝐄 𝐊𝐈𝐍𝐆 𝐀𝐋𝐎𝐗 𝐈𝐒 𝐇𝐄𝐑𝐄 🌪❌",
            event.threadID
          );

          startWox(
            event.threadID,
            false
          );
        }

        // ===============================
        // Wox Stop
        // ===============================

        if (
          body === "! الوكس ايقاف" &&
          event.senderID === adminID
        ) {

          if (
            woxIntervals.has(
              event.threadID
            )
          ) {

            clearInterval(
              woxIntervals.get(
                event.threadID
              )
            );

            woxIntervals.delete(
              event.threadID
            );

            removeWoxThread(
              event.threadID
            );

            await sendMessageWithTyping(
              " 𝙏𝙃𝙀 𝘼𝙇𝙊𝙓 𝙈𝙊𝘿𝙀 𝙄𝙎 𝙎𝙏𝙊𝙋𝙋𝙀𝘿 ❌",
              event.threadID
            );

          } else {

            removeWoxThread(
              event.threadID
            );

            await sendMessageWithTyping(
              " متت اختفو 😂",
              event.threadID
            );
          }
        }

        // ===============================
        // Admin Commands
        // ===============================

        const text =
          event.body
            .toLowerCase()
            .trim();

        const isAdmin =
          event.senderID === adminID;

        if (isAdmin) {

          if (text === "!ألوكس") {

            await sendMessageWithTyping(
              `👑𝐀𝐥𝐨x'𝐬 𝐵𝑂َ𝑇 𝐢𝐬 𝐨𝐧👑\nꪱׁׁׁׅׅׅܻ⨍ ɑׁׅ݊ꪀᨮׁׅ֮ᨵׁׅׅ݊ꪀꫀׁׅܻ݊݊ ժׁׅ݊ɑׁׅꭈׁׅꫀׁׅܻׅ݊꯱ tׁׅᨵׁׅׅ݊ ᝯׁ֒hׁׅ֮ɑׁׅᥣׁׅ֪ᥣׁׅ֪ꫀׁׅܻ݊݊ꪀᧁׁꫀׁׅܻ݊ hׁׅ֮ꪱׁׁׁׅׅׅꩇׁׅ֪݊ , hׁׁׅׅ֮֮ꫀׁׅܻ݊'꯱ ᧁׁᨵׁׅׅ݊ꪀ݊ꪀɑׁׅ υׁׅׅ꯱ꫀׁׅܻ݊ :\nٱﺂݪو໑ڪَِكٍْسہًٍۦـس قݪ ݪهَـْہ‌‍َِٰمَِـۥـِمٛ ٱﺂݪصࢪٱﺂحٍَـحهَـْہ‌‍َِٰ!\n🔵𝗬𝗼𝘂 𝘄𝗮𝗻𝘁 𝘁𝗼 𝘀𝘁𝗮𝗿𝘁?`,
              event.threadID
            );
          }
        }

        // ===============================
        // Wox Check
        // ===============================

        if (body === "! الوكس") {

          if (
            event.senderID === adminID
          ) {

            return sendMessageWithTyping(
              "انا هنا ! ",
              event.threadID
            );
          }

          sendMessageWithTyping(
            "ڪ│😂⇦𖤛🧞‍♂️┋ـسـ╾༺☄️༻╿ـمـ︻︽『🐉🈴』𒆙𒋨🔥 🦅𒁂𒁎ـڪ ",
            event.threadID
          );
        }
      }

    } catch (e) {

      console.error(
        "❌ Error caught:",
        e.message
      );
    }
  });

  // ===============================
  // Graceful shutdown
  // ===============================

  process.on(
    "SIGTERM",
    () => {
      console.log(
        "🛑 Bot process stopping..."
      );

      for (
        const interval of woxIntervals.values()
      ) {
        clearInterval(interval);
      }

      woxIntervals.clear();

      process.exit(0);
    }
  );

  process.on(
    "SIGINT",
    () => {
      console.log(
        "🛑 Bot process stopping..."
      );

      process.exit(0);
    }
  );
});
