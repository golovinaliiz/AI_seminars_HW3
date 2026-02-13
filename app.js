/* app.js — логика для кнопок, localStorage и отправки логов в GAS Web App */

(function () {
  const LS_TOKEN = "hf_token";
  const LS_URL = "gs_webapp_url";

  const tokenInput = document.getElementById("hf-token-input");
  const urlInput = document.getElementById("gs-webapp-url");

  const storeTokenBtn = document.getElementById("store-token-btn");
  const clearTokenBtn = document.getElementById("clear-token-btn");

  const storeUrlBtn = document.getElementById("store-url-btn");
  const clearUrlBtn = document.getElementById("clear-url-btn");

  const testPingBtn = document.getElementById("test-ping-btn");
  const sendTestLogBtn = document.getElementById("send-test-log-btn");

  const statusEl = document.getElementById("config-hint");
  const debugEl = document.getElementById("debug");
  const testTextEl = document.getElementById("test-text");

  function setStatus(msg) {
    statusEl.textContent = msg;
  }

  function setDebug(objOrText) {
    if (typeof objOrText === "string") debugEl.textContent = `Debug: ${objOrText}`;
    else debugEl.textContent = `Debug: ${JSON.stringify(objOrText, null, 2)}`;
  }

  function loadFromStorage() {
    tokenInput.value = localStorage.getItem(LS_TOKEN) || "";
    urlInput.value = localStorage.getItem(LS_URL) || "";

    if (urlInput.value) {
      setStatus("ℹ️ URL Web App загружен. Нажми «Тестовый пинг» для проверки записи в таблицу.");
    } else {
      setStatus("⚙️ Укажите ссылку Web App для Google Sheets и сохраните настройки.");
    }

    setDebug({
      hasToken: Boolean(tokenInput.value),
      hasUrl: Boolean(urlInput.value),
      url: urlInput.value || null,
    });
  }

  function normalizeUrl(u) {
    return (u || "").trim();
  }

  function validateWebAppUrl(u) {
    // Частые ошибки: /dev вместо /exec, или вообще не тот домен
    if (!u) return { ok: false, error: "URL пустой." };

    const isScriptGoogle = u.startsWith("https://script.google.com/");
    if (!isScriptGoogle) {
      return { ok: false, error: "URL должен начинаться с https://script.google.com/ (GAS Web App)." };
    }

    if (!u.includes("/exec")) {
      return { ok: false, error: "В конце должен быть /exec (а не /dev). Открой Deploy → Web app → Copy URL." };
    }

    return { ok: true };
  }

  /**
   * Отправка логов в GAS без CORS:
   * 1) navigator.sendBeacon (лучше всего для логирования)
   * 2) fallback: fetch no-cors
   */
  async function postLog(eventName, metaObj, extras = {}) {
    const webAppUrl = normalizeUrl(urlInput.value) || localStorage.getItem(LS_URL) || "";
    const v = validateWebAppUrl(webAppUrl);
    if (!v.ok) {
      setStatus(`❌ ${v.error}`);
      setDebug({ webAppUrl });
      return { ok: false, error: v.error };
    }

    const payload = new URLSearchParams();
    payload.set("ts", String(Date.now()));
    payload.set("event", eventName);
    payload.set("variant", extras.variant || "github_pages");
    payload.set("userId", extras.userId || "anon");
    payload.set("meta", JSON.stringify(metaObj || {}));

    // 1) sendBeacon
    try {
      const ok = navigator.sendBeacon(webAppUrl, payload);
      if (ok) {
        setStatus("✅ Отправлено (sendBeacon). Проверь вкладку logs / sentiment_logs в Google Sheets.");
        setDebug({ method: "sendBeacon", webAppUrl, eventName, metaObj });
        return { ok: true, method: "sendBeacon" };
      }
    } catch (err) {
      // пойдём на fallback
      setDebug({ sendBeaconError: String(err) });
    }

    // 2) fetch fallback (ответ всё равно нельзя читать из-за CORS, но запрос уйдёт)
    try {
      await fetch(webAppUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: payload.toString(),
      });
      setStatus("✅ Отправлено (fetch no-cors). Проверь таблицу (logs / sentiment_logs).");
      setDebug({ method: "fetch(no-cors)", webAppUrl, eventName, metaObj });
      return { ok: true, method: "fetch(no-cors)" };
    } catch (err) {
      setStatus("❌ Не удалось отправить запрос. Проверь URL, доступ Web App и консоль браузера.");
      setDebug({ method: "fetch(no-cors)", error: String(err), webAppUrl });
      return { ok: false, error: String(err) };
    }
  }

  // ==== handlers ====

  storeTokenBtn.addEventListener("click", () => {
    localStorage.setItem(LS_TOKEN, (tokenInput.value || "").trim());
    setStatus("✅ Токен сохранён локально (localStorage).");
    setDebug({ action: "storeToken", hasToken: Boolean(tokenInput.value) });
  });

  clearTokenBtn.addEventListener("click", () => {
    localStorage.removeItem(LS_TOKEN);
    tokenInput.value = "";
    setStatus("🧹 Токен очищен.");
    setDebug({ action: "clearToken" });
  });

  storeUrlBtn.addEventListener("click", async () => {
    const u = normalizeUrl(urlInput.value);
    const v = validateWebAppUrl(u);
    if (!v.ok) {
      setStatus(`❌ ${v.error}`);
      setDebug({ action: "storeUrl", url: u });
      return;
    }

    localStorage.setItem(LS_URL, u);
    setStatus("✅ URL Web App сохранён. Отправляю тестовый пинг…");
    setDebug({ action: "storeUrl", url: u });

    await postLog("test_ping", { source: "store_url_btn" });
  });

  clearUrlBtn.addEventListener("click", () => {
    localStorage.removeItem(LS_URL);
    urlInput.value = "";
    setStatus("🧹 URL очищен.");
    setDebug({ action: "clearUrl" });
  });

  testPingBtn.addEventListener("click", async () => {
    setStatus("📡 Отправляю test_ping…");
    await postLog("test_ping", { source: "test_ping_btn" });
  });

  sendTestLogBtn.addEventListener("click", async () => {
    const review = (testTextEl.value || "").trim() || "Тестовый отзыв (пустое поле).";
    setStatus("📨 Отправляю test_sentiment…");
    await postLog("test_sentiment", {
      review,
      sentiment: "neutral",
      confidence: 0.5,
      action_taken: "none",
    });
  });

  // init
  loadFromStorage();
})();
