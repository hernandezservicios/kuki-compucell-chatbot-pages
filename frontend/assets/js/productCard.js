/*
  productCard.js — Kuki CompuCell
  Componente reutilizable: tarjeta de producto. Refleja exactamente lo
  que la hoja de inventario puede dar (producto, cantidad, precio_ud,
  stockStatus, priceConfirmed) — sin categoría, porque la hoja real no
  tiene esa columna y no se inventa una.

  Existencia y precio son señales INDEPENDIENTES (política de
  existencias/precios): un precio no confirmado no debe ocultar un
  "agotado" confirmado, ni viceversa. Construye nodos DOM con
  textContent (nunca innerHTML con datos externos) porque estos datos
  vienen, en producción, de celdas que terceros pueden editar.
*/

import { formatPrice } from "./format.js";

const PRODUCT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a4 4 0 0 1 8 0v2" stroke-linecap="round"/></svg>`;

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v; // solo para el ícono fijo de arriba
    else node.setAttribute(k, v);
  });
  children.forEach((c) => node.appendChild(c));
  return node;
}

function text(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = content;
  return node;
}

/**
 * @param {{producto:string, cantidad:number|null, precio_ud:number|null, stockStatus:"in_stock"|"out_of_stock"|"unconfirmed", priceConfirmed:boolean}} product
 */
export function renderProductCard(product) {
  const card = el("article", { class: "product-card scan-frame" });

  const thumb = el("div", { class: "product-thumb", html: PRODUCT_ICON });
  card.appendChild(thumb);

  const info = el("div", { class: "product-info" });
  info.appendChild(text("p", "product-name", product.producto));

  const meta = el("dl", { class: "product-meta" });
  meta.appendChild(text("dt", null, "Precio unitario"));
  meta.appendChild(text("dd", "product-price", product.priceConfirmed ? formatPrice(product.precio_ud) : "Por confirmar"));
  meta.appendChild(text("dt", null, "Cantidad disponible"));
  meta.appendChild(text("dd", null, quantityLabel(product)));
  info.appendChild(meta);

  const badge = el("span", { class: "badge " + badgeClass(product) });
  badge.textContent = badgeLabel(product);
  info.appendChild(badge);

  card.appendChild(info);
  return card;
}

// La cantidad exacta solo se muestra cuando se conoce (viene de una
// búsqueda); cuando solo se confirmó el estado pero no el número exacto
// (p. ej. un resultado de calculate_subtotal), se muestra el estado en
// palabras en vez de inventar o repetir un número.
function quantityLabel(product) {
  if (product.stockStatus === "unconfirmed") return "Por confirmar";
  if (product.cantidad !== null && product.cantidad !== undefined) return String(product.cantidad);
  return product.stockStatus === "in_stock" ? "Disponible" : "Agotado";
}

function badgeClass(product) {
  if (product.stockStatus === "unconfirmed") return "badge-pending";
  return product.stockStatus === "in_stock" ? "badge-ok" : "badge-out";
}

function badgeLabel(product) {
  if (product.stockStatus === "unconfirmed") return "Disponibilidad por confirmar";
  return product.stockStatus === "in_stock" ? "Disponible" : "Agotado";
}
