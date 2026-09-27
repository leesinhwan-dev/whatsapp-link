// Cloudflare Pages Function: /api/track
// Ingests anonymous usage events directly into Cloudflare D1

const ALLOWED_EVENTS = [
  "page_view",
  "link_generated",
  "copy_link",
  "open_whatsapp",
  "show_qr"
];

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // Check if D1 binding exists
    if (!env.DB) {
      return new Response(
        JSON.stringify({ error: "Database binding 'DB' not configured in Pages settings" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await request.json().catch(() => ({}));
    const eventType = data.event;

    if (!eventType || typeof eventType !== "string" || !ALLOWED_EVENTS.includes(eventType)) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing event type" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Extract geo headers automatically provided by Cloudflare's edge network
    const cf = request.cf || {};
    const country = (cf.country || "XX").slice(0, 5);
    const city = (cf.city || "Unknown").slice(0, 50);

    // Detect device category from User-Agent
    const userAgent = request.headers.get("user-agent") || "";
    let deviceType = "desktop";
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      deviceType = "tablet";
    } else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(userAgent)) {
      deviceType = "mobile";
    }

    // Insert into D1 (SQLite at the edge)
    await env.DB.prepare(
      `INSERT INTO analytics_events (event_type, country, city, device_type, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    )
      .bind(eventType, country, city, deviceType)
      .run();

    return new Response(JSON.stringify({ success: true }), {
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
