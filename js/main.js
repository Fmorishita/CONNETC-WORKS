/* =========================================================
   ConnectWorks Low Voltage Solutions — main.js
   ========================================================= */
(function () {
  'use strict';

  var doc = document;
  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };

  /* ---------- Current year ---------- */
  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

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

  if (navToggle) {
    navToggle.addEventListener('click', function () {
      setNav(mobileNav.hidden);
    });
  }
  // Close the drawer when a link is tapped
  if (mobileNav) {
    $$('a', mobileNav).forEach(function (a) {
      a.addEventListener('click', function () { setNav(false); });
    });
  }
  // Close on resize to desktop
  window.addEventListener('resize', function () {
    if (window.innerWidth >= 960) setNav(false);
  });

  /* ---------- Smooth-scroll anchors (account for sticky header) ---------- */
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
      // move focus for a11y after scroll
      target.setAttribute('tabindex', '-1');
      setTimeout(function () { target.focus({ preventScroll: true }); }, 400);
    });
  });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Back to top ---------- */
  var toTop = $('#toTop');
  if (toTop) {
    var onScroll = function () {
      toTop.hidden = window.pageYOffset < 600;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- Quote form: validation + submission ---------- */
  var form = $('#quoteForm');
  var statusEl = $('#formStatus');

  function showStatus(msg, type) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = 'form-status is-' + type;
    statusEl.hidden = false;
  }

  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function validPhone(v) { return (v.replace(/\D/g, '').length >= 10); }

  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      // Honeypot: silently ignore bots
      var hp = form.querySelector('[name="company-website"]');
      if (hp && hp.value) { return; }

      var name = $('#name'), phone = $('#phone'), email = $('#email');
      var ok = true;

      [name, phone, email].forEach(function (el) { if (el) el.removeAttribute('aria-invalid'); });

      if (!name.value.trim()) { name.setAttribute('aria-invalid', 'true'); ok = false; }
      if (!validPhone(phone.value)) { phone.setAttribute('aria-invalid', 'true'); ok = false; }
      if (!validEmail(email.value)) { email.setAttribute('aria-invalid', 'true'); ok = false; }

      if (!ok) {
        showStatus('Please add your name, a valid phone, and a valid email so we can reach you.', 'error');
        var firstBad = form.querySelector('[aria-invalid="true"]');
        if (firstBad) firstBad.focus();
        return;
      }

      var submitBtn = form.querySelector('[type="submit"]');
      var originalLabel = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }

      var payload = {
        name: name.value.trim(),
        business: (form.business && form.business.value || '').trim(),
        phone: phone.value.trim(),
        email: email.value.trim(),
        service: (form.service && form.service.value) || '',
        message: (form.message && form.message.value || '').trim(),
        'company-website': hp ? hp.value : ''
      };

      try {
        var resp = await fetch(form.getAttribute('action') || '/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload)
        });
        var result = {};
        try { result = await resp.json(); } catch (_) {}

        if (resp.ok && result.ok !== false) {
          showStatus('Thanks! Your request was received — we’ll get back to you shortly. For immediate help, call 619-786-1810.', 'success');
          form.reset();
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
