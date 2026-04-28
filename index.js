globalThis.crypto = require('crypto').webcrypto

const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')
const pino = require('pino')
const fs = require('fs')

const logger = pino({ level: 'silent' })

// ★ TU NÚMERO (sin + ni espacios) ★
const OWNER_NUMBER = process.env.OWNER_NUMBER || '595993633752'

const DB_PATH = './database.json'
function loadDB() {
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({}))
  return JSON.parse(fs.readFileSync(DB_PATH))
}
function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

const rpgCommands = require('./commands/rpg')

async function conectarBot() {
    const { version } = await fetchLatestBaileysVersion()
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        printQRInTerminal: false,
        logger,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        markOnlineOnConnect: false,
        syncFullHistory: false
    })

    sock.ev.on('creds.update', saveCreds)

    // ★ CÓDIGO DE 8 DÍGITOS AUTOMÁTICO ★
    if (!sock.authState.creds.registered) {
        await new Promise(r => setTimeout(r, 15000))
        try {
            const code = await sock.requestPairingCode(OWNER_NUMBER)
            console.log('\n★━━━━━━━━━━━━━━━━━━━━━━★')
            console.log('  CÓDIGO DE VINCULACIÓN:')
            console.log(`       ${code}`)
            console.log('★━━━━━━━━━━━━━━━━━━━━━━★')
            console.log('WhatsApp → Dispositivos vinculados → Vincular con número\n')
        } catch (e) {
            console.log('❌ Error al generar código:', e.message)
            process.exit(1)
        }
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update

        if (connection === 'close') {
            const codigo = lastDisconnect?.error?.output?.statusCode
            const reconectar = codigo !== DisconnectReason.loggedOut
            if (reconectar) {
                console.log('🔄 Reconectando...')
                setTimeout(() => conectarBot(), 3000)
            } else {
                console.log('❌ Sesión cerrada. Borra auth_info y reinicia.')
                process.exit(0)
            }
        }

        if (connection === 'open') {
            console.log('✅ ★VĮŁŁĄŁƁĄ★ Bot conectado!')
        }
    })

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return
        const msg = messages[0]
        if (!msg.message || msg.key.fromMe) return

        // ★ SOLO GRUPOS ★
        const isGroup = msg.key.remoteJid.endsWith('@g.us')
        if (!isGroup) return

        const from = msg.key.remoteJid
        const sender = msg.key.participant || msg.key.remoteJid
        const senderNumber = sender.replace('@s.whatsapp.net', '')

        const body = msg.message?.conversation ||
                     msg.message?.extendedTextMessage?.text || ''

        if (!body.startsWith('.')) return

        const args = body.trim().split(' ')
        const command = args[0].toLowerCase()
        args.shift()

        const db = loadDB()
        const isOwner = senderNumber === OWNER_NUMBER
        const reply = (text) => sock.sendMessage(from, { text }, { quoted: msg })

        await rpgCommands({ command, args, sender, senderNumber, from, reply, db, saveDB, isOwner, msg, sock })
    })
}

conectarBot().catch(err => {
    console.error('❌ Error fatal:', err.message)
    process.exit(1)
})
