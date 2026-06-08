/* =========================================================
   ConnectWorks — public content hydration
   Loads editable content from Supabase (REST, anon read-only) and
   updates the page. The hardcoded HTML stays as fallback, so the site
   works even if the CMS is empty/unreachable. No external SDK needed.
   ========================================================= */
(function () {
  'use strict';
  var CFG = window.CW_CONFIG || {};
  if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) return; // not configured -> use fallback HTML

  var H = { apikey: CFG.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + CFG.SUPABASE_ANON_KEY };
  function rest(path) {
    return fetch(CFG.SUPABASE_URL + '/rest/v1/' + path, { headers: H })
      .then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; });
  }
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];});}
  function icon(name){return '<svg class="ic" aria-hidden="true"><use href="#i-'+esc(name||'check')+'"/></svg>';}
  function digits(v){return String(v||'').replace(/\D/g,'');}

  function get(obj, path) {
    return path.split('.').reduce(function (o, k) { return (o && o[k] != null) ? o[k] : undefined; }, obj);
  }

  Promise.all([
    rest('site_settings?select=*&id=eq.1'),
    rest('home_sections?select=*'),
    rest('trust_badges?select=*&active=eq.true&order=sort_order'),
    rest('services?select=*&active=eq.true&order=sort_order'),
    rest('industries?select=*&active=eq.true&order=sort_order'),
    rest('features?select=*&active=eq.true&order=sort_order'),
    rest('process_steps?select=*&active=eq.true&order=sort_order'),
    rest('problems?select=*&active=eq.true&order=sort_order'),
    rest('reviews?select=*&active=eq.true&order=sort_order'),
    rest('seo_settings?select=*&page_key=eq.home')
  ]).then(function (res) {
    var settings = (res[0] && res[0][0]) || {};
    var sections = {}; (res[1] || []).forEach(function (s) { sections[s.section_key] = s; });
    var data = { settings: settings, hero: sections.hero || {}, cta: sections.cta_banner || {}, seo: (res[9] && res[9][0]) || {} };

    hydrateText(data);
    hydrateLinks(settings);
    hydrateLicense(settings);
    if (res[2] && res[2].length) renderBadges(res[2]);
    if (res[3] && res[3].length) renderServices(res[3]);
    if (res[4] && res[4].length) renderIndustries(res[4]);
    if (res[5] && res[5].length) renderFeatures(res[5]);
    if (res[6] && res[6].length) renderProcess(res[6]);
    if (res[7] && res[7].length) renderProblems(res[7]);
    renderReviews(res[8] || [], settings);
    hydrateSEO(data);
  });

  /* ---- text / attribute hydration via data-cw* ---- */
  function hydrateText(data) {
    $$('[data-cw]').forEach(function (el) {
      var v = get(data, el.getAttribute('data-cw'));
      if (v != null && v !== '') el.textContent = v;
    });
    $$('[data-cw-html]').forEach(function (el) {
      var v = get(data, el.getAttribute('data-cw-html'));
      if (v != null && v !== '') el.innerHTML = String(v).replace(/\*\*(.+?)\*\*/g, '<span class="grad">$1</span>');
    });
    $$('[data-cw-label]').forEach(function (el) {
      var v = get(data, el.getAttribute('data-cw-label'));
      if (v != null && v !== '') el.textContent = v;
    });
    $$('[data-cw-href]').forEach(function (el) {
      var v = get(data, el.getAttribute('data-cw-href'));
      if (v != null && v !== '') el.setAttribute('href', v);
    });
  }

  function hydrateLinks(s) {
    if (s.phone) {
      $$('a[href^="tel:"]').forEach(function (a) { a.setAttribute('href', 'tel:+1' + digits(s.phone)); });
    }
    if (s.email) {
      $$('a[href^="mailto:"]').forEach(function (a) { a.setAttribute('href', 'mailto:' + s.email); });
    }
    setHref('[data-social="facebook"]', s.facebook_url);
    setHref('[data-social="instagram"]', s.instagram_url);
    setHref('[data-social="linkedin"]', s.linkedin_url);
    // Reviews button
    var rl = s.yelp_url || s.google_reviews_url;
    var link = $('#reviewsLink');
    if (rl && link) { link.setAttribute('href', rl); link.setAttribute('target', '_blank'); }
  }
  function setHref(sel, url) { var el = $(sel); if (el && url) el.setAttribute('href', url); }

  function hydrateLicense(s) {
    var on = s.license_text || 'Licensed & Insured';
    var off = s.no_license_text || 'Professional Low Voltage Installations';
    $$('[data-license]').forEach(function (el) {
      var o = el.dataset.licenseOn || on, f = el.dataset.licenseOff || off;
      if (!s.has_licenses && el.classList.contains('footer-license') && !el.dataset.licenseOff)
        f = off + ' · Licensing information available upon request';
      el.textContent = s.has_licenses ? o : f;
    });
  }

  /* ---- collection renderers (mirror the existing markup) ---- */
  function renderBadges(rows) {
    var ul = $('#cwTrustBadges'); if (!ul) return;
    ul.innerHTML = rows.map(function (b) { return '<li>' + icon(b.icon) + ' ' + esc(b.label) + '</li>'; }).join('');
  }

  var MEDIA = ['media--a','media--b','media--c','media--d','media--e','media--f','media--g'];
  function renderServices(rows) {
    var grid = $('#cwServices'); if (!grid) return;
    var html = rows.map(function (s, i) {
      var photo = s.image_url ? '<img class="service-card__photo" src="' + esc(s.image_url) + '" alt="" loading="lazy" onerror="this.remove()"/>' : '';
      return '<article class="card service-card reveal is-visible">'
        + '<div class="service-card__media ' + MEDIA[i % MEDIA.length] + '"><svg class="service-card__ic" aria-hidden="true"><use href="#i-' + esc(s.icon) + '"/></svg>' + photo + '</div>'
        + '<h3>' + esc(s.title) + '</h3><p>' + esc(s.short_description) + '</p>'
        + '<a class="link-arrow" href="' + esc(s.cta_link || '#contact') + '" data-cta="request-commercial-quote">' + esc(s.cta_text || 'Free Quote') + ' <svg class="ic" aria-hidden="true"><use href="#i-arrow"/></svg></a>'
        + '</article>';
    }).join('');
    html += '<article class="card service-card service-card--cta reveal is-visible"><h3>Need several systems at once?</h3><p>Most commercial projects combine cameras, cabling, network and access control. Tell us your space and we\'ll scope it all.</p><a class="btn btn--primary btn--block" href="#contact" data-cta="request-commercial-quote">Talk to a Specialist</a></article>';
    grid.innerHTML = html;
  }

  function renderIndustries(rows) {
    var grid = $('#cwIndustries'); if (!grid) return;
    grid.innerHTML = rows.map(function (it) {
      return '<li class="industry reveal is-visible">' + icon(it.icon) + ' ' + esc(it.title) + '</li>';
    }).join('');
  }

  function renderFeatures(rows) {
    var ul = $('#cwFeatures'); if (!ul) return;
    ul.innerHTML = rows.map(function (f) {
      return '<li class="reveal is-visible"><span class="why-ic">' + icon(f.icon) + '</span><div><h3>' + esc(f.title) + '</h3><p>' + esc(f.description) + '</p></div></li>';
    }).join('');
  }

  function renderProcess(rows) {
    var ol = $('#cwProcess'); if (!ol) return;
    ol.innerHTML = rows.map(function (p, i) {
      var n = ('0' + (p.step_number || i + 1)).slice(-2);
      return '<li class="process-step reveal is-visible"><span class="process-step__num">' + n + '</span><span class="process-step__ic">' + icon(p.icon) + '</span><h3>' + esc(p.title) + '</h3><p>' + esc(p.description) + '</p></li>';
    }).join('');
  }

  function renderProblems(rows) {
    var ul = $('#cwProblems'); if (!ul) return;
    ul.innerHTML = rows.map(function (p) {
      return '<li class="problem reveal is-visible">' + icon(p.icon || 'alert') + ' ' + esc(p.title) + '</li>';
    }).join('');
  }

  function renderReviews(rows, settings) {
    var grid = $('#reviewsGrid'); var reputation = $('#reputationBlock');
    var summary = $('#ratingSummary');
    if (rows && rows.length) {
      if (grid) {
        grid.innerHTML = rows.map(function (r) {
          var n = Math.max(0, Math.min(5, r.rating || 5)), st = '';
          for (var i = 0; i < n; i++) st += '<svg class="ic"><use href="#i-star"/></svg>';
          var initial = (r.client_name || '★').trim().charAt(0).toUpperCase() || '★';
          var meta = [r.company, r.source].filter(Boolean).join(' · ');
          return '<figure class="card review-card reveal is-visible"><svg class="review-card__quote ic" aria-hidden="true"><use href="#i-quote"/></svg>'
            + '<span class="stars stars--sm">' + st + '</span><blockquote>' + esc(r.review_text) + '</blockquote>'
            + '<figcaption><span class="avatar">' + esc(initial) + '</span><span><strong>' + esc(r.client_name) + '</strong><small>' + esc(meta) + '</small></span></figcaption></figure>';
        }).join('');
        grid.hidden = false;
      }
      if (reputation) reputation.hidden = true;
      if (summary && settings.review_rating) {
        var rt = parseFloat(settings.review_rating) || 0, filled = Math.max(1, Math.min(5, Math.round(rt))), s = '';
        for (var k = 0; k < filled; k++) s += '<svg class="ic"><use href="#i-star"/></svg>';
        var se = $('#ratingStars'); if (se) se.innerHTML = s;
        var ve = $('#ratingValue'); if (ve) ve.textContent = settings.review_rating + ' / 5';
        var le = $('#ratingLabel'); if (le) le.textContent = settings.review_rating_label || '';
        summary.hidden = false;
      }
    } else {
      // No real reviews -> show the safe reputation block, hide cards/rating
      if (grid) { grid.hidden = true; grid.innerHTML = ''; }
      if (summary) summary.hidden = true;
      if (reputation) reputation.hidden = false;
    }
  }

  /* ---- SEO (client-side) ---- */
  function hydrateSEO(data) {
    var seo = data.seo || {}, s = data.settings || {};
    if (seo.meta_title) document.title = seo.meta_title;
    setMeta('name', 'description', seo.meta_description);
    setMeta('property', 'og:title', seo.og_title || seo.meta_title);
    setMeta('property', 'og:description', seo.og_description || seo.meta_description);
    setMeta('property', 'og:image', seo.og_image || s.og_image_url);
    setMeta('name', 'twitter:title', seo.og_title || seo.meta_title);
    setMeta('name', 'twitter:description', seo.og_description || seo.meta_description);
    if (seo.canonical_url) { var c = document.querySelector('link[rel="canonical"]'); if (c) c.setAttribute('href', seo.canonical_url); }
  }
  function setMeta(attr, key, val) {
    if (!val) return;
    var el = document.querySelector('meta[' + attr + '="' + key + '"]');
    if (el) el.setAttribute('content', val);
  }
})();
