/*
  api.js — Kuki CompuCell
  Llama al backend real (Google Apps Script + OpenRouter/DeepSeek +
  Google Sheets de solo lectura — ver backend/apps-script/) y adapta su
  respuesta a la forma que espera chat.js: { text, products, whatsapp }.

  Decisión de comunicación (ver backend/apps-script/README.md para el
  detalle completo y las fuentes): fetch GET directo desde GitHub Pages
  al Web App de Apps Script, sin backend intermediario. GET es una
  solicitud "simple" de CORS (no dispara preflight), así que no choca
  con la limitación conocida de Apps Script de no poder responder un
  preflight de OPTIONS. No se usa POST en ningún punto de esta app.

  El texto final que ve el cliente lo compone el modelo de IA en el
  backend (español, amable, orientado a ayudar a comprar) a partir de
  resultados REALES de la hoja — este archivo nunca inventa ni
  completa precios/existencias por su cuenta.

  Requisito 11 (no usar el frontend como fuente permanente de verdad
  para precios): esta función no cachea resultados en localStorage ni
  en ningún archivo — cada consulta pide datos frescos al backend.
*/

// TODO: pega aquí la URL de tu Web App de Apps Script ya desplegado
// (Implementación > Administrar implementaciones > URL de la app web;
// termina en "/exec"). Mientras quede vacío, el chat mostrará un aviso
// claro en vez de fallar en silencio o mostrar datos inventados.
export const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzjvoQdpV32KzNDdMF4QUEN9_XBRnnnC19j6YUo-mfTKmk6-mhdmroiZ4Si0Bci_xSvVg/exec";

function buildChatUrl(rawMessage) {
  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set("action", "chat");
  url.searchParams.set("message", rawMessage);
  return url.toString();
}

/**
 * @param {string} rawMessage
 * @returns {Promise<{text:string[], products:object[], whatsapp:boolean}>}
 *   Resuelve con una respuesta normal (incluyendo "búsqueda inválida",
 *   que no es un fallo de red). Rechaza solo ante fallos de transporte
 *   o estados que ameritan reintentar (error del asistente, límite de
 *   solicitudes) — chat.js ya maneja el rechazo mostrando la burbuja de
 *   error con "Reintentar".
 */
export function fetchReply(rawMessage) {
  if (!APPS_SCRIPT_URL) {
    return Promise.reject(new Error("backend-not-configured"));
  }

  return fetch(buildChatUrl(rawMessage), { method: "GET" })
    .then((res) => {
      if (!res.ok) throw new Error("http-" + res.status);
      return res.json();
    })
    .then(adaptBackendResponse);
}

function adaptBackendResponse(payload) {
  switch (payload.status) {
    case "ok":
      return {
        text: payload.text && payload.text.length ? payload.text : ["Listo."],
        products: payload.products || [],
        whatsapp: Boolean(payload.whatsapp),
      };
    case "invalid_query":
      return { text: [invalidQueryMessage(payload.reason)], products: [], whatsapp: false };
    // rate_limited / error / cualquier otro valor no reconocido: se
    // tratan como fallo (dispara la burbuja de error + reintentar en
    // chat.js), nunca como una respuesta normal con datos inventados.
    default:
      throw new Error("backend-status-" + payload.status);
  }
}

function invalidQueryMessage(reason) {
  if (reason === "empty_query" || reason === "missing_query") {
    return "Escribe tu consulta para que pueda ayudarte.";
  }
  if (reason === "query_too_long") {
    return "Ese mensaje es demasiado largo. Intenta con menos texto.";
  }
  return "No pude procesar ese mensaje. Intenta reformularlo con menos texto.";
}
