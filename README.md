# ConnectWorks Low Voltage Solutions — Website

Modern, conversion-focused marketing site for **ConnectWorks Low Voltage Solutions**, a **commercial** low voltage & security company serving **San Diego County**.

Lightweight static site (HTML + CSS + vanilla JS) with one **Vercel serverless function** that saves quote requests into **Supabase**. Fast-loading and ready for a future **Meta Ads** stage (UTM capture, CTA tracking, pixel scaffolding, thank-you page).

It now includes an **admin CMS** (`/admin`) so the owner can edit content without code — see **[Admin panel (CMS)](#-admin-panel-cms)**.

---

## ✨ Highlights

- **Commercial-first positioning & copy** — built to attract restaurants, coffee shops, warehouses, auto shops, offices, retail, buildouts and property managers; gently filters tiny residential jobs.
- **Honesty-led messaging** — "honest recommendations, no unnecessary upsells", 10+ years experience, 1-year labor & equipment warranty.
- **Conversion-optimized** — sticky header CTA, sticky mobile call/quote bar, click-to-call, CTAs throughout, qualified lead form.
- **Lead capture → Supabase** with UTM tracking; thank-you state + optional `/thank-you.html`.
- **No invented claims** — no "24/7 monitoring", "500+ devices", "4.9 rating", or fake testimonials. Reviews render only when real ones are added.
- **Editable config block** (see below) for licenses, reviews, Meta Pixel.
- **SEO**: San-Diego-local title/description/keywords, OpenGraph + Twitter cards, `ProfessionalService` JSON-LD, `robots.txt`, `sitemap.xml`.
- **Brand logo** recreated as crisp SVG (interlocking blue/black "C" + RJ45 plug); themes for light header / dark footer.

## 🗂 Structure

```
index.html               # one-page site (config block in <head>)
thank-you.html           # optional ad-conversion landing (redirect target)
css/styles.css           # styles (tokens + responsive)
js/main.js               # nav, reveal, UTM, pixel, reviews, license, form
api/lead.js              # Vercel function → Supabase (resilient insert)
supabase/schema.sql            # full table (new projects)
supabase/migration_commercial.sql  # ADDs new columns to an existing table
assets/ (favicon, og-image, gallery/*)
vercel.json · package.json · .env.example · robots.txt · sitemap.xml
```

---

## ⚙️ Editable variables (in `index.html` → `window.CONNECTWORKS_CONFIG`)

| Variable | What it does |
|---|---|
| `HAS_LICENSES` | `false` shows honest "in progress / available on request" wording everywhere — including the **Licensing & Standards** section (C‑7, Alarm Company Operator shown as "in progress"). Set `true` **only when Omar provides license numbers** → flips badges and that section to "Licensed". |
| `REVIEWS` | Empty `[]` shows the safe reputation block (no fake reviews). Add real, verified `{name, meta, stars, quote}` objects to render testimonial cards. |
| `YELP_URL` / `GOOGLE_REVIEWS_URL` | When set, the "Read Our Reviews" button links to your public profile. |
| `META_PIXEL_ID` | Leave `""` for now. When set, loads Meta Pixel + fires `PageView` and a `Lead` event on submit. |
| `REDIRECT_TO_THANK_YOU` | `false` = inline thank-you message (default). `true` = redirect to `/thank-you.html` after submit. |

## 🚧 TODO before/at go-live

- **Logo:** `assets/favicon.svg` is a faithful **SVG recreation**. For pixel-perfect fidelity, replace it (and `assets/og-image.svg`) with Omar's official file.
- **Project photos:** replace placeholders in `assets/gallery/` with real photos (Security Cameras · Structured Cabling · Access Control · Intercom · Network & Wireless · Commercial AV · Service Vehicle), then update `src`/`alt` in the Projects section.
- **Reviews:** add real ones to `REVIEWS` (and a `YELP_URL`).
- **Licenses:** flip `HAS_LICENSES` when numbers are ready.
- **Social links:** replace the placeholder Facebook/LinkedIn/Instagram URLs in the footer.

---

## 🚀 Deploy (Vercel + Supabase)

Already connected to Vercel? Every branch/PR gets an automatic **preview URL** (check the PR's Vercel comment or your Vercel dashboard). To promote changes, merge to `main`.

**Database — run the migration (one time):** because the `leads` table already exists, open **Supabase → SQL Editor** and run [`supabase/migration_commercial.sql`](supabase/migration_commercial.sql). It safely **adds** the new columns (`business_type`, `project_type`, `timeline`, `budget`, `utm_*`). *(For a brand-new project, run `supabase/schema.sql` instead.)*

> Until the migration runs, the form still works — `api/lead.js` automatically falls back to saving the core fields so no lead is lost.

**Env vars (already set in Vercel):** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (service-role secret stays server-side only).

**Test:** submit the form → see the inline thank-you → confirm a new row in **Supabase → Table Editor → `leads`**.

## 🔮 Meta Ads readiness (no ads sold/served here)

- UTM params (`utm_source/medium/campaign/content/term`) are auto-captured from the URL, persisted, sent with each lead, and stored in Supabase.
- All primary buttons carry `data-cta` (`request-commercial-quote`, `call-now`) and emit `dataLayer` events + pixel events when a pixel is configured.
- Meta Pixel is scaffolded but **off** until you set `META_PIXEL_ID`; it fires `Lead` on successful submit.
- `/thank-you.html` is available as a URL-based conversion destination.

---

## 🛠 Admin panel (CMS)

A lightweight CMS so Omar can edit the site without touching code. Built **on the
existing static site** (no framework rewrite) using **Supabase** for Auth, the
database, and image storage. The public page reads content from Supabase and
**falls back to the built-in HTML** if the CMS is empty or unreachable — so the
site never breaks.

### What you can edit
General settings (company info, phone, email, social links, **license status**,
review rating, logo/favicon/OG image) · Hero · CTA banner · Trust badges ·
Services · Industries · Why-Choose-Us · Process · Problems · Projects/Gallery ·
Reviews · SEO · Leads (with status) · Media library · Icon picker.

### One-time setup (≈10 min)
1. **Create the tables:** Supabase → SQL Editor → run [`supabase/cms_schema.sql`](supabase/cms_schema.sql).
   It creates all content tables, security rules (RLS), the public `media` storage
   bucket, and seeds the current site content.
2. **Connect the site to Supabase:** open `js/cw-config.js` and paste your
   **anon/public key** (Supabase → Settings → API). The URL is already filled.
   *(The anon key is safe to expose — RLS only allows writes to logged-in admins.)*
3. **Create the admin user:** Supabase → Authentication → Users → **Add user**
   (email + password) and mark it confirmed. (There is no public sign-up — login only.)
4. Go to **`/admin`**, sign in, and start editing.

### How to use it
- **Edit text:** open a section (e.g. *Home / Hero*), change the fields, **Save**.
  Tip: in the H1, wrap the highlighted words in `**double asterisks**`.
- **Upload images:** any image field has **Choose / upload** → opens the Media
  Library (or use *Media Library* in the sidebar). Uploads go to Supabase Storage.
- **Change icons:** any icon field opens an **icon picker**; the chosen name is
  stored as a string and rendered on the site.
- **Add Services / Industries / Projects / Reviews:** open the section → **New** →
  fill in → Save. Use **Active** to show/hide and **sort order** to reorder.
  Delete asks for confirmation.
- **Licenses:** in *General Settings*, toggle **Has licenses?** — the site flips
  between "Licensed & Insured" and the professional / available-on-request text.
- **Leads:** the *Leads* tab lists form submissions and lets you set a status
  (new → contacted → quoted → won → lost).
- **Preview:** the **Preview site** button (top-right) opens the live site.

### Environment variables
| Where | Var | Purpose |
|---|---|---|
| `js/cw-config.js` | `SUPABASE_ANON_KEY` | Public read + admin auth (browser-safe) |
| Vercel env | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Lead-capture function (server-side) |
| Vercel env (optional) | `RESEND_API_KEY`, `LEAD_NOTIFY_EMAIL` | Email each lead (see above) |

### Deploy
Static site — deploy on Vercel as before. The CMS needs **no build step**.
After step 1–3 above, `/admin` works in production. Public content updates appear
on the next page load (no redeploy needed for content changes).

### Security
RLS: anyone can **read** content; only **authenticated** admins can write. Leads
are **not** publicly readable. Storage `media` bucket is public-read, admin-write.
The service-role key is never exposed to the browser (server-side function only).

### Known limitations / TODO
- **SEO** edits hydrate client-side (good for users & Google's JS rendering, not as
  strong as server-rendered). For perfect SEO control, a Next.js build would be needed.
- Public hydration currently covers Hero, CTA banner, Services, Industries,
  Why-Us, Process, Problems, Reviews, Trust badges, contact info, social links,
  license text and SEO. **Footer link lists and the contact-form field options**
  are editable in the data model but still render from static HTML — wiring those
  to the CMS is the next step (same `data-cw` / renderer pattern).
- Projects/Gallery is fully editable in admin; wiring it to replace the public
  gallery tiles is a follow-up (pattern identical to Services).

---

## 🧰 Operations Hub (`/ops`) — Phase 1: Schedule + Routes

Private internal tool for Omar (separate from the public CMS at `/admin`). Same
stack (static SPA + Supabase Auth/DB), same login users. **Phase 1** ships:
**Dashboard, Leads, Calendar/Visits, Route Planner (basic mode), Settings**, plus
the full database for **Phase 2 (Quotes + PDF, Follow-ups, Projects, Materials)**.

### Setup (one time)
1. Supabase → SQL Editor → run [`supabase/ops_schema.sql`](supabase/ops_schema.sql)
   (creates all Ops tables, private RLS, and seed; extends `leads`).
2. Use the same admin user you created for the CMS. Go to **`/ops`** and sign in.
3. In **Settings**, set your **Base address** (used as the route start/end).
4. *(Optional)* Google Maps API key enables auto-optimization later; without it the
   Route Planner runs in **basic mode** (manual order + full multi-stop Google Maps link).

### How to…
- **Add a lead:** Leads → *New lead* (or they arrive automatically from the website form).
- **Schedule a visit:** open a lead → *Schedule Site Visit* (prefills the data), or Calendar → *New visit*.
- **Optimize a route:** Route Planner → pick the date → set Start/End → reorder stops (▲▼) → **Open Route in Google Maps** (multi-stop) → **Save Route Order**.
- **Open in Google Maps:** every lead/visit has a Maps button; the planner builds the full route link.
- **Print the day:** Route Planner → **Print Daily Route** (client, address, phone, service, priority, time, notes).
- **Settings:** company info, base address, defaults, team members.

### Security
All Ops tables are **authenticated-only** (RLS) — no public access. Leads stay private.

### Phase 2 (next)
Quote Builder (line items, totals, templates) + professional **PDF** + Follow-up
reminders + Projects + Materials checklist. Tables already created & seeded
(quote templates included), so Phase 2 is UI only.
