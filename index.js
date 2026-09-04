const { login } = require("@eryxenx/fca");
const fs = require("fs");

// ===============================
// Login
// ===============================

const loginOptions = {
  appState: JSON.parse(
    fs.readFileSync("./appstate.json", "utf8")
  )
};

// ===============================
// Wox state
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
// Default Wox configuration
// ===============================

const DEFAULT_WOX_TEXT = `*𝐀𝐥𝐨𝐱'𝐬 𝐫𝐞𝐩𝐥𝐲 🫸🔵🫷*
𖣫 ᗩᒪᒪ ᗪᗴᗰOᑎՏ𖣫
➥𝕲𝙊𝙀𝙏𝙎  𝕺𝙁  𝕱𝘼𝘾𝘼𝘽𝙊𝙊𝙆
𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋
𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋
𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋
𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋
𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋
𖥡┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅𖥡
𝑡𝔥𝔢 𝔮𝔩𝔬𝔵 𝔮𝔩𝑤𝔮𝑦𝑠 𝑠𝑡𝔢𝑝𝑠 𝑜𝑛 𝑠𝑝𝑖𝑑𝑒𝑟𝑠 𝔮𝑛𝑑 𝔦𝔫𝔰𝔢𝑐𝑡𝑠 𝔩𝔦𝔨𝔢 𝔪𝔬𝑐𝑟𝑜𝑤𝔮𝑡.

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
      fs.writeFileSync(
        woxConfigFile,
        JSON.stringify(defaultConfig, null, 2),
        "utf8"
      );

      return defaultConfig;
    }

    const savedConfig = JSON.parse(
      fs.readFileSync(woxConfigFile, "utf8")
    );

    return {
      enabled:
        typeof savedConfig.enabled === "boolean"
          ? savedConfig.enabled
          : true,

      interval:
        Number(savedConfig.interval) >= 1000
          ? Number(savedConfig.interval)
          : 15000,

      text:
        typeof savedConfig.text === "string" &&
        savedConfig.text.length > 0
          ? savedConfig.text
          : DEFAULT_WOX_TEXT
    };
  } catch (e) {
    console.error(
      "❌ Wox config error:",
      e.message
    );

    return defaultConfig;
  }
}

// ===============================
// Save Wox state
// ===============================

function saveWoxState() {
  try {
    fs.writeFileSync(
      woxStateFile,
      JSON.stringify(savedWoxThreads, null, 2),
      "utf8"
    );
  } catch (e) {
    console.error(
      "❌ Wox state save error:",
      e.message
    );
  }
}

function addWoxThread(threadID) {
  if (!savedWoxThreads.includes(threadID)) {
    savedWoxThreads.push(threadID);
    saveWoxState();
  }
}

function removeWoxThread(threadID) {
  const index =
    savedWoxThreads.indexOf(threadID);

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
    return console.error(
      "❌ Login error:",
      err
    );
  }

  // ===============================
  // Session Guard
  // ===============================

  try {
    api.sessionGuard("./appstate.json", {
      interval: 3 * 60 * 1000,
      debounce: 30 * 1000
    });

    console.log(
      "🔄 SessionGuard is active."
    );
  } catch (e) {
    console.error(
      "❌ SessionGuard error:",
      e.message
    );
  }

  api.setOptions({
    listenEvents: true,
    selfListen: true,
    autoMarkDelivery: false,
    listenTyping: false
  });

  console.log(
    "✅ Bot is running with E2EE library..."
  );

  // ===============================
  // Online / Offline
  // ===============================

  let isOnline = true;

  function schedulePresenceCycle() {
    const activeDuration =
      Math.floor(
        Math.random() *
          (7200000 - 3600000 + 1)
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

        console.log(
          "☀️ Bot is back online."
        );

        schedulePresenceCycle();
      }, 900000);

    }, activeDuration);
  }

  api.setOptions({
    online: true
  });

  schedulePresenceCycle();

  // ===============================
  // Send with typing
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

      await new Promise(resolve =>
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
  // Wox intervals
  // ===============================

  const woxIntervals = new Map();

  const adminID =
    "61594108102958";

  // ===============================
  // Start Wox
  // ===============================

  function startWox(
    threadID,
    announce = false
  ) {
    if (woxIntervals.has(threadID)) {
      return;
    }

    const config =
      loadWoxConfig();

    const newInterval =
      setInterval(async () => {
        const currentConfig =
          loadWoxConfig();

        if (!currentConfig.enabled) {
          return;
        }

        try {
          await api.sendMessage(
            currentConfig.text,
            threadID
          );
        } catch (e) {
          // تجاهل أخطاء الإرسال
        }

      }, config.interval);

    woxIntervals.set(
      threadID,
      newInterval
    );

    addWoxThread(threadID);

    if (announce) {
      sendMessageWithTyping(
        "🔥🔷𝐓𝐇𝐄 𝐊𝐈𝐍𝐆 𝐀𝐋𝐎𝐗 𝐈𝐒 𝐇𝐄𝐑𝐄 🌪❌",
        threadID
      );
    }
  }

  // ===============================
  // Stop Wox
  // ===============================

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
  // Restart Wox intervals
  // ===============================

  function restartAllWoxIntervals() {
    const activeThreads =
      Array.from(woxIntervals.keys());

    for (const threadID of activeThreads) {
      clearInterval(
        woxIntervals.get(threadID)
      );

      woxIntervals.delete(threadID);
    }

    for (const threadID of savedWoxThreads) {
      startWox(threadID, false);
    }

    console.log(
      "🔄 Wox intervals reloaded from configuration."
    );
  }

  // ===============================
  // Watch Wox config
  // ===============================

  let lastWoxConfig = "";

  try {
    lastWoxConfig = fs.existsSync(
      woxConfigFile
    )
      ? fs.readFileSync(
          woxConfigFile,
          "utf8"
        )
      : "";

    fs.watchFile(
      woxConfigFile,
      {
        interval: 1000
      },
      () => {
        try {
          const newConfig =
            fs.readFileSync(
              woxConfigFile,
              "utf8"
            );

          if (newConfig !== lastWoxConfig) {
            lastWoxConfig = newConfig;

            restartAllWoxIntervals();
          }

        } catch (e) {
          console.error(
            "❌ Wox config watch error:",
            e.message
          );
        }
      }
    );

  } catch (e) {
    console.error(
      "❌ Failed to watch Wox config:",
      e.message
    );
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
  // Messenger listener
  // ===============================

  api.listenMqtt(
    async (err, event) => {
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
        // Group leave
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
          // Wox ON
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
          // Wox OFF
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
          // Admin commands
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
                `👑𝐀𝐥𝐨x'𝐬 𝐵𝑂َ𝑇 𝐢𝐬 𝐨𝐧👑\nꪱׁׁׁׅׅׅܻ⨍ ɑׁׅ݊ꪀᨮׁׅ֮ᨵׁׅׅ݊ꪀꫀׁׅܻ݊ ժׁׅ݊ɑׁׅꭈׁׅꫀׁׅܻׅ݊꯱ tׁׅᨵׁׅׅ݊ ᝯׁ֒hׁׅ֮ɑׁׅᥣׁׅ֪ᥣׁׅ֪ꫀׁׅܻ݊݊ꪀᧁׁꫀׁׅܻ݊ hׁׅ֮ꪱׁׁׁׅׅׅꩇׁׅ֪݊ , hׁׁׅׅ֮֮ꫀׁׅܻ݊'꯱ ᧁׁᨵׁׅׅ݊ꪀ݊ꪀɑׁׅ υׁׅׅ꯱ꫀׁׅܻ݊ :\nٱﺂݪو໑ڪَِكٍْسہًٍۦـس قݪ ݪهَـْہ‌‍َِٰمَِـۥـِمٛ ٱﺂݪصࢪٱﺂحٍَـحهَـْہ‌‍َِٰ!\n🔵𝗬𝗼𝘂 𝘄𝗮𝗻𝘁 𝘁𝗼 𝘀𝘁𝗮𝗿𝘁?`,
                event.threadID
              );
            }
          }

          // ===============================
          // Wox check
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
    }
  );
});
