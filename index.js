const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const pino = require('pino')

// ─── Estado del juego por grupo ───────────────────────────────────────────────
const partidas = {}

const clases = {
  guerrero: { hp: 120, atk: 20, def: 10, emoji: '⚔️' },
  mago:     { hp: 80,  atk: 35, def: 5,  emoji: '🧙' },
  arquero:  { hp: 100, atk: 25, def: 8,  emoji: '🏹' },
}

// ─── Lógica RPG ───────────────────────────────────────────────────────────────
function crearJugador(nombre, clase) {
  const base = clases[clase]
  if (!base) return null
  return {
    nombre,
    clase,
    emoji: base.emoji,
    hp: base.hp,
    maxHp: base.hp,
    atk: base.atk,
    def: base.def,
    vivo: true,
  }
}

function atacar(atacante, defensor) {
  const daño = Math.max(1, atacante.atk - defensor.def + Math.floor(Math.random() * 10))
  defensor.hp -= daño
  if (defensor.hp <= 0) {
    defensor.hp = 0
    defensor.vivo = false
  }
  return daño
}

function estadoJugador(j) {
  const barra = '█'.repeat(Math.round((j.hp / j.maxHp) * 10)) + '░'.repeat(10 - Math.round((j.hp / j.maxHp) * 10))
  return `${j.emoji} *${j.nombre}* (${j.clase})\nHP: [${barra}] ${j.hp}/${j.maxHp}`
}

// ─── Comandos ─────────────────────────────────────────────────────────────────
async function manejarComando(sock, msg, grupoId, autorId, autorNombre, texto) {
  const args = texto.trim().split(' ')
  const cmd = args[0].toLowerCase()

  if (!partidas[grupoId]) {
    partidas[grupoId] = { jugadores: {}, activa: false }
  }
  const partida = partidas[grupoId]

  const reply = (text) => sock.sendMessage(grupoId, { text }, { quoted: msg })

  switch (cmd) {
    case '!rpg':
      await reply(
        `🎮 *Bot RPG de WhatsApp*\n\n` +
        `Comandos disponibles:\n` +
        `• *!unirse [clase]* — Únete a la partida\n` +
        `  Clases: guerrero ⚔️, mago 🧙, arquero 🏹\n` +
        `• *!iniciar* — Inicia la partida (mín. 2 jugadores)\n` +
        `• *!atacar [@jugador]* — Ataca a otro jugador\n` +
        `• *!estado* — Ver HP de todos\n` +
        `• *!salir* — Abandonar la partida`
      )
      break

    case '!unirse': {
      if (partida.activa) return reply('❌ Ya hay una partida en curso.')
      if (partida.jugadores[autorId]) return reply('⚠️ Ya estás en la partida.')
      const clase = args[1]?.toLowerCase()
      const jugador = crearJugador(autorNombre, clase)
      if (!jugador) return reply('❌ Clase inválida. Elige: *guerrero*, *mago* o *arquero*')
      partida.jugadores[autorId] = jugador
      await reply(`✅ *${autorNombre}* se unió como *${clase} ${jugador.emoji}*\nEspera que alguien use *!iniciar*`)
      break
    }

    case '!iniciar': {
      if (partida.activa) return reply('❌ Ya hay una partida activa.')
      const jugadores = Object.values(partida.jugadores)
      if (jugadores.length < 2) return reply('⚠️ Se necesitan al menos 2 jugadores.')
      partida.activa = true
      const lista = jugadores.map(j => `${j.emoji} ${j.nombre} (${j.clase})`).join('\n')
      await reply(`⚔️ *¡La partida ha comenzado!*\n\n*Jugadores:*\n${lista}\n\nUsa *!atacar @jugador* para atacar`)
      break
    }

    case '!atacar': {
      if (!partida.activa) return reply('❌ No hay partida activa. Usa *!iniciar*')
      const atacante = partida.jugadores[autorId]
      if (!atacante) return reply('❌ No estás en la partida.')
      if (!atacante.vivo) return reply('💀 Estás eliminado, no puedes atacar.')

      const mencionado = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      if (!mencionado) return reply('⚠️ Menciona a quién atacar. Ej: *!atacar @jugador*')
      if (mencionado === autorId) return reply('🤔 No puedes atacarte a ti mismo.')
      const defensor = partida.jugadores[mencionado]
      if (!defensor) return reply('❌ Ese jugador no está en la partida.')
      if (!defensor.vivo) return reply('💀 Ese jugador ya está eliminado.')

      const daño = atacar(atacante, defensor)
      let resultado = `⚔️ *${atacante.nombre}* atacó a *${defensor.nombre}* causando *${daño} de daño*!\n\n${estadoJugador(defensor)}`

      if (!defensor.vivo) {
        resultado += `\n\n💀 *${defensor.nombre}* ha sido eliminado!`
        const vivos = Object.values(partida.jugadores).filter(j => j.vivo)
        if (vivos.length === 1) {
          resultado += `\n\n🏆 *¡${vivos[0].nombre} gana la partida!* 🎉`
          partidas[grupoId] = { jugadores: {}, activa: false }
        }
      }
      await reply(resultado)
      break
    }

    case '!estado': {
      if (!partida.activa && Object.keys(partida.jugadores).length === 0)
        return reply('❌ No hay partida. Usa *!unirse [clase]* para empezar.')
      const lista = Object.values(partida.jugadores).map(estadoJugador).join('\n\n')
      await reply(`📊 *Estado de la partida:*\n\n${lista}`)
      break
    }

    case '!salir': {
      if (!partida.jugadores[autorId]) return reply('⚠️ No estás en ninguna partida.')
      const nombre = partida.jugadores[autorId].nombre
      delete partida.jugadores[autorId]
      await reply(`👋 *${nombre}* abandonó la partida.`)
      if (Object.keys(partida.jugadores).length < 2) {
        partida.activa = false
      }
      break
    }
  }
}

// ─── Conexión WhatsApp ────────────────────────────────────────────────────────
async function conectar() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
  })

  // Vinculación automática con número desde variable de entorno
  if (!sock.authState.creds.registered) {
    const numero = process.env.PHONE_NUMBER
    if (!numero) {
      console.error('❌ Falta la variable de entorno PHONE_NUMBER')
      process.exit(1)
    }
    setTimeout(async () => {
      try {
        const codigo = await sock.requestPairingCode(numero)
        console.log(`\n🔑 Tu código de vinculación: ${codigo}`)
        console.log('👉 Abre WhatsApp → Dispositivos vinculados → Vincular con número\n')
      } catch (e) {
        console.error('❌ Error al obtener código:', e.message)
      }
    }, 3000)
  }

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') console.log('✅ Bot conectado a WhatsApp')
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      if (shouldReconnect) {
        console.log('🔄 Reconectando...')
        conectar()
      }
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const grupoId = msg.key.remoteJid
    if (!grupoId.endsWith('@g.us')) return

    const autorId = msg.key.participant
    const autorNombre = msg.pushName || 'Jugador'
    const texto =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text || ''

    if (texto.startsWith('!')) {
      await manejarComando(sock, msg, grupoId, autorId, autorNombre, texto)
    }
  })
}

conectar()
