/*
  app.js — Kuki CompuCell
  Punto de entrada: conecta el chat con los accesos rápidos y las
  preguntas sugeridas del panel de referencia.
*/
import { initChat } from "./chat.js";
import { APPS_SCRIPT_URL } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  // El aviso de "vista previa / datos de demostración" solo aplica
  // mientras no haya backend real configurado (ver chat.js).
  if (APPS_SCRIPT_URL) {
    const demoBanner = document.querySelector(".demo-banner");
    if (demoBanner) demoBanner.hidden = true;
  }

  const chat = initChat({
    logEl: document.getElementById("chat-log"),
    formEl: document.getElementById("chat-form"),
    inputEl: document.getElementById("chat-input"),
    statusPillEl: document.getElementById("status-pill"),
    clearBtnEl: document.getElementById("clear-chat-btn"),
  });

  document.querySelectorAll("[data-send-query]").forEach((btn) => {
    btn.addEventListener("click", () => {
      chat.sendUserMessage(btn.dataset.sendQuery);
    });
  });
});
