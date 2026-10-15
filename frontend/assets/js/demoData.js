/*
  DEMO DATA — Kuki CompuCell · Consulta de Inventario
  ----------------------------------------------------
  Catálogo y lógica de respuesta de MUESTRA, solo para validar la
  interfaz visual e interactiva sin desplegar el backend. Productos,
  precios y existencias son FICTICIOS y no deben tratarse como datos de
  producción.

  Los resultados que devuelve se adaptan a la MISMA forma pública que
  entrega el backend real (ver backend/apps-script/MatchLogic.gs):
  { producto, cantidad, precio_ud, stockStatus, priceConfirmed }.
  category/sku/aliases solo existen aquí dentro, para que esta
  demostración pueda tener "opción similar" y "comparar", pero nunca se
  exponen tal cual: la hoja real no tiene columna de categoría y no se
  inventa una.

  app.js usa api.js (backend real) por defecto; este módulo queda
  disponible para quien quiera previsualizar la interfaz sin desplegar
  nada todavía.
*/
import { formatPrice } from "./format.js";

export const IS_DEMO = true;

export const demoCatalog = [
  { sku: "CEL-IP13-128", name: "iPhone 13", category: "Celulares", price: 25000, stock: 5, aliases: ["iphone13"] },
  { sku: "ACC-CHG-SAM", name: "Cargador Samsung", category: "Accesorios", price: 850, stock: 12, aliases: [] },
  { sku: "AUD-JBL-520", name: "Audífonos JBL Tune 520BT", category: "Audio", price: 4200, stock: 8, aliases: [] },
  { sku: "AUD-JBL-710", name: "Audífonos JBL Tune 710BT", category: "Audio", price: 6500, stock: 3, aliases: [] },
  { sku: "AUD-JBL-WAVE", name: "Audífonos JBL Wave 100TWS", category: "Audio", price: 3200, stock: 6, aliases: [] },
  { sku: "CONS-PS5-SLIM", name: "PlayStation 5 Slim", category: "Consolas", price: 32990, stock: 0, aliases: ["ps5", "ps 5", "play station 5", "playstation5"] },
  { sku: "CONS-XBOX-S", name: "Xbox Series S", category: "Consolas", price: 24990, stock: 4, aliases: ["xbox", "series s"] },
  { sku: "LAP-LEN-IP3", name: "Lenovo IdeaPad 3", category: "Laptops", price: 24500, stock: 8, aliases: ["ideapad"] },
  { sku: "LAP-ASUS-V15", name: "ASUS Vivobook 15", category: "Laptops", price: 28900, stock: 5, aliases: ["vivobook"] },
  { sku: "ACC-FUNDA-GEN", name: "Funda genérica para tablet", category: "Accesorios", price: null, stock: null, aliases: ["funda tablet"] }, // precio y cantidad aun no cargados -> stockStatus/priceConfirmed en "por confirmar"
];

// Forma pública = la misma que entrega el backend real (requisito 7:
// solo los campos necesarios, nunca sku/category/aliases internos).
// stockStatus y priceConfirmed son señales independientes, igual que
// en MatchLogic.gs (política de existencias/precios).
function toPublicProduct(p) {
  return {
    producto: p.name,
    cantidad: p.stock,
    precio_ud: p.price,
    stockStatus: p.stock === null ? "unconfirmed" : p.stock > 0 ? "in_stock" : "out_of_stock",
    priceConfirmed: p.price !== null,
  };
}

function normalize(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¿?¡!.,;:]/g, "");
}

function findProducts(queryNorm) {
  return demoCatalog.filter((p) => {
    const haystack = normalize([p.name, p.category, ...(p.aliases || [])].join(" "));
    return queryNorm
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .some((w) => haystack.includes(w));
  });
}

function parseQuantity(queryNorm) {
  const words = { dos: 2, tres: 3, cuatro: 4, cinco: 5 };
  const digitMatch = queryNorm.match(/\b(\d+)\b/);
  if (digitMatch) return parseInt(digitMatch[1], 10);
  for (const [word, n] of Object.entries(words)) {
    if (queryNorm.includes(word)) return n;
  }
  return null;
}

