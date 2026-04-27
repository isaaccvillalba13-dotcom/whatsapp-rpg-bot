const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
} = require("@whiskeysockets/baileys");

const pino = require("pino");

let pairingCodeUsed = false;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: "silent" }),
        browser: ["Ubuntu", "Chrome", "1.0.0"]
    });

    sock.ev.on("creds.update", saveCreds);

    // 🔑 SOLO UN CÓDIGO (no repetitivo)
    const phoneNumber = "595993633752";

    setTimeout(async () => {
        try {
            if (!sock.authState.creds.registered && !pairingCodeUsed) {
                pairingCodeUsed = true;

                const code = await sock.requestPairingCode(phoneNumber);

                console.log("\n🔐 CÓDIGO DE VINCULACIÓN (VÁLIDO 15 SEGUNDOS):");
                console.log(code);
                console.log("\n⏳ Tienes 15 segundos para vincularlo en WhatsApp...\n");

                // 🔥 bloquea regeneración
                setTimeout(() => {
                    console.log("⌛ Ventana de código cerrada");
                }, 15000);
            }
        } catch (err) {
            console.log("❌ Error generando código:", err);
        }
    }, 2000);

    // CONEXIÓN
    sock.ev.on("connection.update", (update) => {
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
    });

    // MENSAJES
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;

        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text;

        if (text === "!ping") {
            await sock.sendMessage(msg.key.remoteJid, { text: "🏓 Pong!" });
        }

        if (text === "!hola") {
            await sock.sendMessage(msg.key.remoteJid, { text: "👋 Hola, soy tu bot RPG" });
        }
    });
}

startBot();
