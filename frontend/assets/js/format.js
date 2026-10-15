/*
  format.js — utilidades de formato compartidas entre la fuente de
  datos de demostración (demoData.js) y la real (api.js), para que
  productCard.js no dependa de ninguna de las dos en particular.
*/
// Sin espacio entre "RD$" y el importe a propósito: un espacio normal
// es un punto donde el navegador puede partir la línea, y en pantallas
// angostas eso separaba el símbolo del número en dos líneas.
export function formatPrice(n) {
  return "RD$" + n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
