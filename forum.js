const STORAGE_KEY = "insidemine_forum_threads_v1";

const forms = document.querySelectorAll("[data-forum-form]");
const toast = document.querySelector("[data-toast]");
const threadList = document.querySelector("[data-thread-list]");
const threadView = document.querySelector("[data-thread-view]");
const tabs = document.querySelector("[data-forum-tabs]");

let toastTimer;
let activeFilter = "all";
let activeThreadId = null;
let threads = loadThreads();

const categoryNames = {
  player: "Жалоба на игрока",
  admin: "Жалоба на администрацию",
  tech: "Тех раздел",
  helper: "Заявка на хелпера",
};

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function loadThreads() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveThreads() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
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
  if (value.includes("админ")) return "admin";
  if (value.includes("тех")) return "tech";
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
    /нарушителя|администратор/i.test(field.label)
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
  updateCounts();
  const filtered = getFilteredThreads();

  if (filtered.length === 0) {
    threadList.innerHTML = `
      <div class="thread-empty">
        <p class="eyebrow">Пока пусто</p>
        <h3>Создай первую тему</h3>
        <p>Выбери форму ниже, заполни ее и отправь.</p>
      </div>
    `;
    return;
  }

  threadList.innerHTML = filtered.map((thread) => `
    <button class="thread-card ${thread.id === activeThreadId ? "active" : ""}" type="button" data-open-thread="${thread.id}">
      <span class="thread-category">${categoryNames[thread.category]}</span>
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
        <span class="thread-category">${categoryNames[thread.category]}</span>
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

forms.forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.reportValidity()) {
      return;
    }

    const thread = createThread(form);
    threads.unshift(thread);
    activeThreadId = thread.id;
    activeFilter = "all";
    saveThreads();
    form.reset();

    document.querySelectorAll("[data-filter]").forEach((button) => {
      button.classList.toggle("active", button.dataset.filter === activeFilter);
    });

    renderForum();
    document.querySelector("#threads")?.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast("Тема создана");
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

threadView?.addEventListener("click", (event) => {
  const thread = threads.find((item) => item.id === activeThreadId);
  if (!thread) return;

  const statusButton = event.target.closest("[data-status]");
  if (statusButton) {
    thread.status = statusButton.dataset.status;
    thread.updatedAt = new Date().toISOString();
    saveThreads();
    renderForum();
    showToast("Статус обновлен");
    return;
  }

  if (event.target.closest("[data-copy-thread]")) {
    copyText(buildForumMessage(thread));
    return;
  }

  if (event.target.closest("[data-delete-thread]")) {
    threads = threads.filter((item) => item.id !== activeThreadId);
    activeThreadId = threads[0]?.id || null;
    saveThreads();
    renderForum();
    showToast("Тема удалена");
  }
});

threadView?.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-reply-form]");
  if (!form) return;

  event.preventDefault();
  const thread = threads.find((item) => item.id === activeThreadId);
  if (!thread || !form.reportValidity()) return;

  const data = new FormData(form);
  thread.replies.push({
    author: String(data.get("author")).trim(),
    text: String(data.get("text")).trim(),
    createdAt: new Date().toISOString(),
  });
  thread.updatedAt = new Date().toISOString();
  saveThreads();
  renderForum();
  showToast("Ответ добавлен");
});

if (!activeThreadId && threads.length > 0) {
  activeThreadId = threads[0].id;
}

renderForum();
