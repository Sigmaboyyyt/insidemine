const STORAGE_KEY = "insidemine_forum_threads_v1";
const API_URL = "/.netlify/functions/forum-threads";

const forms = document.querySelectorAll("[data-forum-form]");
const toast = document.querySelector("[data-toast]");
const threadList = document.querySelector("[data-thread-list]");
const threadView = document.querySelector("[data-thread-view]");
const tabs = document.querySelector("[data-forum-tabs]");

let toastTimer;
let activeFilter = "all";
let activeThreadId = null;
let threads = [];
let apiAvailable = false;

const categoryNames = {
  player: "Жалоба на игрока",
  development: "Жалоба на разработку",
  moderation: "Жалоба на модерацию",
  creative: "Жалоба на творчество",
  helper: "Заявка на хелпера",
};

function showToast(message) {
  if (!toast) return;
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function loadLocalThreads() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveLocalThreads() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
}

async function loadThreads() {
  try {
    const response = await fetch(API_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("Forum API unavailable");

    const data = await response.json();
    apiAvailable = true;
    threads = Array.isArray(data.threads) ? data.threads : [];
  } catch {
    apiAvailable = false;
    threads = loadLocalThreads();
  }
}

async function syncForum(action, payload = {}) {
  if (!apiAvailable) {
    saveLocalThreads();
    return;
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });

  if (!response.ok) {
    throw new Error("Forum API error");
  }

  const data = await response.json();
  threads = Array.isArray(data.threads) ? data.threads : threads;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCategory(type) {
  const value = type.toLowerCase();
  if (value.includes("игрок")) return "player";
  if (value.includes("разработ")) return "development";
  if (value.includes("модерац")) return "moderation";
  if (value.includes("творч")) return "creative";
  return "helper";
}

function getMainNick(fields) {
  const nickField = fields.find((field) => /ник/i.test(field.label));
  return nickField?.value || "Без ника";
}

function makeTitle(type, fields) {
  const nick = getMainNick(fields);
  if (type.includes("хелпера")) return `Заявка на хелпера от ${nick}`;

  const target = fields.find((field) =>
    /нарушителя|администратор|модератор|сотрудник/i.test(field.label)
  );
  return target?.value ? `${type}: ${target.value}` : `${type}: ${nick}`;
}

function buildForumMessage(thread) {
  const lines = [`${thread.type} InsideMine`, "", `Статус: ${thread.status}`, ""];

  thread.fields.forEach((field) => {
    lines.push(`${field.label}: ${field.value || "-"}`);
  });

  if (thread.replies.length > 0) {
    lines.push("", "Ответы:");
    thread.replies.forEach((reply, index) => {
      lines.push(`${index + 1}. ${reply.author}: ${reply.text}`);
    });
  }

  return lines.join("\n");
}

async function copyText(text) {
  if (!navigator.clipboard?.writeText) {
    showToast("Копирование недоступно в этом браузере");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast("Тема скопирована");
  } catch {
    showToast("Не получилось скопировать тему");
  }
}

function createThread(form) {
  const type = form.dataset.formType;
  const data = new FormData(form);
  const fields = Array.from(data.entries()).map(([label, value]) => ({
    label,
    value: String(value).trim(),
  }));

  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    category: getCategory(type),
    title: makeTitle(type, fields),
    author: getMainNick(fields),
    status: "Открыта",
    fields,
    replies: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function updateCounts() {
  const counters = document.querySelectorAll("[data-count]");
  counters.forEach((counter) => {
    const key = counter.dataset.count;
    const count = key === "all"
      ? threads.length
      : threads.filter((thread) => thread.category === key).length;
    counter.textContent = count;
  });
}

function getFilteredThreads() {
  const filtered = activeFilter === "all"
    ? threads
    : threads.filter((thread) => thread.category === activeFilter);

  return [...filtered].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function renderThreadList() {
  if (!threadList) return;
  updateCounts();
  const filtered = getFilteredThreads();

  if (filtered.length === 0) {
    threadList.innerHTML = `
      <div class="thread-empty">
        <p class="eyebrow">Пока пусто</p>
        <h3>Создай первую тему</h3>
        <p>Выбери раздел форума, заполни форму и отправь.</p>
      </div>
    `;
    return;
  }

  threadList.innerHTML = filtered.map((thread) => `
    <button class="thread-card ${thread.id === activeThreadId ? "active" : ""}" type="button" data-open-thread="${thread.id}">
      <span class="thread-category">${categoryNames[thread.category] || escapeHtml(thread.type)}</span>
      <strong>${escapeHtml(thread.title)}</strong>
      <span class="thread-meta">
        <span>${escapeHtml(thread.author)}</span>
        <span>${formatDate(thread.updatedAt)}</span>
      </span>
      <span class="status-pill">${escapeHtml(thread.status)}</span>
    </button>
  `).join("");
}

function renderThreadView() {
  if (!threadView) return;
  const thread = threads.find((item) => item.id === activeThreadId);

  if (!thread) {
    threadView.innerHTML = `
      <div class="thread-placeholder">
        <p class="eyebrow">Нет выбранной темы</p>
        <h3>Открой тему слева</h3>
        <p>Здесь появятся детали обращения, ответы и управление статусом.</p>
      </div>
    `;
    return;
  }

  threadView.innerHTML = `
    <div class="thread-view-head">
      <div>
        <span class="thread-category">${categoryNames[thread.category] || escapeHtml(thread.type)}</span>
        <h3>${escapeHtml(thread.title)}</h3>
        <p>Автор: ${escapeHtml(thread.author)} • создано ${formatDate(thread.createdAt)}</p>
      </div>
      <span class="status-pill status-${thread.status === "Закрыта" ? "closed" : "open"}">${escapeHtml(thread.status)}</span>
    </div>

    <div class="thread-actions">
      <button type="button" data-status="Открыта">Открыта</button>
      <button type="button" data-status="На рассмотрении">На рассмотрении</button>
      <button type="button" data-status="Закрыта">Закрыта</button>
      <button type="button" data-copy-thread>Копировать</button>
      <button class="forum-danger" type="button" data-delete-thread>Удалить</button>
    </div>

    <div class="thread-fields">
      ${thread.fields.map((field) => `
        <div class="thread-field">
          <span>${escapeHtml(field.label)}</span>
          <p>${escapeHtml(field.value || "-")}</p>
        </div>
      `).join("")}
    </div>

    <div class="reply-block">
      <div class="reply-head">
        <h4>Ответы</h4>
        <span>${thread.replies.length}</span>
      </div>
      <div class="reply-list">
        ${thread.replies.length === 0 ? `<p class="reply-empty">Ответов пока нет.</p>` : thread.replies.map((reply) => `
          <article class="reply-card">
            <strong>${escapeHtml(reply.author)}</strong>
            <time>${formatDate(reply.createdAt)}</time>
            <p>${escapeHtml(reply.text)}</p>
          </article>
        `).join("")}
      </div>
      <form class="reply-form" data-reply-form>
        <input name="author" type="text" placeholder="Ваш ник" required />
        <textarea name="text" rows="3" placeholder="Ответ по теме" required></textarea>
        <button type="submit">Ответить</button>
      </form>
    </div>
  `;
}

function renderForum() {
  renderThreadList();
  renderThreadView();
}

function selectRequestedThread() {
  const requestedThreadId = new URLSearchParams(window.location.search).get("thread");

  if (requestedThreadId && threads.some((thread) => thread.id === requestedThreadId)) {
    activeThreadId = requestedThreadId;
  } else if (!activeThreadId && threads.length > 0) {
    activeThreadId = threads[0].id;
  }
}

forms.forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) {
      return;
    }

    const thread = createThread(form);
    threads.unshift(thread);
    activeThreadId = thread.id;
    activeFilter = "all";
    form.reset();
    renderForum();

    try {
      await syncForum("create", { thread });
      activeThreadId = thread.id;
      showToast(apiAvailable ? "Тема создана" : "Тема создана локально");
    } catch {
      saveLocalThreads();
      showToast("Тема создана локально, API недоступен");
    }

    document.querySelectorAll("[data-filter]").forEach((button) => {
      button.classList.toggle("active", button.dataset.filter === activeFilter);
    });

    if (document.querySelector("#threads")) {
      document.querySelector("#threads")?.scrollIntoView({ behavior: "smooth", block: "start" });
      renderForum();
    } else {
      window.setTimeout(() => {
        window.location.href = `forum.html?thread=${encodeURIComponent(thread.id)}`;
      }, 450);
    }
  });
});

