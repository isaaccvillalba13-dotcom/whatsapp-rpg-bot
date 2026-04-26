const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const pino = require("pino")
const qrcode = require("qrcode-terminal")

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth")

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: "silent" })
    })

    sock.ev.on("connection.update", ({ connection, qr }) => {
        if (qr) {
            qrcode.generate(qr, { small: true })
            console.log("Escanea este QR con WhatsApp")
        }

        if (connection === "open") {
            console.log("Bot conectado correctamente")
        }
    })

    sock.ev.on("creds.update", saveCreds)
}

startBot()
