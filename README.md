# ConnectWorks Low Voltage Solutions — Website

Modern, conversion-focused marketing site for **ConnectWorks Low Voltage Solutions**, a **commercial** low voltage & security company serving **San Diego County**.

Lightweight static site (HTML + CSS + vanilla JS) with one **Vercel serverless function** that saves quote requests into **Supabase**. Fast-loading and ready for a future **Meta Ads** stage (UTM capture, CTA tracking, pixel scaffolding, thank-you page).

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
| `HAS_LICENSES` | `false` shows "Professional Low Voltage Installations" / "Licensing info upon request". Set `true` (with `LICENSE_TEXT`) **only when Omar provides license/insurance numbers** → shows "Licensed & Insured". |
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
