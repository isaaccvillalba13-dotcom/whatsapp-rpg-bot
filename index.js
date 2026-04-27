const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
} = require("@whiskeysockets/baileys");

const pino = require("pino");

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: "silent" }),
        browser: ["Ubuntu", "Chrome", "1.0.0"]
    });

    // Guardar credenciales
    sock.ev.on("creds.update", saveCreds);

    // 🔑 CÓDIGO DE VINCULACIÓN (8 dígitos)
    const phoneNumber = "595993633752";

    setTimeout(async () => {
        try {
            if (!sock.authState.creds.registered) {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log("\n🔐 TU CÓDIGO DE VINCULACIÓN:");
                console.log(code);
                console.log("\n👉 Ve a WhatsApp > Dispositivos vinculados > Vincular con código\n");
            }
        } catch (err) {
            console.log("❌ Error generando código:", err);
        }
    }, 3000);

    // Conexión
    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
            console.log("✅ Bot conectado correctamente a WhatsApp");
        }

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;

            console.log("❌ Conexión cerrada. Motivo:", reason);

            if (reason !== DisconnectReason.loggedOut) {
                console.log("🔄 Reconectando...");
                startBot();
            } else {
                console.log("⚠️ Sesión eliminada. Borra auth_info y vuelve a iniciar.");
            }
        }
    });

    // Mensajes
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;

        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text;

        if (!text) return;

        if (text === "!ping") {
            await sock.sendMessage(msg.key.remoteJid, { text: "🏓 Pong!" });
        }

        if (text === "!hola") {
            await sock.sendMessage(msg.key.remoteJid, { text: "👋 Hola, soy tu bot RPG" });
        }
    });
}

startBot();