tabs?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;

  activeFilter = button.dataset.filter;
  tabs.querySelectorAll("[data-filter]").forEach((tab) => {
    tab.classList.toggle("active", tab === button);
  });
  renderForum();
});

threadList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-thread]");
  if (!button) return;

  activeThreadId = button.dataset.openThread;
  renderForum();
});

threadView?.addEventListener("click", async (event) => {
  const thread = threads.find((item) => item.id === activeThreadId);
  if (!thread) return;

  const statusButton = event.target.closest("[data-status]");
  if (statusButton) {
    thread.status = statusButton.dataset.status;
    thread.updatedAt = new Date().toISOString();
    renderForum();

    try {
      await syncForum("status", { id: thread.id, status: thread.status });
      showToast("Статус обновлен");
    } catch {
      saveLocalThreads();
      showToast("Статус сохранен локально");
    }

    renderForum();
    return;
  }

  if (event.target.closest("[data-copy-thread]")) {
    copyText(buildForumMessage(thread));
    return;
  }

  if (event.target.closest("[data-delete-thread]")) {
    const deletedId = activeThreadId;
    threads = threads.filter((item) => item.id !== deletedId);
    activeThreadId = threads[0]?.id || null;
    renderForum();

    try {
      await syncForum("delete", { id: deletedId });
      showToast("Тема удалена");
    } catch {
      saveLocalThreads();
      showToast("Тема удалена локально");
    }

    renderForum();
  }
});

threadView?.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-reply-form]");
  if (!form) return;

  event.preventDefault();
  const thread = threads.find((item) => item.id === activeThreadId);
  if (!thread || !form.reportValidity()) return;

  const data = new FormData(form);
  const reply = {
    author: String(data.get("author")).trim(),
    text: String(data.get("text")).trim(),
    createdAt: new Date().toISOString(),
  };

  thread.replies.push(reply);
  thread.updatedAt = new Date().toISOString();
  form.reset();
  renderForum();

  try {
    await syncForum("reply", { id: thread.id, reply });
    showToast("Ответ добавлен");
  } catch {
    saveLocalThreads();
    showToast("Ответ сохранен локально");
  }

  renderForum();
});

async function initForum() {
  await loadThreads();
  selectRequestedThread();
  renderForum();

  if (!apiAvailable && location.protocol !== "file:") {
    showToast("Форум временно работает локально");
  }
}

initForum();
