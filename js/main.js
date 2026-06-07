/* =========================================================
   ConnectWorks Low Voltage Solutions — main.js
   ========================================================= */
(function () {
  'use strict';

  var doc = document;
  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };

  var CFG = window.CONNECTWORKS_CONFIG || {};

  /* ---------- Current year ---------- */
  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- License text (editable via CONFIG.HAS_LICENSES) ---------- */
  (function applyLicense() {
    var licensed = CFG.HAS_LICENSES === true;
    $$('[data-license]').forEach(function (el) {
      var on = el.dataset.licenseOn || CFG.LICENSE_TEXT || 'Licensed & Insured';
      var off = el.dataset.licenseOff || CFG.NO_LICENSE_TEXT || 'Professional Low Voltage Installations';
      // Footer gets a slightly richer non-claiming line by default
      if (!licensed && el.classList.contains('footer-license') && !el.dataset.licenseOff) {
        off = (CFG.NO_LICENSE_TEXT || 'Professional Low Voltage Installations') + ' · Licensing information available upon request';
      }
      el.textContent = licensed ? on : off;
    });
  })();

  /* ---------- Reviews: render ONLY if real ones are configured ---------- */
  (function applyReviews() {
    var grid = $('#reviewsGrid');
    var reputation = $('#reputationBlock');
    var reviews = Array.isArray(CFG.REVIEWS) ? CFG.REVIEWS : [];

    // Rating summary (only if a REAL rating is configured)
    var summary = $('#ratingSummary');
    if (summary && CFG.REVIEW_RATING) {
      var rating = parseFloat(CFG.REVIEW_RATING) || 0;
      var filled = Math.max(1, Math.min(5, Math.round(rating)));
      var sEl = $('#ratingStars');
      if (sEl) { var s = ''; for (var k = 0; k < filled; k++) s += '<svg class="ic"><use href="#i-star"/></svg>'; sEl.innerHTML = s; }
      var vEl = $('#ratingValue'); if (vEl) vEl.textContent = CFG.REVIEW_RATING + ' / 5';
      var lEl = $('#ratingLabel'); if (lEl) lEl.textContent = CFG.REVIEW_RATING_LABEL || '';
      summary.hidden = false;
    }

    // Wire the reviews link if a public profile URL is provided
    var link = $('#reviewsLink');
    if (link) {
      if (CFG.YELP_URL) { link.href = CFG.YELP_URL; link.lastChild && (link.innerHTML = link.innerHTML.replace('Read Our Reviews', 'Read Our Reviews on Yelp')); }
      else if (CFG.GOOGLE_REVIEWS_URL) { link.href = CFG.GOOGLE_REVIEWS_URL; link.innerHTML = link.innerHTML.replace('Read Our Reviews', 'Read Our Google Reviews'); }
      else { link.setAttribute('href', '#contact'); link.removeAttribute('target'); }
    }

    if (!grid || !reviews.length) return; // keep safe reputation block

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
    grid.innerHTML = reviews.map(function (r) {
      var n = Math.max(0, Math.min(5, parseInt(r.stars, 10) || 5));
      var stars = '';
      for (var i = 0; i < n; i++) stars += '<svg class="ic"><use href="#i-star"/></svg>';
      var initial = (r.name || '★').trim().charAt(0).toUpperCase() || '★';
      return '<figure class="card review-card">' +
        '<svg class="review-card__quote ic" aria-hidden="true"><use href="#i-quote"/></svg>' +
        '<span class="stars stars--sm" aria-label="' + n + ' out of 5 stars">' + stars + '</span>' +
        '<blockquote>' + esc(r.quote) + '</blockquote>' +
        '<figcaption><span class="avatar">' + esc(initial) + '</span><span><strong>' + esc(r.name) + '</strong><small>' + esc(r.meta) + '</small></span></figcaption>' +
        '</figure>';
    }).join('');
    grid.hidden = false;
    if (reputation) reputation.hidden = true;
  })();

  /* ---------- UTM capture (for future Meta Ads) ---------- */
  (function captureUTM() {
    var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    var params, stored = {};
    try { params = new URLSearchParams(window.location.search); } catch (e) { params = null; }
    try { stored = JSON.parse(sessionStorage.getItem('cw_utm') || '{}'); } catch (e) { stored = {}; }

    var values = {};
    keys.forEach(function (k) {
      var v = (params && params.get(k)) || stored[k] || '';
      if (v) values[k] = v;
      var input = doc.querySelector('input[name="' + k + '"]');
      if (input) input.value = v;
    });
    try { if (Object.keys(values).length) sessionStorage.setItem('cw_utm', JSON.stringify(Object.assign(stored, values))); } catch (e) {}
  })();

  /* ---------- Meta Pixel (loads only if an ID is configured) ---------- */
  var pixelReady = false;
  (function initPixel() {
    var id = CFG.META_PIXEL_ID;
    if (!id) return;
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', id);
    window.fbq('track', 'PageView');
    pixelReady = true;
  })();

  function track(eventName, isStandard, data) {
    try { if (pixelReady && window.fbq) window.fbq(isStandard ? 'track' : 'trackCustom', eventName, data || {}); } catch (e) {}
    try { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: eventName }, data || {})); } catch (e) {}
  }

  /* ---------- CTA click tracking (ready for ads) ---------- */
  $$('[data-cta]').forEach(function (el) {
    el.addEventListener('click', function () {
      var cta = el.getAttribute('data-cta');
      if (cta === 'call-now') track('Contact', true, { method: 'phone' });
      track('CTAClick', false, { cta: cta });
    });
  });

  /* ---------- Mobile navigation ---------- */
  var navToggle = $('#navToggle');
  var mobileNav = $('#mobileNav');
  function setNav(open) {
    if (!mobileNav || !navToggle) return;
    mobileNav.hidden = !open;
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    navToggle.innerHTML = open
      ? '<svg class="ic" aria-hidden="true"><use href="#i-close"/></svg>'
      : '<svg class="ic" aria-hidden="true"><use href="#i-menu"/></svg>';
  }
  if (navToggle) navToggle.addEventListener('click', function () { setNav(mobileNav.hidden); });
  if (mobileNav) $$('a', mobileNav).forEach(function (a) { a.addEventListener('click', function () { setNav(false); }); });
  window.addEventListener('resize', function () { if (window.innerWidth >= 960) setNav(false); });

  /* ---------- Smooth-scroll anchors ---------- */
  $$('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      var target = doc.getElementById(id.slice(1));
      if (!target) return;
      e.preventDefault();
      var header = $('.site-header');
      var offset = (header ? header.offsetHeight : 0) + 12;
      var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: top, behavior: 'smooth' });
      target.setAttribute('tabindex', '-1');
      setTimeout(function () { target.focus({ preventScroll: true }); }, 400);
    });
  });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Back to top ---------- */
  var toTop = $('#toTop');
  if (toTop) {
    var onScroll = function () { toTop.hidden = window.pageYOffset < 600; };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  /* ---------- Quote form ---------- */
  var form = $('#quoteForm');
  var statusEl = $('#formStatus');
  var thanksEl = $('#formThanks');

  function showStatus(msg, type) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = 'form-status is-' + type;
    statusEl.hidden = false;
  }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function validPhone(v) { return (String(v).replace(/\D/g, '').length >= 10); }

  if (form) {
    var required = ['name', 'business', 'phone', 'email', 'business_type', 'service', 'project_type', 'message'];

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      var hp = form.querySelector('[name="company-website"]');
      if (hp && hp.value) { return; } // bot

      var ok = true, firstBad = null;
      required.forEach(function (n) {
        var el = form.elements[n];
        if (!el) return;
        el.removeAttribute('aria-invalid');
        var bad = !String(el.value).trim();
        if (n === 'phone' && !bad) bad = !validPhone(el.value);
        if (n === 'email' && !bad) bad = !validEmail(el.value);
        if (bad) { el.setAttribute('aria-invalid', 'true'); ok = false; if (!firstBad) firstBad = el; }
      });

      if (!ok) {
        showStatus('Please complete the required fields so we can prepare your quote (a valid phone and email help us reach you).', 'error');
        if (firstBad) firstBad.focus();
        return;
      }

      var submitBtn = form.querySelector('[type="submit"]');
      var originalLabel = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }

      var payload = {};
      ['name', 'business', 'phone', 'email', 'business_type', 'service', 'project_type', 'timeline', 'budget', 'message',
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'company-website'].forEach(function (n) {
        var el = form.elements[n];
        payload[n] = el ? String(el.value || '').trim() : '';
      });

      try {
        var resp = await fetch(form.getAttribute('action') || '/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload)
        });
        var result = {};
        try { result = await resp.json(); } catch (_) {}

        if (resp.ok && result.ok !== false) {
          if (CFG.REDIRECT_TO_THANK_YOU) { window.location.href = '/thank-you.html'; return; } // thank-you page fires Lead
          track('Lead', true, { content_name: payload.service || 'Commercial Quote' });
          if (thanksEl) {
            form.hidden = true;
            thanksEl.hidden = false;
            thanksEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            showStatus('Thanks! Your request was received — we’ll get back to you shortly. For immediate help, call 619-786-1810.', 'success');
            form.reset();
          }
        } else {
          showStatus((result && result.error ? result.error + ' ' : '') + 'You can also call us directly at 619-786-1810.', 'error');
        }
      } catch (err) {
        showStatus('We couldn’t submit the form right now. Please call or text us at 619-786-1810 and we’ll help right away.', 'error');
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
      }
    });
  }
})();
