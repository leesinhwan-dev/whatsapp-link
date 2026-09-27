# Free Hosting & Deployment Guide: WhatsApp Direct Link Generator

A complete step-by-step guide for hosting the **WhatsApp Direct Link & QR Generator** (`index.html`) for free using **Cloudflare Pages** (Recommended) or **GitHub Pages**, along with DNS & custom domain configurations.

---

## 📊 Comparison at a Glance

| Feature | 🏆 **Cloudflare Pages** *(Recommended)* | **GitHub Pages** |
| :--- | :--- | :--- |
| **Cost** | **100% Free** | **100% Free** |
| **Bandwidth** | **Unlimited** | 100 GB / month soft limit |
| **Global Network** | Cloudflare Anycast CDN (300+ edge cities) | Fastly CDN behind GitHub |
| **Custom Domain SSL** | Automatic Universal SSL, HTTP/3, 0-Config | Automatic Let's Encrypt |
| **Free Subdomain** | `your-project.pages.dev` | `username.github.io/repo-name` |
| **Deployment Trigger** | Instant auto-deploy on `git push` or Drag & Drop | Auto-deploy on `git push` |

---

## ❓ FAQ: Can I use Cloudflare for default GitHub domains (`github.io`)?

- **No, not on `*.github.io` directly:** The `github.io` domain is owned by GitHub, so you cannot add it directly into your Cloudflare account dashboard.
- **Yes, if you have a Custom Domain (e.g., `mywalink.com`):**
  1. Add your custom domain to Cloudflare.
  2. In Cloudflare DNS, add a `CNAME` pointing to `username.github.io` with the **Orange Cloud (Proxied)** enabled.
  3. In your GitHub repository settings, set your Custom Domain to `mywalink.com`.
  4. Now Cloudflare proxies traffic, provides DDoS protection, and edge caches your GitHub Pages site.

---

## 🚀 Option 1: Deploy with Cloudflare Pages (Recommended)

Cloudflare Pages provides the fastest global delivery, zero bandwidth caps, and seamless custom domain integration.

### Method A: GitHub Actions CI/CD (Fully Automated Pages + Worker)

We've set up [`.github/workflows/deploy.yml`](file:///Users/leesinhwan/Development/whatsapp-link/.github/workflows/deploy.yml). Every time you run `git push origin main`, GitHub Actions automatically builds and deploys both **Cloudflare Pages** and the **Cron Reporter Worker**!

#### 1. Add Secrets to your GitHub Repository:
In your GitHub repo &rarr; **Settings** &rarr; **Secrets and variables** &rarr; **Actions** &rarr; **New repository secret**:
- `CLOUDFLARE_API_TOKEN`: Create at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) (use the **Edit Cloudflare Workers** template).
- `CLOUDFLARE_ACCOUNT_ID`: Found in your Cloudflare dashboard URL or right-hand sidebar of **Workers & Pages**.
- `DISCORD_WEBHOOK_URL`: Your Discord webhook URL.

#### 2. Initialize Git & Push:
```bash
git init
git add .
git commit -m "feat: setup whatsapp link generator with analytics and gitflow"
git branch -M main
git remote add origin https://github.com/<your-username>/whatsapp-link.git
git push -u origin main
```
As soon as you push, open the **Actions** tab in GitHub to watch your deployment run automatically.

---

### Method B: Cloudflare Pages Native Git Connection (Zero-Config)

If you don't want to deal with GitHub Actions API tokens:

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/whatsapp-link.git
   git push -u origin main
   ```

2. **Connect to Cloudflare Dashboard:**
   - Log in to [dash.cloudflare.com](https://dash.cloudflare.com/).
   - Navigate to **Workers & Pages** &rarr; **Create application** &rarr; **Pages** tab.
   - Click **Connect to Git** and authorize GitHub.
   - Select your repository (`whatsapp-link`).

3. **Configure Build Settings:**
   - **Project Name:** `whatsapp-link`
   - **Production Branch:** `main`
   - **Framework preset:** `None`
   - **Build command:** *(leave empty)*
   - **Build output directory:** `.` *(or `/` for root)*

4. **Deploy:**
   - Click **Save and Deploy**.
   - Cloudflare will automatically build and deploy every time you do `git push origin main`!

---

### Method B: Direct Upload (No Git Required)

1. Open [Cloudflare Pages Dashboard](https://dash.cloudflare.com/) &rarr; **Workers & Pages** &rarr; **Create application** &rarr; **Pages**.
2. Select **Upload assets**.
3. Name your project and drag & drop the folder containing `index.html`.
4. Click **Deploy Site**.

---

## 🐙 Option 2: Deploy with GitHub Pages

If you want to host directly inside GitHub without creating a Cloudflare account:

1. **Create a GitHub Repository:**
   - Go to [github.com/new](https://github.com/new).
   - Name it `whatsapp-link` (Public or Private).

2. **Push the code:**
   ```bash
   cd /Users/leesinhwan/Development/_.playground/whatsapp-link
   git init
   git add .
   git commit -m "feat: deploy whatsapp link generator"
   git branch -M main
   git remote add origin https://github.com/<your-username>/whatsapp-link.git
   git push -u origin main
   ```

3. **Enable GitHub Pages:**
   - Go to your repository on GitHub.
   - Click **Settings** &rarr; **Pages** (in the left sidebar).
   - Under **Build and deployment** &rarr; **Source**, select **Deploy from a branch**.
   - Under **Branch**, select `main` and root `/(root)`.
   - Click **Save**.

4. **Access your site:**
   - Within 1–2 minutes, your site will be live at:
     `https://<your-username>.github.io/whatsapp-link/`

