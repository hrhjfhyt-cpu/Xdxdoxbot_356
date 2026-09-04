const { login } = require("@eryxenx/fca");
const fs = require("fs");

const loginOptions = {
  appState: JSON.parse(fs.readFileSync("./appstate.json", "utf8"))
};

// 🟢 ملف حفظ حالة أوامر الوكس
const woxStateFile = "./wox_state.json";

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

// حفظ حالة الوكس
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

// إضافة محادثة للحالة المحفوظة
function addWoxThread(threadID) {
  if (!savedWoxThreads.includes(threadID)) {
    savedWoxThreads.push(threadID);
    saveWoxState();
  }
}

// حذف محادثة من الحالة المحفوظة
function removeWoxThread(threadID) {
  const index = savedWoxThreads.indexOf(threadID);

  if (index !== -1) {
    savedWoxThreads.splice(index, 1);
    saveWoxState();
  }
}

login(loginOptions, (err, api) => {
  if (err) return console.error("❌ Login error:", err);

  // 🔄 حفظ الـ appState تلقائيًا وتحديث الجلسة
  try {
    api.sessionGuard("./appstate.json", {
      interval: 3 * 60 * 1000,
      debounce: 30 * 1000
    });

    console.log("🔄 SessionGuard is active.");
  } catch (e) {
    console.error("❌ SessionGuard error:", e.message);
  }

  // إعدادات خالية من forceOffline أو أي خيارات غير مدعومة
  api.setOptions({
    listenEvents: true,
    selfListen: true,
    autoMarkDelivery: false,
    listenTyping: false
  });

  console.log("✅ Bot is running with E2EE library...");

  // 🟢 نظام محاكاة النشاط (نشط / غير نشط عشوائي)
  let isOnline = true;

  function schedulePresenceCycle() {
    const activeDuration =
      Math.floor(Math.random() * (7200000 - 3600000 + 1)) + 3600000;

    setTimeout(() => {
      isOnline = false;
      api.setOptions({ online: false });
      console.log("🌙 Bot is now offline/inactive for 15 minutes.");

      setTimeout(() => {
        isOnline = true;
        api.setOptions({ online: true });
        console.log("☀️ Bot is back online.");
        schedulePresenceCycle();
      }, 900000);

    }, activeDuration);
  }

  api.setOptions({ online: true });
  schedulePresenceCycle();

  // دالة إرسال مع مؤشر الكتابة
  async function sendMessageWithTyping(text, threadID, delayMs = 1500) {
    try {
      api.sendTypingIndicator(threadID, () => {});
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return await api.sendMessage(text, threadID);
    } catch (e) {
      return await api.sendMessage(text, threadID).catch(() => {});
    }
  }

  // Map لحفظ التكرارات مستقلة لكل محادثة (خاص أو جروب)
  const woxIntervals = new Map();
  const adminID = "61594108102958";

  // 🟢 تشغيل الوكس في محادثة معينة
  function startWox(threadID, announce = false) {
    // إذا كان يعمل بالفعل لا ننشئ Interval ثاني
    if (woxIntervals.has(threadID)) {
      return;
    }

    const woxText = `*𝐀𝐥𝐨𝐱'𝐬 𝐫𝐞𝐩𝐥𝐲 🫸🔵🫷*
𖣫 ᗩᒪᒪ ᗪᗴᗰOᑎՏ𖣫
➥𝕲𝙊𝙀𝙏𝙎  𝕺𝙁  𝕱𝘼𝘾𝘼𝘽𝙊𝙊𝙆
𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋
𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋
𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋
𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋
𒈒⬅✰🌉⟿⛓⟿ 𝐴𝐿𒈒⬅✰🌉⟿⛓⟿𝑂𝑋
𖥡┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅𖥡
𝑡𝔥𝔢 𝔮𝔩𝔬𝔵 𝔮𝔩𝑤𝔮𝑦𝑠 𝑠𝑡𝔢𝑝𝑠 𝑜𝑛 𝑠𝑝𝑖𝑑𝑒𝑟𝑠 𝔮𝑛𝑑 𝔦𝔫𝑠𝔢𝔠𝑡𝑠 𝔩𝔦𝔨𝔢 𝔪𝔬𝔠𝔯𝔬𝑤𝔮𝑡.            

                           ↫🪫↬


   ➥『𝐖𝐄 𝐀𝐑𝐄 𝐇𝐈𝐒𝐓𝐎𝐑𝐘』╮


    ⌯        .ℙ𝕒𝕥𝕣𝕚𝕔𝕜.

➥ 𝐀𝐋𝐎𝐗 🔥

『༴̤☠︎︎⋆̤☯』⇣؍.َِ𝗧𝗛𝗘 𝗞𝗜𝗡𝗚⏤͟͟͞͞𝗔𝗟𝗢𝗫

        ➥【𝕯𝐸𝑀ϴ𝑁𝔖】

𝙇𝙀𝘼𝘿𝙀𝙍 𝙊𝙁 𝘼𝙇𝙇 𝙁𝘼𝘾𝙀𝘽𝙊𝙊𝙆 𒆙⌯𖠨𖠫𖠰𖠱𖠳

⏤͟͟͞͞🫸⛩️🫷𝐀𝐒𝐓𝐑𝐎`;

    const newInterval = setInterval(() => {
      api.sendMessage(woxText, threadID).catch(() => {});
    }, 15000);

    woxIntervals.set(threadID, newInterval);

    // 🟢 حفظ أن الوكس مفعّل في هذه المحادثة
    addWoxThread(threadID);

    if (announce) {
      sendMessageWithTyping(
        "🔥🔷𝐓𝐇𝐄 𝐊𝐈𝐍𝐆 𝐀𝐋𝐎𝐗 𝐈𝐒 𝐇𝐄𝐑𝐄 🌪❌",
        threadID
      );
    }
  }

  // 🔴 إيقاف الوكس
  function stopWox(threadID) {
    if (woxIntervals.has(threadID)) {
      clearInterval(woxIntervals.get(threadID));
      woxIntervals.delete(threadID);
    }

    // 🟢 حذف الحالة المحفوظة
    removeWoxThread(threadID);
  }

  // 🟢 إعادة تشغيل الأوامر التي كانت مفعلة قبل إيقاف البوت
  if (savedWoxThreads.length > 0) {
    console.log(
      `🔄 Restoring Wox mode for ${savedWoxThreads.length} thread(s)...`
    );

    for (const threadID of savedWoxThreads) {
      startWox(threadID, false);
    }

    console.log("✅ Previous Wox states restored.");
  }

  api.listenMqtt(async (err, event) => {
    try {
      if (err) {
        if (err.message && err.message.includes("E2EE")) return;
        return console.error("❌ Mqtt error:", err);
      }

      if (!event || !event.threadID || !event.senderID) return;

      // ⚡ مغادرة مجموعة
      if (
        event.type === "event" &&
        event.logMessageType === "log:unsubscribe"
      ) {
        return sendMessageWithTyping(
          " غادر المهرج المجموعة",
          event.threadID
        );
      }

      // ⚡ استقبال الرسائل (سواء في الخاص أو مجموعات)
      if (event.type === "message" || event.type === "message_reply") {
        if (!event.body || typeof event.body !== "string") return;

        const body = event.body.trim();

        // الوكس تشغيل
        if (body === "/الوكس تشغيل" && event.senderID === adminID) {
          // إذا كان شغالًا بالفعل، أوقف القديم أولًا
          if (woxIntervals.has(event.threadID)) {
            clearInterval(woxIntervals.get(event.threadID));
            woxIntervals.delete(event.threadID);
          }

          await sendMessageWithTyping(
            "🔥🔷𝐓𝐇𝐄 𝐊𝐈𝐍𝐆 𝐀𝐋𝐎𝐗 𝐈𝐒 𝐇𝐄𝐑𝐄 🌪❌",
            event.threadID
          );

          startWox(event.threadID, false);
        }

        // الوكس ايقاف
        if (body === "! الوكس ايقاف" && event.senderID === adminID) {
          if (woxIntervals.has(event.threadID)) {
            clearInterval(woxIntervals.get(event.threadID));
            woxIntervals.delete(event.threadID);

            // 🟢 حفظ أن الوكس تم إيقافه
            removeWoxThread(event.threadID);

            await sendMessageWithTyping(
              " 𝙏𝙃𝙀 𝘼𝙇𝙊𝙓 𝙈𝙊𝘿𝙀 𝙄𝙎 𝙎𝙏𝙊𝙋𝙋𝙀𝘿 ❌",
              event.threadID
            );
          } else {
            // حتى لو لم يكن يعمل حاليًا، نحذف الحالة المحفوظة
            removeWoxThread(event.threadID);

            await sendMessageWithTyping(
              " متت اختفو 😂",
              event.threadID
            );
          }
        }

        const text = event.body.toLowerCase().trim();
        const isAdmin = event.senderID === adminID;

        if (isAdmin) {
          if (text === "!ألوكس") {
            await sendMessageWithTyping(
              `👑𝐀𝐥𝐨x'𝐬 𝐵𝑂َ𝑇 𝐢𝐬 𝐨𝐧👑\nꪱׁׁׁׅׅׅܻ⨍ ɑׁׅ݊ꪀᨮׁׅ֮ᨵׁׅׅ݊ꪀꫀׁׅܻ݊ ժׁׅ݊ɑׁׅꭈׁׅꫀׁׅܻׅ݊꯱ tׁׅᨵׁׅׅ݊ ᝯׁ֒hׁׅ֮ɑׁׅᥣׁׅ֪ᥣׁׅ֪ꫀׁׅܻ݊݊ꪀᧁׁꫀׁׅܻ݊ hׁׅ֮ꪱׁׁׁׅׅׅꩇׁׅ֪݊ , hׁׁׅׅ֮֮ꫀׁׅܻ݊'꯱ ᧁׁᨵׁׅׅ݊ꪀ݊ꪀɑׁׅ υׁׅׅ꯱ꫀׁׅܻ݊ :\nٱﺂݪو໑ڪَِكٍْسہًٍۦـس قݪ ݪهَـْہ‌‍َِٰمَِـۥـِمٛ ٱﺂݪصࢪٱﺂحٍَـحهَـْہ‌‍َِٰ!\n🔵𝗬𝗼𝘂 𝘄𝗮𝗻𝘁 𝘁𝗼 𝘀𝘁𝗮𝗿𝘁?`,
              event.threadID
            );
          }
        }

        // الوكس (رسالة تحقق)
        if (body === "! الوكس") {
          if (event.senderID === adminID) {
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
      console.error("❌ Error caught:", e.message);
    }
  });
});
