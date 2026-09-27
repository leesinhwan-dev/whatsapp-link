// Cloudflare Pages Function: /api/track
// Ingests usage events, captures client IP, and detects Real Humans vs. Automated Bots

const ALLOWED_EVENTS = [
  "page_view",
  "link_generated",
  "copy_link",
  "open_whatsapp",
  "show_qr"
];

// Regex for automated bots, search engine crawlers, and headless tools
const BOT_UA_REGEX = /bot|spider|crawl|slurp|headless|puppeteer|selenium|lighthouse|curl|wget|python|postman|insomnia|axios|go-http-client|apache-httpclient|okhttp|http_request/i;

// Auto-run schema migration if columns do not exist yet in live D1 database
let migrationDone = false;
async function ensureColumnsExist(db) {
  if (migrationDone) return;
  try {
    await db.prepare("ALTER TABLE analytics_events ADD COLUMN ip_address TEXT").run();
  } catch (e) {}
  try {
    await db.prepare("ALTER TABLE analytics_events ADD COLUMN is_bot INTEGER DEFAULT 0").run();
  } catch (e) {}
  try {
    await db.prepare("ALTER TABLE analytics_events ADD COLUMN bot_reason TEXT").run();
  } catch (e) {}
  migrationDone = true;
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(
        JSON.stringify({ error: "Database binding 'DB' not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Ensure database columns are present
    await ensureColumnsExist(env.DB);

    const data = await request.json().catch(() => ({}));
    const eventType = data.event;

    if (!eventType || typeof eventType !== "string" || !ALLOWED_EVENTS.includes(eventType)) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing event type" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1. Capture Client IP address from Cloudflare edge header
    const ipAddress = (
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-real-ip") ||
      "Unknown"
    ).trim();

    // 2. Extract Geographic Information
    const cf = request.cf || {};
    const country = (cf.country || "XX").slice(0, 5);
    const city = (cf.city || "Unknown").slice(0, 50);

    // 3. User-Agent & Device Detection
    const userAgent = request.headers.get("user-agent") || "";
    let deviceType = "desktop";
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      deviceType = "tablet";
    } else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(userAgent)) {
      deviceType = "mobile";
    }

    // 4. Human vs. Bot Detection Logic
    let isBot = 0;
    let botReason = "human";

    if (cf.verifiedBot) {
      // Cloudflare verified automated crawler (Googlebot, Bing, etc.)
      isBot = 1;
      botReason = "verified_bot";
    } else if (!userAgent || BOT_UA_REGEX.test(userAgent)) {
      // User-Agent matches crawler or scraper
      isBot = 1;
      botReason = "crawler_ua";
    } else if (data.is_webdriver === true) {
      // Controlled by automated software (Selenium, Puppeteer)
      isBot = 1;
      botReason = "webdriver";
    }

    // Insert into Cloudflare D1
    await env.DB.prepare(
      `INSERT INTO analytics_events (
        event_type, country, city, device_type, ip_address, is_bot, bot_reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
      .bind(eventType, country, city, deviceType, ipAddress, isBot, botReason)
      .run();

    return new Response(JSON.stringify({ success: true, is_bot: Boolean(isBot) }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal Error", message: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Handle CORS Preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    }
  });
}
