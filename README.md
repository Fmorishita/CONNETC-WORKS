# ConnectWorks Low Voltage Solutions — Website

A modern, fast, conversion-focused marketing site for **ConnectWorks Low Voltage Solutions**, a commercial low voltage & security company serving **San Diego County**.

Built as a lightweight, **dependency-free static site** (HTML + CSS + vanilla JS) so it loads fast — which matters for converting **Meta / Google Ads** traffic into calls, quote forms, and consultations.

---

## ✨ Highlights

- **Mobile-first** & fully responsive (mobile → desktop).
- **Conversion-optimized:** sticky header CTA, sticky bottom call/quote bar on mobile, click-to-call everywhere, a validated quote form, and CTAs at the top, middle, and bottom of the page.
- **Premium, on-brand visual design** using the logo palette: intense blue, navy/black, white, and light grays — with a clean, technical, corporate feel.
- **Zero external image dependencies.** All graphics are custom inline/SVG (logo, icons, hero scene, gallery tiles) so nothing ever appears broken. Swap in real project photos whenever you're ready.
- **SEO-ready:** semantic HTML, meta description, canonical, Open Graph + Twitter cards (for ad/link previews), `LocalBusiness` JSON-LD schema, `robots.txt`, and `sitemap.xml`.
- **Accessible:** skip link, keyboard focus styles, ARIA labels, `prefers-reduced-motion` support, and good color contrast.

## 📄 Page sections

1. **Hero** — logo, headline, subtitle, dual CTAs (Free Estimate + Call Now), animated security-camera visual, and trust badges.
2. **Services** — Video Surveillance · Access Control · Intercom & Communication · Structured Cabling · Fiber Optics · Network & Wireless · Commercial Audio & Video.
3. **Why ConnectWorks** — six differentiators.
4. **Industries served** — offices, warehouses, retail, restaurants, schools, churches, multi-tenant, property managers, medical.
5. **Process** — 4 steps: Free Consultation → Site Assessment → Custom Proposal → Installation & Support.
6. **Reviews** — Google/Yelp-style review cards with a 4.9★ summary.
7. **Projects / Gallery** — installation showcase grid.
8. **CTA banner** — strong closing call to action.
9. **Contact** — quote form + full contact details, then the footer.

---

## 🗂 Project structure

```
.
├── index.html              # The full one-page site
├── css/styles.css          # All styling (design tokens + responsive)
├── js/main.js              # Nav, smooth scroll, scroll reveal, form, back-to-top
├── assets/
│   ├── favicon.svg         # Brand mark / favicon
│   ├── logo.svg            # Horizontal logo lockup (for sharing/printing)
│   ├── og-image.svg        # Social/ads share image
│   └── gallery/            # Project showcase tiles (replace with real photos)
├── robots.txt
├── sitemap.xml
└── README.md
```

## 🚀 Run / preview locally

It's a static site — just open `index.html`, or serve it:

```bash
# Python
python3 -m http.server 8080
# then visit http://localhost:8080
```

## 🌐 Deploy (any static host)

Upload the repo root to **Netlify, Vercel, Cloudflare Pages, GitHub Pages,** or any web host.

- **Netlify** is the quickest for lead capture: the quote form already has `data-netlify="true"` and a hidden `form-name`, so submissions show up in your Netlify dashboard with no backend.
- On other hosts, point the form at a service like **Formspree** (see below).

## 📥 Make the quote form deliver leads

The form (`#quoteForm`) validates on the client and currently shows a success message without sending anywhere. Pick one:

- **Netlify Forms** — deploy on Netlify; submissions are captured automatically.
- **Formspree** — set the form `action` to your endpoint:
  ```html
  <form ... action="https://formspree.io/f/yourID" method="POST">
  ```
- **Email/CRM/Zapier webhook** — point `action` at your endpoint; the JS lets the browser submit normally once a real `action` is set.

## 🎨 Customize

- **Phone / email / address:** update the `tel:`/`mailto:` links and the JSON-LD block in `index.html` (currently **619-786-1810**, **info@connectworks-sd.com**, San Diego County).
- **Social links:** replace the `#`/placeholder URLs in the footer (`assets`/footer Facebook, LinkedIn, Instagram) and in the JSON-LD `sameAs`.
- **Real photos:** drop images into `assets/gallery/` and update the `<img src>` paths in the Projects section. The hero visual and service cards can also be swapped for photos.
- **Reviews:** replace the placeholder testimonials with your verified Google/Yelp quotes.
- **Colors:** all brand colors are CSS variables at the top of `css/styles.css` (`--blue-600`, `--cyan-400`, etc.).
- **Logo:** if you have the official logo file, replace `assets/logo.svg` / `assets/favicon.svg` and the inline mark in the header/footer.

> Note: the site references **www.connectworks-sd.com** throughout (canonical, OG image, sitemap). Update those absolute URLs if the production domain differs.
