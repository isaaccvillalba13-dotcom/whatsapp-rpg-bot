const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const pino = require("pino");

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");

    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: "silent" }),
        browser: ["Ubuntu", "Chrome", "1.0.0"]
    });

    sock.ev.on("creds.update", saveCreds);

    const phoneNumber = "595993633752";

    // 🔑 IMPORTANTE: esperar conexión antes de pedir código
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
            console.log("✅ Bot conectado correctamente");
        }

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;

            console.log("❌ Conexión cerrada. Motivo:", reason);

            if (reason !== DisconnectReason.loggedOut) {
                startBot();
            } else {
                console.log("⚠️ Sesión inválida. Borra auth_info y reinicia.");
            }
        }

        // 🔥 AQUÍ se genera el código correctamente
        if (!sock.authState.creds.registered) {
            try {
                const code = await sock.requestPairingCode(phoneNumber);

                if (code) {
                    console.log("\n🔐 CÓDIGO DE VINCULACIÓN:");
                    console.log(code);
                    console.log("\n👉 Escríbelo en WhatsApp > Dispositivos vinculados\n");
                }
            } catch (err) {
                console.log("❌ No se pudo generar código:", err.message);
            }
        }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;

        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text;

        if (text === "!ping") {
            await sock.sendMessage(msg.key.remoteJid, { text: "🏓 Pong!" });
        }
    });
}

startBot();
