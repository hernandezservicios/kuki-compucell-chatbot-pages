/*
  chat.js — Kuki CompuCell
  Estado y renderizado del panel de conversación: envío de mensajes,
  indicador de "consultando…", manejo de error + reintento, tarjetas
  de producto y botón de WhatsApp.

  Fuente de datos: si APPS_SCRIPT_URL (api.js) no está configurada, el
  chat usa demoData.js (totalmente interactivo, para previsualizar la
  interfaz sin desplegar el backend). En cuanto se configura esa URL,
  usa el backend real (api.js) en su lugar — IS_DEMO controla ambos la
  fuente de datos y el texto del indicador de estado, para que nunca
  diga "datos de demostración" una vez que hay un backend real.
*/
import { getGreeting, demoReply } from "./demoData.js";
import { fetchReply, APPS_SCRIPT_URL } from "./api.js";
import { renderProductCard } from "./productCard.js";

const IS_DEMO = !APPS_SCRIPT_URL;
const getReply = IS_DEMO ? demoReply : fetchReply;

export function initChat({ logEl, formEl, inputEl, statusPillEl, clearBtnEl }) {
  let lastQuery = "";
  let isBusy = false;

  function timeNow() {
    return new Date().toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" });
  }

  function setStatus(state) {
    statusPillEl.dataset.state = state;
    const strong = statusPillEl.querySelector("strong");
    const meta = statusPillEl.querySelector(".status-meta");
    if (state === "loading") {
      strong.textContent = "Consultando inventario…";
      meta.textContent = "";
    } else if (state === "error") {
      strong.textContent = "No se pudo completar la consulta";
      meta.textContent = IS_DEMO ? "Vista previa" : "";
    } else {
      strong.textContent = IS_DEMO ? "Vista previa" : "En línea";
      meta.textContent = IS_DEMO ? `datos de demostración · ${timeNow()}` : `Kuki CompuCell · ${timeNow()}`;
    }
  }

  function scrollToEnd() {
    logEl.scrollTop = logEl.scrollHeight;
  }

  function buildMessageShell(role, { isError = false } = {}) {
    const wrap = document.createElement("div");
    wrap.className = `msg msg-${role}${isError ? " msg-error" : ""}`;

    const avatar = document.createElement("div");
    avatar.className = "avatar scan-frame";
    avatar.textContent = role === "user" ? "Tú" : "K";
    avatar.setAttribute("aria-hidden", "true");

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    return { wrap, bubble };
  }

  function appendTextLines(bubble, lines) {
    (Array.isArray(lines) ? lines : [lines]).forEach((line) => {
      const p = document.createElement("p");
      p.textContent = line;
      bubble.appendChild(p);
    });
  }

  function appendTime(bubble) {
    const time = document.createElement("time");
    time.className = "msg-time";
    time.textContent = timeNow();
    bubble.appendChild(time);
  }

  function appendMessage(role, lines, { products = [], whatsapp = false, isError = false } = {}) {
    const { wrap, bubble } = buildMessageShell(role, { isError });
    appendTextLines(bubble, lines);

    products.forEach((p) => bubble.appendChild(renderProductCard(p)));

    if (whatsapp) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "retry-btn";
      btn.style.borderColor = "var(--blue-500)";
      btn.textContent = "Continuar por WhatsApp";
      btn.addEventListener("click", () => {
        appendMessage("assistant", [
          "En producción, este botón abriría WhatsApp con tu consulta prellenada para hablar con un técnico de Kuki CompuCell.",
        ]);
      });
      bubble.appendChild(btn);
    }

    if (isError) {
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "retry-btn";
      retry.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 11A8 8 0 1 0 7 17M20 11V5m0 6h-6"/></svg> Reintentar`;
      retry.addEventListener("click", () => {
        wrap.remove();
        runQuery(lastQuery);
      });
      bubble.appendChild(retry);
    }

    appendTime(bubble);
    logEl.appendChild(wrap);
    scrollToEnd();
    return wrap;
  }

  let typingNode = null;
  function showTyping() {
    typingNode = document.createElement("div");
    typingNode.className = "typing";
    typingNode.innerHTML = `
      <div class="avatar scan-frame" aria-hidden="true">K</div>
      <div class="typing-bubble" role="status" aria-label="Consultando inventario">
        <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
      </div>`;
    logEl.appendChild(typingNode);
    scrollToEnd();
  }
  function hideTyping() {
    if (typingNode) {
      typingNode.remove();
      typingNode = null;
    }
  }

  function setBusy(busy) {
    isBusy = busy;
    inputEl.disabled = busy;
    formEl.querySelector(".send-btn").disabled = busy;
    // También los accesos rápidos y las preguntas sugeridas: sin esto,
    // solo el guard de isBusy evita un envío duplicado, y dos clics muy
    // seguidos en uno de estos botones podrían colar una segunda
    // consulta si el backend responde más rápido de lo normal.
    document.querySelectorAll("[data-send-query]").forEach((btn) => {
      btn.disabled = busy;
    });
  }

  function errorLines() {
    return [
      "No pude completar la consulta. Puede ser un problema de conexión temporal.",
      "Intenta de nuevo en unos segundos.",
    ];
  }

  function runQuery(queryText) {
    if (!queryText.trim() || isBusy) return;
    lastQuery = queryText;
    setBusy(true);
    setStatus("loading");
    showTyping();

    getReply(queryText).then(
      (reply) => {
        hideTyping();
        setBusy(false);
        setStatus("idle");
        appendMessage("assistant", reply.text, {
          products: reply.products,
          whatsapp: reply.whatsapp,
        });
      },
      () => {
        hideTyping();
        setBusy(false);
        setStatus("error");
        appendMessage("assistant", errorLines(), { isError: true });
      }
    );
  }

  function sendUserMessage(queryText) {
    if (!queryText.trim() || isBusy) return;
    appendMessage("user", [queryText.trim()]);
    runQuery(queryText.trim());
  }

  function resetChat() {
    logEl.innerHTML = "";
    const greeting = getGreeting();
    appendMessage("assistant", greeting.text);
    setStatus("idle");
    lastQuery = "";
  }

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = inputEl.value;
    inputEl.value = "";
    sendUserMessage(value);
    inputEl.focus();
  });

  clearBtnEl.addEventListener("click", resetChat);

  resetChat();

  return { sendUserMessage, resetChat };
}
