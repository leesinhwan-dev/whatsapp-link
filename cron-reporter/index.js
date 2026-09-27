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
  const humanViews = stats.humanPageViews || 0;
  const uniqueHumans = stats.uniqueHumanIps || 0;
  const totalViews = stats.totalPageViews || 0;
  const botCount = stats.botCount || 0;

  const eventCounts = stats.humanEvents || {};
  const generated = eventCounts["link_generated"] || 0;
  const copied = eventCounts["copy_link"] || 0;
  const opened = eventCounts["open_whatsapp"] || 0;
  const qrShown = eventCounts["show_qr"] || 0;

  // Format Countries
  let countryText = "No regional data yet";
  if (stats.countries && stats.countries.length > 0) {
    countryText = stats.countries
      .map(c => `${countryToFlag(c.country)}: **${c.count}** views (${c.unique_ips} unique IPs)`)
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

  // Conversion rate (link copied / real human views)
  const conversionRate = humanViews > 0 ? ((copied / humanViews) * 100).toFixed(1) : "0.0";

  return {
    username: "WhatsApp Link Bot",
    avatar_url: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg",
    embeds: [
      {
        title: "📊 Daily Site & Usage Analytics",
        description: `Verified Human Activity in the last **${periodHours} hours**`,
        color: 0x25d366, // WhatsApp Green
        fields: [
          {
            name: "👤 Real Human Traffic",
            value: `**${uniqueHumans}** Unique IPs\n**${humanViews}** Page Views`,
            inline: true
          },
          {
            name: "🤖 Filtered Traffic",
            value: `**${botCount}** Bots/Crawlers\n**${totalViews}** Total Hits`,
            inline: true
          },
          {
            name: "🎯 Conversion Rate",
            value: `**${conversionRate}%** Copied`,
            inline: true
          },
          {
            name: "⚡ Real Human Actions",
            value: [
              `✨ **${generated}** Links Generated`,
              `📋 **${copied}** Links Copied`,
              `💬 **${opened}** Direct WhatsApp Chats Opened`,
              `📱 **${qrShown}** QR Codes Displayed`
            ].join("\n"),
            inline: false
          },
          {
            name: "🌍 Top Human Regions",
            value: countryText,
            inline: false
          },
          {
            name: "💻 Human Devices",
            value: deviceText,
            inline: false
          }
        ],
        footer: {
          text: "Cloudflare D1 + IP Verification"
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

  // 1. Query traffic overview (separating Real Humans from Bots)
  const overview = await env.DB.prepare(
    `SELECT 
       COUNT(*) as total_events,
       SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) as total_page_views,
       SUM(CASE WHEN event_type = 'page_view' AND (is_bot IS NULL OR is_bot = 0) THEN 1 ELSE 0 END) as human_page_views,
       COUNT(DISTINCT CASE WHEN (is_bot IS NULL OR is_bot = 0) AND ip_address IS NOT NULL AND ip_address != 'Unknown' THEN ip_address END) as unique_human_ips,
       SUM(CASE WHEN is_bot = 1 THEN 1 ELSE 0 END) as bot_events
     FROM analytics_events 
     WHERE created_at >= ${timeFilter}`
  ).first();

  // 2. Query event counts for real humans
  const actionResults = await env.DB.prepare(
    `SELECT event_type, COUNT(*) as count 
     FROM analytics_events 
     WHERE created_at >= ${timeFilter} AND (is_bot IS NULL OR is_bot = 0)
     GROUP BY event_type`
  ).all();

  const humanEvents = {};
  for (const row of actionResults.results || []) {
    humanEvents[row.event_type] = row.count;
  }

  // 3. Query top 5 countries for real humans with unique IP count
  const countryResults = await env.DB.prepare(
    `SELECT 
       country, 
       COUNT(*) as count,
       COUNT(DISTINCT ip_address) as unique_ips
     FROM analytics_events 
     WHERE created_at >= ${timeFilter} AND (is_bot IS NULL OR is_bot = 0)
     GROUP BY country 
     ORDER BY count DESC 
     LIMIT 5`
  ).all();

  // 4. Query human device types
  const deviceResults = await env.DB.prepare(
    `SELECT device_type, COUNT(*) as count 
     FROM analytics_events 
     WHERE created_at >= ${timeFilter} AND (is_bot IS NULL OR is_bot = 0)
     GROUP BY device_type 
     ORDER BY count DESC`
  ).all();

  const stats = {
    totalEvents: overview?.total_events || 0,
    totalPageViews: overview?.total_page_views || 0,
    humanPageViews: overview?.human_page_views || 0,
    uniqueHumanIps: overview?.unique_human_ips || 0,
    botCount: overview?.bot_events || 0,
    humanEvents,
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
  // Runs automatically on Cloudflare edge schedule (12:00 AM midnight MYT)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sendDailyReport(env, 24));
  }
};