---

## 🌐 Setting Up a Custom Domain

### On Cloudflare Pages:
1. In Cloudflare Dashboard, open your Pages project &rarr; **Custom domains** tab.
2. Click **Set up a custom domain**.
3. Enter your domain (e.g., `link.yourdomain.com` or `yourdomain.com`).
4. Cloudflare will automatically configure the DNS records and issue an SSL certificate in seconds.

### On GitHub Pages (with Cloudflare DNS):
1. In GitHub Repository &rarr; **Settings** &rarr; **Pages** &rarr; **Custom domain**, enter your domain name (e.g., `wa.yourdomain.com`) and click **Save**.
2. Open your Cloudflare DNS dashboard for `yourdomain.com`:
   - Add a `CNAME` record:
     - **Name:** `wa` (or `@` for apex)
     - **Target:** `<your-username>.github.io`
     - **Proxy status:** Proxied (Orange cloud ☁️)
3. In GitHub Pages settings, check **Enforce HTTPS**.

---

## 📈 Edge Analytics & Daily Discord Reports (Cloudflare D1 + Worker)

The project includes built-in, 100% free serverless analytics using **Cloudflare D1** (edge SQLite) and automated daily notification digests sent straight to your **Discord channel**.

### 📋 What Gets Tracked
- **Page Views** (`page_view`)
- **Links Created** (`link_generated`)
- **Links Copied** (`copy_link`)
- **Direct WhatsApp Chat Opened** (`open_whatsapp`)
- **QR Code Rendered** (`show_qr`)
- **Geographic distribution** (Country & City via Cloudflare's edge headers)
- **Device category** (Mobile vs. Desktop)

---

### Step 1: Create the Cloudflare D1 Database

You can do this either via the Cloudflare Dashboard or Wrangler CLI:

#### Via Cloudflare Dashboard:
1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com/).
2. Navigate to **Storage & Databases** &rarr; **D1 SQL Database**.
3. Click **Create database** &rarr; Name it `wa_analytics`.
4. Open the created database &rarr; Click **Console** tab &rarr; Paste and execute the SQL from [`schema.sql`](file:///Users/leesinhwan/Development/whatsapp-link/schema.sql).

#### Or via Terminal:
```bash
# Create D1 database
npx wrangler d1 create wa_analytics

# Apply table schema and index
npx wrangler d1 execute wa_analytics --file=./schema.sql --remote
```
*(Make note of the `database_id` output by Wrangler).*

---

### Step 2: Bind D1 to Cloudflare Pages (`/api/track`)

To let your website write events to D1:

1. In Cloudflare Dashboard, go to **Workers & Pages** &rarr; click your `whatsapp-link` Pages project.
2. Go to **Settings** &rarr; **Functions** tab.
3. Scroll down to **D1 Database Bindings** &rarr; Click **Add binding**:
   - **Variable name:** `DB` *(Must be uppercase `DB`)*
   - **D1 database:** Select `wa_analytics`
4. Click **Save**.
5. Trigger a new deployment (or `git push`) so Pages picks up the new database binding.

---

### Step 3: Create a Discord Webhook

1. Open your Discord server &rarr; go to the channel where you want daily reports (e.g., `#analytics`).
2. Click **Channel Settings (⚙️)** &rarr; **Integrations** &rarr; **Webhooks** &rarr; **New Webhook**.
3. Name it `WhatsApp Link Bot` and copy the **Webhook URL** (`https://discord.com/api/webhooks/...`).

---

### Step 4: Deploy the Daily Cron Reporter Worker

Inside the [`cron-reporter/`](file:///Users/leesinhwan/Development/whatsapp-link/cron-reporter) directory:

1. Open [`cron-reporter/wrangler.toml`](file:///Users/leesinhwan/Development/whatsapp-link/cron-reporter/wrangler.toml) and paste your D1 `database_id`:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "wa_analytics"
   database_id = "YOUR_ACTUAL_D1_DATABASE_ID"
   ```

2. Set your Discord Webhook secret and deploy:
   ```bash
   cd cron-reporter

   # Add secret securely (paste your Discord webhook URL when prompted)
   npx wrangler secret put DISCORD_WEBHOOK_URL

   # Deploy the worker to Cloudflare
   npx wrangler deploy
   ```

3. **Verify Immediately:**
   Once deployed, test sending a notification on demand by opening in your browser:
   `https://wa-link-cron-reporter.dev-leesinhwan.workers.dev/test-report`
   
   Check your Discord channel — you should instantly see your rich analytics card!

4. **Schedule:**
   The worker automatically executes every day at **16:00 UTC** (**00:00 midnight UTC+8 / Malaysia Time**) and posts the 24-hour summary.

---

## 🛠 Post-Deployment Verification Checklist

- [ ] **SEO Meta Tags:** Confirm `<title>`, Open Graph tags, and Twitter cards render properly when sharing links on social media or WhatsApp.
- [ ] **QR Code Generation:** Test with local numbers (e.g. `0164210987`), international numbers (e.g. `+60164210987`), and usernames (`@username`).
- [ ] **Language Toggle:** Verify automatic system language detection and manual switching (`EN` / `中文`).
- [ ] **Theme Switcher:** Check light and dark modes across mobile and desktop viewports.
- [ ] **Telemetry Ingestion:** Click "Copy Link" or "Open Chat" on your deployed site, then check D1 database console (`SELECT * FROM analytics_events ORDER BY id DESC LIMIT 5`).
- [ ] **Discord Daily Digest:** Trigger `/test-report` on the cron reporter worker and confirm Discord message arrival.
