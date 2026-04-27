import makeWASocket, { useMultiFileAuthState, DisconnectReason, Browsers } from '@whiskeysockets/baileys'
import pino from 'pino'

const NUMERO = '595993633752'
let codigoGenerado = false // Flag para que solo se genere 1 vez

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Desktop'),
        printQRInTerminal: false,
        // Aumenta el tiempo de espera de conexión
        connectTimeoutMs: 60000
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update

        // Solo pedir código si NO está registrado Y NO se generó ya
        if (connection === 'connecting' &&!sock.authState.creds.registered &&!codigoGenerado) {
            codigoGenerado = true // Marco que ya se pidió

            console.log('⏳ Esperando 15 segundos antes de generar el código...')

            setTimeout(async () => {
                try {
                    const code = await sock.requestPairingCode(NUMERO)
                    console.log('\n===================================')
                    console.log(`🔑 Código de vinculación: ${code}`)
                    console.log('===================================')
                    console.log('Tenés 20 min para usarlo antes que expire.')
                    console.log('WhatsApp → Ajustes → Dispositivos vinculados')
                    console.log('Vincular con el número de teléfono → Ingresá el código\n')
                } catch (error) {
                    console.log('❌ Error generando código:', error.message)
                    console.log('Borra la carpeta auth_info e intenta de nuevo.')
                    codigoGenerado = false // Reseteo si falla
                }
            }, 15000) // 15 segundos de espera
        }

        if (connection === 'open') {
            console.log('✅ Bot conectado a WhatsApp correctamente')
            codigoGenerado = false // Reseteo para próximas conexiones
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode
            const shouldReconnect = statusCode!== DisconnectReason.loggedOut

            console.log('Conexión cerrada. Código:', statusCode)

            if (shouldReconnect) {
                console.log('Reintentando conexión en 5 segundos...')
                setTimeout(() => iniciarBot(), 5000)
            } else {
                console.log('Sesión cerrada. Borra la carpeta auth_info y volvé a correr.')
                codigoGenerado = false
            }
        }
    })

    // Responder mensajes
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message || msg.key.fromMe) return

        const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
        const remitente = msg.key.remoteJid

        if (texto.toLowerCase() === 'hola') {
            await sock.sendMessage(remitente, {
                text: 'Hola 👋 Bot activo. Código de 8 dígitos funcionando.'
            })
        }
    })
}

iniciarBot()
