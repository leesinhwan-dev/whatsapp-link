-- D1 Database Schema for WhatsApp Link Generator Analytics

CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,          -- 'page_view', 'link_generated', 'copy_link', 'open_whatsapp', 'show_qr'
  country TEXT,                      -- e.g. 'MY', 'SG', 'US'
  city TEXT,                         -- e.g. 'Kuala Lumpur', 'Singapore'
  device_type TEXT,                  -- 'mobile', 'desktop', 'tablet'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for speedy daily aggregation queries
CREATE INDEX IF NOT EXISTS idx_events_created_at_type ON analytics_events(created_at, event_type);
