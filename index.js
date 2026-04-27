const { Client, LocalAuth } = require("whatsapp-web.js");

// ============================================================
//  NÃºmero de telÃ©fono para vinculaciÃ³n (cÃ³digo de paÃ­s + nÃºmero)
// ============================================================
const PHONE_NUMBER = "595993633752";

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
    ],
  },
});

// â”€â”€ Eventos de estado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
client.on("loading_screen", (percent, message) => {
  console.log(`â³ Cargando... ${percent}% â€” ${message}`);
});

client.on("auth_failure", (msg) => {
  console.error("âŒ Error de autenticaciÃ³n:", msg);
});

// â”€â”€ Solicitar cÃ³digo de vinculaciÃ³n de 8 dÃ­gitos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
client.on("qr", async () => {
  try {
    const code = await client.requestPairingCode(PHONE_NUMBER);
    console.log("\nâ•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—");
    console.log("â•‘  CÃ“DIGO DE VINCULACIÃ“N (8 dÃ­g.)  â•‘");
    console.log(`â•‘           ${code}           â•‘`);
    console.log("â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•");
    console.log("\nðŸ“± Pasos en WhatsApp:");
    console.log("   1. Abre WhatsApp en tu telÃ©fono");
    console.log("   2. Ve a Dispositivos vinculados");
    console.log("   3. Toca Â«Vincular con nÃºmero de telÃ©fonoÂ»");
    console.log("   4. Ingresa el cÃ³digo de arriba\n");
  } catch (err) {
    console.error("âŒ Error al solicitar cÃ³digo:", err.message);
  }
});

// â”€â”€ Bot listo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
client.on("ready", () => {
  console.log("âœ… Â¡Bot conectado y listo para recibir mensajes!");
});

// â”€â”€ Manejo de mensajes entrantes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
client.on("message", async (msg) => {
  const body = msg.body.toLowerCase().trim();

  console.log(`ðŸ“¨ [${msg.from}]: ${msg.body}`);

  // Hola
  if (["hola", "hi", "hello", "buenas", "buen dÃ­a", "buen dia"].includes(body)) {
    await msg.reply(
      "ðŸ‘‹ Â¡Hola! Soy un bot de WhatsApp.\n\n" +
      "Escribe *!ayuda* para ver todos los comandos disponibles."
    );
    return;
  }

  // Ayuda
  if (body === "!ayuda" || body === "!help") {
    await msg.reply(
      "ðŸ“‹ *Comandos disponibles:*\n\n" +
      "â€¢ *hola* â€” Saludo\n" +
      "â€¢ *!ayuda* â€” Ver este menÃº\n" +
      "â€¢ *!hora* â€” Ver la hora actual en Paraguay\n" +
      "â€¢ *!ping* â€” Verificar que el bot estÃ¡ activo\n" +
      "â€¢ *!info* â€” InformaciÃ³n del bot\n\n" +
      "_Puedes agregar mÃ¡s comandos en index.js_"
    );
    return;
  }

  // Hora actual (zona horaria Paraguay)
  if (body === "!hora" || body === "!time") {
    const now = new Date().toLocaleString("es-PY", {
      timeZone: "America/Asuncion",
      dateStyle: "full",
      timeStyle: "short",
    });
    await msg.reply(`ðŸ• Fecha y hora en Paraguay:\n*${now}*`);
    return;
  }

  // Ping
  if (body === "!ping") {
    await msg.reply("ðŸ“ Â¡Pong! El bot estÃ¡ activo y funcionando.");
    return;
  }

  // Info
  if (body === "!info") {
    await msg.reply(
      "ðŸ¤– *InformaciÃ³n del Bot*\n\n" +
      "â€¢ Plataforma: whatsapp-web.js\n" +
      "â€¢ Hospedaje: Railway\n" +
      "â€¢ Estado: âœ… En lÃ­nea\n\n" +
      "Escribe *!ayuda* para ver los comandos."
    );
    return;
  }

  // â”€â”€ Agrega mÃ¡s comandos aquÃ­ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // if (body === "!tucomando") {
  //   await msg.reply("Tu respuesta aquÃ­");
  //   return;
  // }
});

// â”€â”€ Iniciar el bot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log("ðŸš€ Iniciando bot de WhatsApp...");
console.log(`ðŸ“ž NÃºmero configurado: +${PHONE_NUMBER}\n`);
client.initialize();
