module.exports = async ({ command, args, sender, senderNumber, reply, db, saveDB, isOwner }) => {

  // ════════════════════════════════
  // .rpg — REGISTRARSE
  // ════════════════════════════════
  if (command === '.rpg') {
    if (db[senderNumber]) {
      return reply('⚠️ Ya estás registrado en el RPG. Usa *.nivel* para ver tu progreso.')
    }

    if (args.length < 4) {
      return reply(
        '❌ Uso correcto:\n*.rpg <Nombre Apellido Edad Fecha>*\n\nEjemplo:\n.rpg Naruto Uzumaki 17 10/10/1999'
      )
    }

    const nombre = args[0]
    const apellido = args[1]
    const edad = args[2]
    const fecha = args[3]

    db[senderNumber] = {
      nombre,
      apellido,
      edad,
      fecha,
      nivel: 1,
      experiencia: 0,
      saldo: 500,
      personajes: [],
      personajePrincipal: null,
      mascotas: [],
      banco: 0,
      registrado: new Date().toLocaleDateString('es-ES')
    }

    saveDB(db)

    return reply(
      `╭─────◆\n` +
      `│✅ *¡Bienvenido al RPG, ${nombre}!*\n` +
      `│\n` +
      `│๛ Nombre: ${nombre} ${apellido}\n` +
      `│๛ Edad: ${edad}\n` +
      `│๛ Fecha: ${fecha}\n` +
      `│๛ Nivel: 1\n` +
      `│๛ Saldo inicial: 💰 500\n` +
      `│\n` +
      `│✨ ¡Tu aventura comienza ahora, héroe!\n` +
      `╰─────◆`
    )
  }

  // ════════════════════════════════
  // .nivel — VER PROGRESO
  // ════════════════════════════════
  if (command === '.nivel') {
    const user = db[senderNumber]
    if (!user) return reply('❌ No estás registrado. Usa *.rpg <Nombre Apellido Edad Fecha>*')

    const expNecesaria = user.nivel * 100
    const progreso = Math.floor((user.experiencia / expNecesaria) * 10)
    const barra = '█'.repeat(progreso) + '░'.repeat(10 - progreso)

    return reply(
      `╭─────◆\n` +
      `│🌟 *PROGRESO DE ${user.nombre.toUpperCase()}*\n` +
      `│\n` +
      `│๛ Nivel: ${user.nivel}\n` +
      `│๛ EXP: ${user.experiencia}/${expNecesaria}\n` +
      `│๛ [${barra}]\n` +
      `│๛ Saldo: 💰 ${user.saldo}\n` +
      `│๛ Banco: 🏦 ${user.banco}\n` +
      `│๛ Personajes: ${user.personajes.length}\n` +
      `│๛ Mascotas: ${user.mascotas.length}\n` +
      `╰─────◆`
    )
  }

  // ════════════════════════════════
  // .nivelper — VER PERSONAJE PRINCIPAL
  // ════════════════════════════════
  if (command === '.nivelper') {
    const user = db[senderNumber]
    if (!user) return reply('❌ No estás registrado.')
    if (!user.personajePrincipal) return reply('⚠️ No tienes personaje principal asignado. Visita la *.tiendaper*')

    const per = user.personajePrincipal
    return reply(
      `╭─────◆\n` +
      `│⚔️ *PERSONAJE PRINCIPAL*\n` +
      `│\n` +
      `│๛ Nombre: ${per.nombre}\n` +
      `│๛ Anime: ${per.anime}\n` +
      `│๛ Poder: ⚡ ${per.poder}\n` +
      `│๛ Rareza: ${per.rareza}\n` +
      `│๛ Victorias: ${per.victorias || 0}\n` +
      `╰─────◆`
    )
  }

  // ════════════════════════════════
  // .verpersonajes / .verper — VER TODOS LOS PERSONAJES
  // ════════════════════════════════
  if (command === '.verpersonajes' || command === '.verper') {
    const user = db[senderNumber]
    if (!user) return reply('❌ No estás registrado.')
    if (user.personajes.length === 0) return reply('⚠️ No tienes personajes. Visita la *.tiendaper*')

    let lista = `╭─────◆\n│🎭 *TUS PERSONAJES (${user.personajes.length})*\n│\n`
    user.personajes.forEach((p, i) => {
      const esPrincipal = user.personajePrincipal?.nombre === p.nombre ? ' ⭐' : ''
      lista += `│๛ ${i + 1}. ${p.nombre} [${p.anime}]${esPrincipal}\n`
      lista += `│   ⚡ Poder: ${p.poder} | ${p.rareza}\n`
    })
    lista += `╰─────◆`

    return reply(lista)
  }

  // ════════════════════════════════
  // .vermascotas / .vermas — VER MASCOTAS
  // ════════════════════════════════
  if (command === '.vermascotas' || command === '.vermas') {
    const user = db[senderNumber]
    if (!user) return reply('❌ No estás registrado.')
    if (user.mascotas.length === 0) return reply('⚠️ No tienes mascotas. Visita la *.tiendamascotas*')

    let lista = `╭─────◆\n│🐾 *TUS MASCOTAS (${user.mascotas.length})*\n│\n`
    user.mascotas.forEach((m, i) => {
      lista += `│๛ ${i + 1}. ${m.nombre} [${m.tipo}]\n`
      lista += `│   ❤️ Vida: ${m.vida} | ⚡ Fuerza: ${m.fuerza}\n`
    })
    lista += `╰─────◆`

    return reply(lista)
  }

  // ════════════════════════════════
  // .saldo — VER SALDO
  // ════════════════════════════════
  if (command === '.saldo') {
    const user = db[senderNumber]
    if (!user) return reply('❌ No estás registrado.')

    return reply(
      `╭─────◆\n` +
      `│💰 *SALDO DE ${user.nombre.toUpperCase()}*\n` +
      `│\n` +
      `│๛ Billetera: 💰 ${user.saldo} créditos\n` +
      `│๛ Banco: 🏦 ${user.banco} créditos\n` +
      `│๛ Total: ✨ ${user.saldo + user.banco} créditos\n` +
      `╰─────◆`
    )
  }

  // ════════════════════════════════
  // .menu — MENÚ PRINCIPAL
  // ════════════════════════════════
  if (command === '.menu' || command === '.help') {
    return reply(
      `★VĮŁŁĄŁƁĄ★ Bot — 𝙈𝙀𝙉𝙐 𝙍𝙋𝙂\n\n` +
      `𖠁𝙋𝙍𝙀𝙁𝙄𝙅𝙊𖠁\n` +
      `╭─────◆\n│๛ Prefijo actual: 『 . 』\n╰─────◆\n\n` +
      `𖠁𝙋𝙀𝙍𝙁𝙄𝙇𖠁\n` +
      `╭─────◆\n` +
      `│๛ .rpg <Nombre Apellido Edad Fecha>\n` +
      `│๛ .nivel\n` +
      `│๛ .nivelper\n` +
      `│๛ .verpersonajes\n` +
      `│๛ .vermascotas\n` +
      `│๛ .saldo\n` +
      `╰─────◆\n\n` +
      `✨ ¡Más comandos próximamente, héroe!`
    )
  }
}
