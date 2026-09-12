const express = require("express");
const { login } = require("ws3-fca");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 8080;

// ===============================
// إعدادات البوت
// ===============================

const ADMIN_ID = "61593590627474";

let api = null;
let woxInterval = null;
let reconnectTimer = null;
let isStarting = false;

// ===============================
// Web Server
// ===============================

app.get("/", (req, res) => {
  res.status(200).send("Alox Bot Server is Running Online 🟢");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    online: true,
    botLoggedIn: !!api,
    woxRunning: !!woxInterval
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Web server listening on port ${PORT}`);
});

// ===============================
// منع سقوط السيرفر
// ===============================

process.on("uncaughtException", (err) => {
  console.error(
    "⚠️ Uncaught Exception:",
    err && (err.stack || err.message || err)
  );
});

process.on("unhandledRejection", (reason) => {
  console.error("⚠️ Unhandled Rejection:", reason);
});

// ===============================
// إرسال آمن
// ===============================

function safeSend(text, threadID) {
  if (!api) {
    console.error("❌ لا يمكن الإرسال: البوت غير متصل");
    return;
  }

  if (!threadID) {
    console.error("❌ لا يوجد threadID للإرسال");
    return;
  }

  try {
    api.sendMessage(String(text), String(threadID), (err) => {
      if (err) {
        console.error(
          "❌ خطأ في الإرسال:",
          err && (err.message || err)
        );
        return;
      }

      console.log(`📤 تم الإرسال إلى ${threadID}`);
    });
  } catch (err) {
    console.error(
      "❌ Exception أثناء الإرسال:",
      err && (err.message || err)
    );
  }
}

// ===============================
// إيقاف الوكس
// ===============================

function stopWox() {
  if (woxInterval) {
    clearInterval(woxInterval);
    woxInterval = null;
    console.log("🛑 Wox interval stopped");
  }
}

// ===============================
// تشغيل البوت
// ===============================

function startBot() {
  if (isStarting) {
    console.log("⏳ البوت يحاول الاتصال بالفعل...");
    return;
  }

  isStarting = true;

  // --------------------------------
  // التحقق من appstate
  // --------------------------------

  if (!fs.existsSync("./appstate.json")) {
    console.error("❌ appstate.json غير موجود!");
    isStarting = false;
    return;
  }

  let appStateData;

  try {
    const raw = fs.readFileSync("./appstate.json", "utf8");

    if (!raw.trim()) {
      throw new Error("appstate.json فارغ");
    }

    appStateData = JSON.parse(raw);

    if (!Array.isArray(appStateData)) {
      throw new Error("appstate.json يجب أن يكون Array");
    }

  } catch (err) {
    console.error(
      "❌ خطأ في appstate.json:",
      err.message || err
    );

    isStarting = false;
    return;
  }

  console.log("🔄 جاري تسجيل دخول البوت...");

  // --------------------------------
  // Login
  // --------------------------------

  login(
    {
      appState: appStateData
    },
    (err, loggedApi) => {

      isStarting = false;

      if (err) {
        api = null;

        console.error(
          "❌ فشل تسجيل الدخول:",
          err.errorDescription ||
          err.message ||
          err
        );

        scheduleReconnect();
        return;
      }

      api = loggedApi;

      console.log("✅ Bot logged in successfully!");
      console.log(`👑 Admin ID: ${ADMIN_ID}`);

      // --------------------------------
      // Options
      // --------------------------------

      try {
        api.setOptions({
          listenEvents: true,
          selfListen: true,
          autoMarkDelivery: true,
          autoMarkRead: true
        });

        console.log("✅ API options configured");
      } catch (err) {
        console.error(
          "⚠️ setOptions error:",
          err.message || err
        );
      }

      // --------------------------------
      // Listener
      // --------------------------------

      try {
        api.listenMqtt((mqttErr, event) => {

          if (mqttErr) {
            console.error(
              "⚠️ MQTT error:",
              mqttErr.message || mqttErr
            );

            api = null;
            stopWox();
            scheduleReconnect();

            return;
          }

          try {

            if (!event) {
              return;
            }

            if (!event.threadID) {
              return;
            }

            if (!event.senderID) {
              return;
            }

            const thread = String(event.threadID).trim();
            const sender = String(event.senderID).trim();

            // ==========================================
            // مغادرة المجموعة
            // ==========================================

            if (
              event.type === "event" &&
              event.logMessageType === "log:unsubscribe"
            ) {
              safeSend(
                "غادر المهرج المجموعة",
                thread
              );

              return;
            }

            // ==========================================
            // الرسائل
            // ==========================================

            if (
              event.type !== "message" &&
              event.type !== "message_reply"
            ) {
              return;
            }

            if (
              typeof event.body !== "string"
            ) {
              return;
            }

            const body = event.body.trim();

            console.log(
              `📩 Message | sender=${sender} | thread=${thread} | body=${body}`
            );

            // ==========================================
            // تشغيل الوكس
            // ==========================================

            if (
              (
                body === "! الوكس قل لهم الصراحة" ||
                body === "!الوكس قل لهم الصراحة" ||
                body === "/up" ||
                body === "up"
              ) &&
              sender === ADMIN_ID
            ) {

              stopWox();

              safeSend(
                "🔥🔷𝐓𝐇𝐄 𝐊𝐈𝐍𝐆 𝐀𝐋𝐎𝐗 𝐈𝐒 𝐇𝐄𝐑𝐄 🌪❌",
                thread
              );

              const woxText =
`𝐊𝐃⃢⏤͟͟͞͞︴💦︴𝐁𝐑⃢⏤͟͟͞͞︴💦︴ 𝐎𝐊⃢⏤͟͟͞͞︴💦︴ 𝐊𝐎⃢⏤͟͟͞͞︴💦︴ 𝐑𝐀⃢⏤͟͟͞͞︴💦︴ 𝐃𝐃⃢⏤͟͟͞͞︴💦︴ 𝐑𝐎⃢⏤͟͟͞͞︴💦︴ 𝐓𝐀⃢⏤͟͟͞͞︴💦︴ 𝐒𝐇⃢⏤͟͟͞͞︴💦︴ 𝐋𝐃⃢⏤͟͟͞͞︴💦︴

𝑵⃟𝑮⏤͟͟͞͞┆🎴 ︴𝑯𝑲⃟⏤͟͟͞͞┆ 🎴︴ 𝑶𝑬⃟⏤͟͟͞͞┆ 🎴︴𝑹𝑻⃟⏤͟͟͞͞┆🎴 ︴ 𝑩𝑫⃟⏤͟͟͞͞┆🎴 ︴ 𝑫𝑳⃟⏤͟͟͞͞┆ 🎴︴ 𝑫𝑲⃟⏤͟͟͞͞┆🎴 ︴ 𝒁𝑴⃟⏤͟͟͞͞┆🎴 ︴

𝗠𝗔𝗬𝗕𝗘 𝗬𝗢𝗨'𝗟𝗟 𝗦𝗛𝗢𝗪 𝗦𝗢𝗠𝗘 𝗥𝗘𝗦𝗣𝗘𝗖𝗧 𝗧𝗢 𝗨𝗥 𝗟𝗘𝗔𝗗𝗘𝗥 ࿐ 𝕬𝕷𝕆𝑿 ⸔🔷`;

              woxInterval = setInterval(() => {
                safeSend(woxText, thread);
              }, 25000);

              console.log("🔥 Wox started");

              return;
            }

            // ==========================================
            // إيقاف الوكس
            // ==========================================

            if (
              (
                body === "! الوكس ايقاف" ||
                body === "!الوكس ايقاف" ||
                body === "/stop" ||
                body === "stop"
              ) &&
              sender === ADMIN_ID
            ) {

              if (woxInterval) {

                stopWox();

                safeSend(
                  "𝙏𝙃𝙀 𝘼𝙇𝙊𝙓 𝙈𝙊𝘿𝙀 𝙄𝙎 𝙎𝙏𝙊𝙋𝙋𝙀𝘿 ❌",
                  thread
                );

              } else {

                safeSend(
                  "متت اختفو 😂",
                  thread
                );

              }

              return;
            }

            // ==========================================
            // التحقق
            // ==========================================

            if (
              body === "! الوكس" ||
              body === "!الوكس"
            ) {

              if (sender === ADMIN_ID) {

                safeSend(
                  "انا هنا !",
                  thread
                );

              } else {

                safeSend(
                  "ڪ│😂⇦𖤛🧞‍♂️┋ـسـ╾༺☄️༻╿ـمـ︻︽『🐉🈴』𒆙𒋨🔥🦅𒁂𒁎ـڪ",
                  thread
                );

              }

              return;
            }

          } catch (err) {

            console.error(
              "❌ Listener error:",
              err && (err.stack || err.message || err)
            );

          }

        });

        console.log("👂 MQTT listener started");

      } catch (err) {

        console.error(
          "❌ Failed to start MQTT listener:",
          err.message || err
        );

        api = null;
        stopWox();
        scheduleReconnect();
      }
    }
  );
}

// ===============================
// إعادة الاتصال
// ===============================

function scheduleReconnect() {

  if (reconnectTimer) {
    return;
  }

  console.log("🔄 سيتم إعادة محاولة الاتصال بعد 10 ثواني...");

  reconnectTimer = setTimeout(() => {

    reconnectTimer = null;

    startBot();

  }, 10000);
}

// ===============================
// تشغيل أولي
// ===============================

startBot();
