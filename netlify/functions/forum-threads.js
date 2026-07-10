const { getStore } = require("@netlify/blobs");

const STORE_NAME = "forum";
const THREADS_KEY = "threads";
const MAX_THREADS = 500;
const MAX_REPLIES = 200;
const MAX_FIELD_LENGTH = 4000;

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

function cleanText(value, maxLength = MAX_FIELD_LENGTH) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function cleanFields(fields) {
  if (!Array.isArray(fields)) return [];

  return fields
    .map((field) => ({
      label: cleanText(field?.label, 160),
      value: cleanText(field?.value),
    }))
    .filter((field) => field.label);
}

function cleanReply(reply) {
  return {
    author: cleanText(reply?.author, 80) || "Без ника",
    text: cleanText(reply?.text),
    createdAt: reply?.createdAt || new Date().toISOString(),
  };
}

function cleanThread(thread) {
  const now = new Date().toISOString();

  return {
    id: cleanText(thread?.id, 80) || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: cleanText(thread?.type, 120) || "Тема форума",
    category: cleanText(thread?.category, 40) || "player",
    title: cleanText(thread?.title, 180) || "Новая тема",
    author: cleanText(thread?.author, 80) || "Без ника",
    status: cleanText(thread?.status, 40) || "Открыта",
    fields: cleanFields(thread?.fields),
    replies: Array.isArray(thread?.replies)
      ? thread.replies.slice(0, MAX_REPLIES).map(cleanReply).filter((reply) => reply.text)
      : [],
    createdAt: thread?.createdAt || now,
    updatedAt: now,
  };
}

async function readThreads(store) {
  const saved = await store.get(THREADS_KEY, { type: "json" });
  return Array.isArray(saved) ? saved : [];
}

async function writeThreads(store, threads) {
  const limited = threads
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, MAX_THREADS);

  await store.setJSON(THREADS_KEY, limited);
  return limited;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  const store = getStore(STORE_NAME);

  if (event.httpMethod === "GET") {
    const threads = await readThreads(store);
    return json(200, { ok: true, threads });
  }

  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const action = payload.action;
    let threads = await readThreads(store);
    let thread = null;

    if (action === "create") {
      thread = cleanThread(payload.thread);
      threads = [thread, ...threads.filter((item) => item.id !== thread.id)];
    } else if (action === "status") {
      const id = cleanText(payload.id, 80);
      const status = cleanText(payload.status, 40);
      threads = threads.map((item) => {
        if (item.id !== id) return item;
        thread = { ...item, status, updatedAt: new Date().toISOString() };
        return thread;
      });
    } else if (action === "reply") {
      const id = cleanText(payload.id, 80);
      const reply = cleanReply(payload.reply);
      if (!reply.text) {
        return json(400, { ok: false, error: "Reply is empty" });
      }
      threads = threads.map((item) => {
        if (item.id !== id) return item;
        const replies = [...(Array.isArray(item.replies) ? item.replies : []), reply].slice(-MAX_REPLIES);
        thread = { ...item, replies, updatedAt: new Date().toISOString() };
        return thread;
      });
    } else if (action === "delete") {
      const id = cleanText(payload.id, 80);
      threads = threads.filter((item) => item.id !== id);
    } else {
      return json(400, { ok: false, error: "Unknown action" });
    }

    threads = await writeThreads(store, threads);
    return json(200, { ok: true, threads, thread });
  } catch (error) {
    return json(500, { ok: false, error: error.message });
  }
};
