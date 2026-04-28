const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const pino = require('pino')
const fs = require('fs')

const OWNER_NUMBER = '595993633752' // Tu número sin + ni espacios

const DB_PATH = './database.json'
function loadDB() {
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({}))
  return JSON.parse(fs.readFileSync(DB_PATH))
}
function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

const rpgCommands = require('./commands/rpg')

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth')

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' })
  })

  // ★ SOLICITAR CÓDIGO DE 8 DÍGITOS ★
  if (!sock.authState.creds.registered) {
    await new Promise(r => setTimeout(r, 3000))
    const code = await sock.requestPairingCode(OWNER_NUMBER)
    console.log('\n★━━━━━━━━━━━━━━━━━━━━━━★')
    console.log('  CÓDIGO DE VINCULACIÓN:')
    console.log(`       ${code}`)
    console.log('★━━━━━━━━━━━━━━━━━━━━━━★')
    console.log('WhatsApp → Dispositivos vinculados → Vincular con número\n')
  }

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      if (shouldReconnect) {
        console.log('Reconectando...')
        startBot()
      } else {
        console.log('Sesión cerrada. Borra la carpeta /auth y reinicia.')
      }
    }

    if (connection === 'open') {
      console.log('✅ ★VĮŁŁĄŁƁĄ★ Bot conectado!')
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message) return

    const isGroup = msg.key.remoteJid.endsWith('@g.us')
    if (!isGroup) return

    const from = msg.key.remoteJid
    const sender = msg.key.participant || msg.key.remoteJid
    const senderNumber = sender.replace('@s.whatsapp.net', '')

    const body = msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption || ''

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

startBot()
