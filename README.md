# ConnectWorks Low Voltage Solutions — Website

A modern, fast, conversion-focused marketing site for **ConnectWorks Low Voltage Solutions**, a commercial low voltage & security company serving **San Diego County**.

Built as a lightweight static site (HTML + CSS + vanilla JS) with a single **Vercel serverless function** that saves quote requests into **Supabase**. Loads fast — which matters for converting **Meta / Google Ads** traffic into calls, quote forms, and consultations.

---

## ✨ Highlights

- **Mobile-first** & fully responsive (mobile → desktop).
- **Conversion-optimized:** sticky header CTA, sticky bottom call/quote bar on mobile, click-to-call everywhere, a validated quote form, and CTAs at the top, middle, and bottom.
- **Lead capture → Supabase:** the form posts to `/api/lead`, which stores each lead in your Supabase database (service-role key stays server-side, never in the browser).
- **Premium, on-brand design** (intense blue / navy-black / white / gray) — clean, technical, corporate.
- **Zero external image dependencies:** all graphics are custom SVG (logo, icons, hero scene, gallery) so nothing ever appears broken. Swap in real photos when ready.
- **SEO-ready:** meta description, canonical, Open Graph + Twitter cards, `LocalBusiness` JSON-LD, `robots.txt`, `sitemap.xml`.
- **Accessible:** skip link, focus styles, ARIA labels, `prefers-reduced-motion`, good contrast.

## 🗂 Project structure

```
.
├── index.html              # The full one-page site
├── css/styles.css          # All styling (design tokens + responsive)
├── js/main.js              # Nav, smooth scroll, reveal, form → /api/lead
├── api/lead.js             # Vercel serverless function → inserts into Supabase
├── supabase/schema.sql     # Run once in Supabase to create the `leads` table
├── assets/
│   ├── favicon.svg · logo.svg · og-image.svg
│   └── gallery/            # Project showcase tiles (replace with real photos)
├── package.json            # Declares @supabase/supabase-js for the function
├── vercel.json             # Routing + security headers + asset caching
├── .env.example            # Names of the env vars Vercel needs
├── robots.txt · sitemap.xml
└── README.md
```

---

## 🚀 Deploy on Vercel + Supabase (≈ 5 minutes)

> The repo is already on GitHub, so the fastest path is to import it into Vercel and add two environment variables.

### 1) Create the Supabase database
1. Go to **https://supabase.com** → create a project (free tier is fine).
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. This creates the private `leads` table.
3. Go to **Project Settings → API** and copy two values:
   - **Project URL** → this is `SUPABASE_URL`
   - **`service_role` secret** (under *Project API keys*) → this is `SUPABASE_SERVICE_ROLE_KEY`
   - ⚠️ The `service_role` key is a secret. Only paste it into Vercel env vars — never into the website code or the browser.

### 2) Import the repo into Vercel
1. Go to **https://vercel.com** → **Add New… → Project**.
2. **Import** the GitHub repo `Fmorishita/connetc-works`.
3. Framework preset: **Other** (no build step needed). Leave defaults.
4. Before deploying, open **Environment Variables** and add:

   | Name | Value |
   |------|-------|
   | `SUPABASE_URL` | your Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | your `service_role` secret |

5. Click **Deploy**. Vercel installs `@supabase/supabase-js`, publishes the static site, and turns `api/lead.js` into a live endpoint.
6. You get a URL like `https://connetc-works.vercel.app` — that's your live site. 🎉

### 3) Test it
Open the site, submit the quote form, then check **Supabase → Table Editor → `leads`** — your test submission should appear. You can also add a custom domain (e.g. `connectworks-sd.com`) in **Vercel → Settings → Domains**.

> **Tip — deploy from the branch first:** during review you can deploy the `claude/charming-ptolemy-LQiZc` branch to get a preview URL, then point production at `main` after merging the PR.

### Optional: deploy from the CLI
```bash
npm i -g vercel
vercel login
vercel link
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel --prod
# local dev with functions: `vercel dev` (put the vars in a local .env first)
```

---

## 🎨 Customize

- **Phone / email / address:** update the `tel:`/`mailto:` links and the JSON-LD block in `index.html` (currently **619-786-1810**, **info@connectworks-sd.com**, San Diego County).
- **Social links:** replace the placeholder URLs in the footer and the JSON-LD `sameAs`.
- **Real photos:** drop images into `assets/gallery/` and update the `<img src>` paths in the Projects section. The hero visual and service cards can also be swapped for photos.
- **Reviews:** replace the placeholder testimonials with your verified Google/Yelp quotes.
- **Colors:** all brand colors are CSS variables at the top of `css/styles.css`.
- **Domain:** the site references **www.connectworks-sd.com** (canonical, OG image, sitemap) — update those absolute URLs if production differs.

## 🔒 Notes

- The `leads` table has Row Level Security enabled with **no public policies**, so only the serverless function (using the service-role key) can read/write it — your leads stay private.
- Secrets live only in Vercel env vars; `.env*` is git-ignored. Never commit real keys.
- Want email/SMS notifications on each lead? Add a Supabase **Database Webhook** or an email step inside `api/lead.js`.