const GREETING_TEXT = [
  "¡Hola! 👋 Soy tu asistente virtual de Kuki CompuCell.",
  "Puedo ayudarte a consultar precios, disponibilidad y encontrar productos en nuestro inventario.",
  "Escribe lo que necesitas y te daré la información directamente desde nuestra hoja de inventario.",
];

export function getGreeting() {
  return { text: GREETING_TEXT, products: [], whatsapp: false, isError: false };
}

const errorAttempts = new Map();

/**
 * Simula una consulta al backend. Resuelve tras un retardo breve para
 * poder mostrar el estado "consultando…", y puede resolver como error
 * para poder demostrar el estado de error + reintento.
 *
 * Gancho de prueba: la PRIMERA vez que un mensaje contiene la palabra
 * "error" falla de forma determinista (para QA manual y pruebas
 * automatizadas); al reintentar la misma consulta, resuelve con
 * normalidad, simulando un corte de red transitorio.
 */
export function demoReply(rawQuery) {
  const queryNorm = normalize(rawQuery);
  const attempts = errorAttempts.get(queryNorm) || 0;
  errorAttempts.set(queryNorm, attempts + 1);
  const forcedError = queryNorm.includes("error") && attempts === 0;
  const randomError = !forcedError && Math.random() < 0.08;

  return new Promise((resolve, reject) => {
    const delay = 700 + Math.random() * 700;
    setTimeout(() => {
      if (forcedError || randomError) {
        reject(new Error("demo-network-error"));
        return;
      }
      resolve(buildReply(queryNorm, rawQuery));
    }, delay);
  });
}

function buildReply(queryNorm, rawQuery) {
  const qty = parseQuantity(queryNorm);
  const matches = findProducts(queryNorm);
  const isCompare = queryNorm.includes("compar");

  if (matches.length === 0) {
    return {
      text: [
        `No encontré productos que coincidan con "${rawQuery.trim()}" en el inventario.`,
        "¿Quieres que te muestre las categorías disponibles, o prefieres hablar directo con un técnico por WhatsApp?",
      ],
      products: [],
      whatsapp: true,
      isError: false,
    };
  }

  const outOfStock = matches.find((p) => p.stock === 0);
  if (outOfStock && matches.length === 1) {
    const alt = demoCatalog.find((p) => p.category === outOfStock.category && p.stock > 0);
    return {
      text: [
        `El ${outOfStock.name} no está disponible en este momento.`,
        alt ? `Actualmente tenemos una opción similar en inventario:` : `En cuanto reingrese te puedo avisar.`,
      ],
      products: alt ? [toPublicProduct(alt)] : [],
      whatsapp: true,
      isError: false,
    };
  }

  if (qty && matches.length >= 1 && matches[0].price !== null) {
    const product = matches[0];
    const total = product.price * qty;
    return {
      text: [
        `${product.name} cuesta ${formatPrice(product.price)} por unidad.`,
        `Para ${qty} unidades serían: ${qty} × ${formatPrice(product.price)} = ${formatPrice(total)}.`,
        "Nota: este cálculo no implica una reserva, ni garantiza disponibilidad futura.",
      ],
      products: [toPublicProduct(product)],
      whatsapp: false,
      isError: false,
    };
  }

  if (isCompare && matches.length >= 2) {
    return {
      text: [`Tenemos ${matches.length} opciones que podrían servirte. Aquí la comparación:`],
      products: matches.slice(0, 2).map(toPublicProduct),
      whatsapp: false,
      isError: false,
    };
  }

  if (matches.length === 1) {
    return {
      text: [`Encontré el ${matches[0].name} en nuestro inventario:`],
      products: matches.map(toPublicProduct),
      whatsapp: false,
      isError: false,
    };
  }

  return {
    text: [`Encontré estos productos en nuestro inventario:`],
    products: matches.slice(0, 4).map(toPublicProduct),
    whatsapp: false,
    isError: false,
  };
}
