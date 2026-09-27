-- D1 Database Schema for WhatsApp Link Generator Analytics

CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,          -- 'page_view', 'link_generated', 'copy_link', 'open_whatsapp', 'show_qr'
  country TEXT,                      -- e.g. 'MY', 'SG', 'US'
  city TEXT,                         -- e.g. 'Kuala Lumpur', 'Singapore'
  device_type TEXT,                  -- 'mobile', 'desktop', 'tablet'
  ip_address TEXT,                   -- Client IP address (from CF-Connecting-IP)
  is_bot INTEGER DEFAULT 0,          -- 0 = Real Human, 1 = Bot / Automated Crawler
  bot_reason TEXT,                   -- Reason if detected as bot (e.g. 'verified_bot', 'crawler_ua', 'webdriver')
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for speedy aggregation queries
CREATE INDEX IF NOT EXISTS idx_events_created_at_bot ON analytics_events(created_at, is_bot);
CREATE INDEX IF NOT EXISTS idx_events_ip_created ON analytics_events(ip_address, created_at);
