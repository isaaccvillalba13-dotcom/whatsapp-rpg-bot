const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const pino = require("pino");

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: "silent" }),
        browser: ["Ubuntu", "Chrome", "1.0.0"]
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log("📲 ESCANEA ESTE QR:");
            console.log(qr);
        }

        if (connection === "open") {
            console.log("✅ CONECTADO A WHATSAPP");
        }

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;

            console.log("❌ Conexión cerrada. Motivo:", reason);

            if (reason !== DisconnectReason.loggedOut) {
                setTimeout(() => startBot(), 3000); // evita loop rápido
            } else {
                console.log("⚠️ Sesión inválida. Borra auth_info y vuelve a iniciar.");
            }
        }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (text === "!ping") {
            await sock.sendMessage(msg.key.remoteJid, { text: "🏓 Pong!" });
        }
    });
}

startBot();
