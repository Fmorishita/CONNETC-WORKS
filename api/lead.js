// Vercel Serverless Function: receives quote-form submissions and stores them
// in Supabase. The Supabase service-role key stays server-side (never exposed
// to the browser). Configure these Environment Variables in Vercel:
//   SUPABASE_URL                 -> your project URL (Settings → API)
//   SUPABASE_SERVICE_ROLE_KEY    -> service_role secret (Settings → API)
//
// Optional: LEAD_NOTIFY_EMAIL is referenced only in docs; email is not sent here.

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

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
  }

  // Parse body (Vercel usually populates req.body; fall back to raw stream).
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

  try {
    var supabase = createClient(url, key, { auth: { persistSession: false } });
    var record = {
      name: name,
      business: String(data.business || '').trim() || null,
      phone: phone,
      email: email,
      service: String(data.service || '').trim() || null,
      message: String(data.message || '').trim() || null,
      source: 'website',
      user_agent: (req.headers && req.headers['user-agent']) || null
    };

    var result = await supabase.from('leads').insert(record);
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
