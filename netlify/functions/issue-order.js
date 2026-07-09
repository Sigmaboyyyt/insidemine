const PANEL_URL = (process.env.PTERO_PANEL_URL || "https://mgr.hosting-minecraft.pro").replace(/\/$/, "");
const API_KEY = process.env.PTERO_API_KEY;
const SERVER_ID = process.env.PTERO_SERVER_ID;

const PRIVILEGES = new Set([
  "Spektor",
  "Friton",
  "Qwera",
  "GrumFeek",
  "Legend",
  "Horror",
  "Efrit",
  "Region",
  "Wither",
  "Ice",
  "Synergy",
  "Eternity",
  "Naternion",
]);

const CASE_KEYS = new Set(["donate", "rich", "seasonal"]);

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function validateNickname(nickname) {
  return typeof nickname === "string" && /^[A-Za-z0-9_]{3,16}$/.test(nickname);
}

function commandForItem(item, nickname) {
  if (item?.type === "privilege") {
    if (!PRIVILEGES.has(item.grantName)) {
      throw new Error("Unknown privilege");
    }

    if (item.duration === "forever") {
      return [`lp user ${nickname} parent set ${item.grantName}`];
    }

    if (item.duration === "30" || item.duration === "90") {
      return [
        `lp user ${nickname} parent set default`,
        `lp user ${nickname} parent addtemp ${item.grantName} ${item.duration}d`,
      ];
    }

    throw new Error("Unknown duration");
  }

  if (item?.type === "case") {
    if (!CASE_KEYS.has(item.caseKey)) {
      throw new Error("Unknown case key");
    }

    const quantity = Math.max(1, Math.min(100, Number(item.quantity) || 1));
    return [`dc givekey ${nickname} ${item.caseKey} ${quantity}`];
  }

  return [];
}

async function sendCommand(command) {
  const response = await fetch(`${PANEL_URL}/api/client/servers/${SERVER_ID}/command`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ command }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Panel API error ${response.status}: ${text}`);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  if (event.httpMethod === "GET") {
    return json(200, {
      ok: true,
      function: "issue-order",
      configured: {
        panelUrl: PANEL_URL,
        hasApiKey: Boolean(API_KEY),
        hasServerId: Boolean(SERVER_ID),
      },
    });
  }

  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  if (!API_KEY || !SERVER_ID) {
    return json(500, {
      ok: false,
      error: "Server is not configured. Set PTERO_API_KEY and PTERO_SERVER_ID.",
    });
  }

  try {
    const payload = JSON.parse(event.body || "{}");

    if (!validateNickname(payload.nickname)) {
      return json(400, { ok: false, error: "Invalid nickname" });
    }

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return json(400, { ok: false, error: "Order is empty" });
    }

    const commands = payload.items
      .flatMap((item) => commandForItem(item, payload.nickname))
      .filter(Boolean);

    if (commands.length === 0) {
      return json(400, { ok: false, error: "No supported items in order" });
    }

    for (const command of commands) {
      await sendCommand(command);
    }

    return json(200, { ok: true, commands });
  } catch (error) {
    return json(500, { ok: false, error: error.message });
  }
};
