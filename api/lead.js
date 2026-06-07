// Vercel Serverless Function: receives quote-form submissions and stores them
// in Supabase. The Supabase service-role key stays server-side (never exposed
// to the browser). Configure these Environment Variables in Vercel:
//   SUPABASE_URL                 -> your project URL (Settings → API)
//   SUPABASE_SERVICE_ROLE_KEY    -> service_role secret (Settings → API)
//
// New commercial fields (business_type, project_type, timeline, budget, utm_*)
// require the columns added in supabase/migration_commercial.sql. If those
// columns don't exist yet, this function automatically falls back to inserting
// the core fields so a lead is never lost.

const { createClient } = require('@supabase/supabase-js');

function readBody(req) {
  return new Promise(function (resolve) {
    var raw = '';
    req.on('data', function (c) { raw += c; });
    req.on('end', function () { resolve(raw); });
    req.on('error', function () { resolve(''); });
  });
}

function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function digits(v) { return String(v || '').replace(/\D/g, ''); }
function clean(v) { var s = String(v == null ? '' : v).trim(); return s || null; }

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
  }

  var data = req.body;
  if (!data || typeof data === 'string') {
    var raw = (typeof data === 'string' && data) || (await readBody(req));
    try { data = raw ? JSON.parse(raw) : {}; } catch (e) { data = {}; }
  }

  // Honeypot — silently accept bots without storing anything.
  if (data['company-website']) {
    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true }));
  }

  var name = String(data.name || '').trim();
  var phone = String(data.phone || '').trim();
  var email = String(data.email || '').trim();

  if (!name || digits(phone).length < 10 || !isEmail(email)) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, error: 'Please provide a name, valid phone and valid email.' }));
  }

  var url = process.env.SUPABASE_URL;
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: 'Server is not configured yet.' }));
  }

  // Core fields (exist since v1). Extra/commercial fields added by migration.
  var core = {
    name: name,
    business: clean(data.business),
    phone: phone,
    email: email,
    service: clean(data.service),
    message: clean(data.message),
    source: 'website',
    user_agent: (req.headers && req.headers['user-agent']) || null
  };
  var full = Object.assign({}, core, {
    business_type: clean(data.business_type),
    project_type: clean(data.project_type),
    timeline: clean(data.timeline),
    budget: clean(data.budget),
    utm_source: clean(data.utm_source),
    utm_medium: clean(data.utm_medium),
    utm_campaign: clean(data.utm_campaign),
    utm_content: clean(data.utm_content),
    utm_term: clean(data.utm_term)
  });

  try {
    var supabase = createClient(url, key, { auth: { persistSession: false } });

    var result = await supabase.from('leads').insert(full);

    // If the extra columns don't exist yet, retry with the core fields only.
    if (result.error) {
      var msg = (result.error.message || '') + ' ' + (result.error.code || '');
      var schemaIssue = /column|schema cache|PGRST204|42703|could not find/i.test(msg);
      if (schemaIssue) {
        console.warn('Extra columns missing — run supabase/migration_commercial.sql. Falling back to core fields.');
        result = await supabase.from('leads').insert(core);
      }
    }

    if (result.error) {
      console.error('Supabase insert error:', result.error);
      res.statusCode = 500;
      return res.end(JSON.stringify({ ok: false, error: 'Could not save your request.' }));
    }

    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    console.error('Unexpected error:', err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: 'Unexpected server error.' }));
  }
};
