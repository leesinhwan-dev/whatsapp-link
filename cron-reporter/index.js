// Cloudflare Worker: Daily Analytics Reporter -> Discord Webhook

// Convert 2-letter ISO country code into emoji flag (e.g. "MY" -> 🇲🇾)
function countryToFlag(countryCode) {
  if (!countryCode || countryCode === "XX" || countryCode === "Unknown" || countryCode.length !== 2) {
    return "🌐 " + (countryCode || "Unknown");
  }
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints) + " " + countryCode;
}

// Format the analytics data into a sleek Discord Webhook Embed
function buildDiscordEmbed(stats, periodHours = 24) {
  const eventCounts = stats.events || {};
  const views = eventCounts["page_view"] || 0;
  const generated = eventCounts["link_generated"] || 0;
  const copied = eventCounts["copy_link"] || 0;
  const opened = eventCounts["open_whatsapp"] || 0;
  const qrShown = eventCounts["show_qr"] || 0;

  // Format Countries
  let countryText = "No regional data yet";
  if (stats.countries && stats.countries.length > 0) {
    countryText = stats.countries
      .map(c => `${countryToFlag(c.country)}: **${c.count}** (${Math.round((c.count / (stats.totalEvents || 1)) * 100)}%)`)
      .join("\n");
  }

  // Format Devices
  let deviceText = "No device data yet";
  if (stats.devices && stats.devices.length > 0) {
    const deviceIcons = { mobile: "📱", desktop: "💻", tablet: "📟" };
    deviceText = stats.devices
      .map(d => `${deviceIcons[d.device_type] || "🔹"} ${d.device_type}: **${d.count}**`)
      .join("  |  ");
  }

  // Conversion rate (link copied / views)
  const conversionRate = views > 0 ? ((copied / views) * 100).toFixed(1) : "0.0";

  return {
    username: "WhatsApp Link Bot",
    avatar_url: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg",
    embeds: [
      {
        title: "📊 Daily Site & Usage Analytics",
        description: `Summary of activity in the last **${periodHours} hours**`,
        color: 0x25d366, // WhatsApp Green
        fields: [
          {
            name: "👁️ Traffic",
            value: `**${views}** Total Visits`,
            inline: true
          },
          {
            name: "✨ Links Created",
            value: `**${generated}** Generated`,
            inline: true
          },
          {
            name: "🎯 Conversion",
            value: `**${conversionRate}%** Copied`,
            inline: true
          },
          {
            name: "⚡ Key User Actions",
            value: [
              `📋 **${copied}** Links Copied`,
              `💬 **${opened}** Direct WhatsApp Chats Opened`,
              `📱 **${qrShown}** QR Codes Displayed`
            ].join("\n"),
            inline: false
          },
          {
            name: "🌍 Top Visitor Regions",
            value: countryText,
            inline: false
          },
          {
            name: "💻 Devices",
            value: deviceText,
            inline: false
          }
        ],
        footer: {
          text: "Cloudflare D1 + Edge Workers"
        },
        timestamp: new Date().toISOString()
      }
    ]
  };
}

// Fetch analytics from D1 and send the report to Discord
async function sendDailyReport(env, hours = 24) {
  if (!env.DB) {
    throw new Error("Missing D1 database binding 'DB'");
  }
  if (!env.DISCORD_WEBHOOK_URL) {
    throw new Error("Missing environment secret 'DISCORD_WEBHOOK_URL'");
  }

  const timeFilter = `datetime('now', '-${hours} hours')`;

  // 1. Query counts per event type
  const eventResults = await env.DB.prepare(
    `SELECT event_type, COUNT(*) as count 
     FROM analytics_events 
     WHERE created_at >= ${timeFilter}
     GROUP BY event_type`
  ).all();

  const events = {};
  let totalEvents = 0;
  for (const row of eventResults.results || []) {
    events[row.event_type] = row.count;
    totalEvents += row.count;
  }

  // 2. Query top 5 countries
  const countryResults = await env.DB.prepare(
    `SELECT country, COUNT(*) as count 
     FROM analytics_events 
     WHERE created_at >= ${timeFilter}
     GROUP BY country 
     ORDER BY count DESC 
     LIMIT 5`
  ).all();

  // 3. Query device types
  const deviceResults = await env.DB.prepare(
    `SELECT device_type, COUNT(*) as count 
     FROM analytics_events 
     WHERE created_at >= ${timeFilter}
     GROUP BY device_type 
     ORDER BY count DESC`
  ).all();

  const stats = {
    events,
    totalEvents,
    countries: countryResults.results || [],
    devices: deviceResults.results || []
  };

  // Build and post to Discord
  const payload = buildDiscordEmbed(stats, hours);

  const res = await fetch(env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Discord API returned ${res.status}: ${errorText}`);
  }

  return { success: true, stats };
}

export default {
  // Purely private Cron Trigger handler
  // Only Cloudflare's internal scheduler can invoke this; it cannot be called over the public web
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sendDailyReport(env, 24));
  }
};
