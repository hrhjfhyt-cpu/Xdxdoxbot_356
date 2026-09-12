const { login } = require("ws3-fca");
const fs = require("fs");

// 🛡️ حماية السيرفر والداشبورد من الكراش عند حدوث أي خطأ غير متوقع
process.on("uncaughtException", (err) => {
  console.error("⚠️ خطأ تم اعتراضه لمنع توقف السيرفر:", err.message);
});

process.on("unhandledRejection", (reason) => {
  console.error("⚠️ Promise رفض غير معالج:", reason);
});

login({ appState: JSON.parse(fs.readFileSync("./appstate.json", "utf8")) }, (err, api) => {
  if (err) return console.error("❌ فشل تسجيل الدخول:", err);
  console.log("✅ Bot is running...");

  api.setOptions({ 
    listenEvents: true, 
    selfListen: true, 
    autoMarkDelivery: true, 
    autoMarkRead: true 
  });

  let woxInterval = null;
  const adminID = "61593590627474";

  // دالة إرسال آمنة
  function safeSend(text, threadID) {
    if (!api || !threadID) return;
    api.sendMessage(text, threadID, (sendErr) => {
      if (sendErr) {
        console.error(`❌ خطأ الإرسال (${threadID}):`, sendErr.message || sendErr);
      } else {
        console.log(`📤 تم الإرسال بنجاح إلى (${threadID})`);
      }
    });
  }

  // دالة تعليم كمقروء آمنة تماماً بدون كراش
  function markReadSafe(threadID) {
    try {
      if (api && typeof api.markAsRead === "function") {
        api.markAsRead(threadID, () => {});
      }
    } catch (e) {
      // إخفاء الخطأ لعدم إيقاف السكربت
    }
  }

  api.listenMqtt((err, event) => {
    try {
      if (err) return console.error("❌ MQTT Error:", err);
      if (!event || !event.threadID || !event.senderID) return;

      // تعليم الرسالة كمقروءة فور وصولها
      markReadSafe(event.threadID);

      // مغادرة شخص
      if (event.type === "event" && event.logMessageType === "log:unsubscribe") {
        return safeSend("غادر المهرج المجموعة", event.threadID);
      }

      // الرسائل النصية
      if (event.type === "message" || event.type === "message_reply") {
        if (!event.body || typeof event.body !== "string") return;

        const body = event.body.trim();
        const sender = String(event.senderID).trim();
        const thread = String(event.threadID).trim();

        // 1. تشغيل الوكس
        if (
          (body === "! الوكس قل لهم الصراحة" || body === "!الوكس قل لهم الصراحة" || body === "/up" || body === "up") &&
          sender === adminID
        ) {
          if (woxInterval) clearInterval(woxInterval);

          safeSend("🔥🔷𝐓𝐇𝐄 𝐊𝐈𝐍𝐆 𝐀𝐋𝐎𝐗 𝐈𝐒 𝐇𝐄𝐑𝐄 🌪❌", thread);

          const woxText = `𝐊𝐃⃢⏤͟͟͞͞︴💦︴𝐁𝐑⃢⏤͟͟͞͞︴💦︴ 𝐎𝐊⃢⏤͟͟͞͞︴💦︴ 𝐊𝐎⃢⏤͟͟͞͞︴💦︴ 𝐑𝐀⃢⏤͟͟͞͞︴💦︴ 𝐃𝐃⃢⏤͟͟͞͞︴💦︴ 𝐑𝐎⃢⏤͟͟͞͞︴💦︴ 𝐓𝐀⃢⏤͟͟͞͞︴💦︴ 𝐒𝐇⃢⏤͟͟͞͞︴💦︴ 𝐋𝐃⃢⏤͟͟͞͞︴💦︴\n\n𝑵⃟𝑮⏤͟͟͞͞┆🎴 ︴𝑯𝑲⃟⏤͟͟͞͞┆ 🎴︴ 𝑶𝑬⃟⏤͟͟͞͞┆ 🎴︴𝑹𝑻⃟⏤͟͟͞͞┆🎴 ︴ 𝑩𝑫⃟⏤͟͟͞͞┆🎴 ︴ 𝑫𝑳⃟⏤͟͟͞͞┆ 🎴︴ 𝑫𝑲⃟⏤͟͟͞͞┆🎴 ︴ 𝒁𝑴⃟⏤͟͟͞͞┆🎴 ︴\n\n𝗠𝗔𝗬𝗕𝗘 𝗬𝗢𝗨'𝗟𝗟 𝗦𝗛𝗢𝗪 𝗦𝗢𝗠𝗘 𝗥𝗘𝗦𝗣𝗘𝗖𝗧 𝗧𝗢 𝗨𝗥 𝗟𝗘𝗔𝗗𝗘𝗥 ࿐ 𝕬𝕷𝕆𝑿 ⸔🔷`;

          woxInterval = setInterval(() => {
            safeSend(woxText, thread);
          }, 25000);
        }

        // 2. إيقاف الوكس
        if (
          (body === "! الوكس ايقاف" || body === "!الوكس ايقاف" || body === "/stop" || body === "stop") &&
          sender === adminID
        ) {
          if (woxInterval) {
            clearInterval(woxInterval);
            woxInterval = null;
            safeSend("𝙏𝙃𝙀 𝘼𝙇𝙊𝙓 𝙈𝙊𝘿𝙀 𝙄𝙎 𝙎𝙏𝙊𝙋𝙋𝙀𝘿 ❌", thread);
          } else {
            safeSend("متت اختفو 😂", thread);
          }
        }

        // 3. رسالة التحقق
        if (body === "! الوكس" || body === "!الوكس") {
          if (sender === adminID) {
            return safeSend("انا هنا ! ", thread);
          }
          safeSend("ڪ│😂⇦𖤛🧞‍♂️┋ـسـ╾༺☄️༻╿ـمـ︻︽『🐉🈴』𒆙𒋨🔥🦅𒁂𒁎ـڪ ", thread);
        }
      }

    } catch (e) {
      console.error("❌ Error caught inside listener:", e.message);
    }
  });
});

