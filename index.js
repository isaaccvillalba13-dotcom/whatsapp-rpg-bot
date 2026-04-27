import makeWASocket, { useMultiFileAuthState, DisconnectReason, Browsers } from '@whiskeysockets/baileys'
import pino from 'pino'

const NUMERO = '595993633752' // Tu número ya puesto

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Desktop'),
        printQRInTerminal: false
    })

    // Si no está registrado, pide el código de 8 dígitos
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            const code = await sock.requestPairingCode(NUMERO)
            console.log('\n===================================')
            console.log(`🔑 Código de vinculación: ${code}`)
            console.log('===================================')
            console.log('1. Abrí WhatsApp → Ajustes')
            console.log('2. Dispositivos vinculados → Vincular dispositivo')
            console.log('3. "Vincular con el número de teléfono"')
            console.log(`4. Ingresá el código: ${code}\n`)
        }, 3000)
    }

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update

        if (connection === 'open') {
            console.log('✅ Bot conectado a WhatsApp correctamente')
        } else if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut
            console.log('Conexión cerrada. Razón:', lastDisconnect?.error)
            if (shouldReconnect) {
                console.log('Reintentando conexión...')
                iniciarBot()
            } else {
                console.log('Sesión cerrada. Borra la carpeta auth_info y volvé a correr.')
            }
        }
    })

    // Escuchar mensajes
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message || msg.key.fromMe) return

        const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
        const remitente = msg.key.remoteJid

        console.log(`📩 ${remitente}: ${texto}`)

        // Comandos básicos de ejemplo
        if (texto.toLowerCase() === 'hola') {
            await sock.sendMessage(remitente, {
                text: 'Hola 👋 Soy tu bot. Estoy funcionando con pairing code.'
            })
        }

        if (texto.toLowerCase() === 'ping') {
            await sock.sendMessage(remitente, { text: 'pong 🏓' })
        }
    })
}

iniciarBot()
