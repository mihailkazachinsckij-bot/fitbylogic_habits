/**
 * FITBYLOGIC Habits — Cloudflare Worker (AI proxy)
 *
 * Деплой:
 *  1. Создай Worker на https://dash.cloudflare.com → Workers & Pages → Create
 *  2. Вставь этот код в редактор Worker
 *  3. В Settings → Variables → Add variable:
 *       ANTHROPIC_KEY = sk-ant-...  (отметь "Encrypt")
 *  4. (Опционально) Замени "*" на свой домен GitHub Pages для защиты:
 *       const ALLOWED_ORIGIN = "https://username.github.io";
 *  5. Скопируй URL воркера (вида habit-ai.username.workers.dev)
 *     и вставь в index.html в константу WORKER_URL
 */

const ALLOWED_ORIGIN = "*"; // или "https://username.github.io"
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

export default {
  async fetch(request, env) {
    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    if (!env.ANTHROPIC_KEY) {
      return json({ error: "ANTHROPIC_KEY secret not configured in Worker" }, 500);
    }

    const resp = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await resp.json();
    return json(data, resp.status);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
  });
}
