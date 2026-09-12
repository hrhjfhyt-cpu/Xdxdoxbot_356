const express = require("express");
const { login } = require("ws3-fca");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 8080;

// 1. تشغيل خادم الويب فوراً لضمان عدم ظهور خطأ الاستضافة
app.get("/", (req, res) => {
  res.send("Alox Bot Server is Running Online 🟢");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Web server listening on port ${PORT}`);
});

// 2. حماية العملية من السقوط نهائياً عند حدوث أي خطأ
process.on("uncaughtException", (err) => {
  console.error("⚠️ Uncaught Exception:", err.message || err);
});

process.on("unhandledRejection", (reason) => {
  console.error("⚠️ Unhandled Rejection:", reason);
});

// 3. تشغيل البوت داخل نطاق محمي
const adminID = "61581499031089";
let woxInterval = null;

function startBot() {
  if (!fs.existsSync("./appstate.json")) {
    console.error("❌ ملف appstate.json غير موجود!");
    return;
  }

  let appStateData;
  try {
    appStateData = JSON.parse(fs.readFileSync("./appstate.json", "utf8"));
  } catch (e) {
    console.error("❌ خطأ في قراءة ملف appstate.json:", e.message);
    return;
  }

  login({ appState: appStateData }, (err, api) => {
    if (err) {
      console.error("❌ فشل تسجيل الدخول:", err.errorDescription || err.message || err);
      return;
    }

    console.log("✅ Bot logged in successfully!");

    try {
      api.setOptions({
        listenEvents: true,
        selfListen: true,
        autoMarkDelivery: true,
        autoMarkRead: true
      });
    } catch (e) {}

    function safeSend(text, threadID) {
      if (!api || !threadID) return;
      api.sendMessage(text, threadID, (sendErr) => {
        if (sendErr) {
          console.error(`❌ خطأ في الإرسال إلى (${threadID}):`, sendErr.message || sendErr);
        } else {
          console.log(`📤 تم الإرسال بنجاح إلى (${threadID})`);
        }
      });
    }

    api.listenMqtt((mqttErr, event) => {
      try {
        if (mqttErr) return;
        if (!event || !event.threadID || !event.senderID) return;

        // مغادرة المجموعة
        if (event.type === "event" && event.logMessageType === "log:unsubscribe") {
          return safeSend("غادر المهرج المجموعة", event.threadID);
        }

        // الرسائل النصية
        if (event.type === "message" || event.type === "message_reply") {
          if (!event.body || typeof event.body !== "string") return;

          const body = event.body.trim();
          const sender = String(event.senderID).trim();
          const thread = String(event.threadID).trim();

          // تشغيل الوكس
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

          // إيقاف الوكس
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

          // التحقق
          if (body === "! الوكس" || body === "!الوكس") {
            if (sender === adminID) {
              return safeSend("انا هنا ! ", thread);
            }
            safeSend("ڪ│😂⇦𖤛🧞‍♂️┋ـسـ╾༺☄️༻╿ـمـ︻︽『🐉🈴』𒆙𒋨🔥🦅𒁂𒁎ـڪ ", thread);
          }
        }
      } catch (e) {
        console.error("❌ Error in listener:", e.message);
      }
    });
  });
}

startBot();

