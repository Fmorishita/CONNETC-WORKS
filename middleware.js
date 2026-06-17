// ============================================================================
// ConnectWorks — Edge Middleware: soft password gate for the PUBLIC site.
// The marketing site is private until a visitor enters the password once;
// a cookie then grants access (90 days). /ops, /admin, /api and static assets
// are excluded (they have their own auth / are needed to render the gate).
// Password: 2026
// ============================================================================

export const config = {
  matcher: ['/((?!api/|ops/|admin/|assets/|css/|js/|_vercel/|favicon|robots.txt|sitemap.xml).*)'],
};

const PASSWORD = '2026';
const COOKIE = 'cw_site_access';
const TOKEN = 'ok-2026';
const MAX_AGE = 60 * 60 * 24 * 90; // 90 days

export default async function middleware(request) {
  const url = new URL(request.url);
  const cookie = request.headers.get('cookie') || '';
  const authed = cookie.split(';').some((c) => c.trim() === COOKIE + '=' + TOKEN);

  // Process the unlock form
  if (request.method === 'POST' && url.pathname === '/__unlock') {
    let pw = '';
    try { const form = await request.formData(); pw = String(form.get('password') || '').trim(); } catch (e) {}
    if (pw === PASSWORD) {
      return new Response(null, {
        status: 303,
        headers: {
          'Set-Cookie': COOKIE + '=' + TOKEN + '; Path=/; Max-Age=' + MAX_AGE + '; HttpOnly; Secure; SameSite=Lax',
          'Location': '/',
        },
      });
    }
    return gate(true);
  }

  // Already unlocked → continue to the site
  if (authed) return new Response(null, { headers: { 'x-middleware-next': '1' } });

  // Locked → show the password page
  return gate(false);
}

function gate(error) {
  return new Response(page(error), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function page(error) {
  const err = error
    ? '<p class="err">Contraseña incorrecta. Inténtalo de nuevo.</p>'
    : '';
  return '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="robots" content="noindex, nofollow">' +
    '<title>ConnectWorks — Acceso privado</title>' +
    '<link rel="icon" href="/assets/logo-connectworks.png">' +
    '<style>' +
    '*{box-sizing:border-box}' +
    'body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;' +
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,Arial,sans-serif;' +
    'background:radial-gradient(1200px 600px at 50% -10%,#16233f 0%,#0a0e1a 60%);color:#e8eef9}' +
    '.card{width:100%;max-width:380px;text-align:center}' +
    '.logo{height:54px;margin-bottom:18px}' +
    '.lock{width:46px;height:46px;color:#3b82f6;margin:0 auto 10px;display:block}' +
    'h1{font-size:1.35rem;margin:0 0 6px}' +
    'p.sub{color:#9fb0c9;margin:0 0 22px;font-size:.95rem}' +
    'form{display:flex;flex-direction:column;gap:12px}' +
    'input{padding:14px 16px;border-radius:12px;border:1.5px solid #2a3a59;background:#0f1626;color:#fff;font-size:1rem;text-align:center;letter-spacing:.05em}' +
    'input:focus{outline:none;border-color:#3b82f6}' +
    'button{padding:14px 16px;border-radius:12px;border:none;background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;font-weight:700;font-size:1rem;cursor:pointer}' +
    'button:hover{filter:brightness(1.06)}' +
    '.err{color:#fca5a5;font-size:.9rem;margin:4px 0 0}' +
    '.foot{color:#5b6b86;font-size:.78rem;margin-top:20px}' +
    '</style></head><body><div class="card">' +
    '<img class="logo" src="/assets/logo-connectworks.png" alt="ConnectWorks">' +
    '<svg class="lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.4" fill="currentColor" stroke="none"/></svg>' +
    '<h1>Sitio en vista privada</h1>' +
    '<p class="sub">Ingresa la contraseña para acceder.</p>' +
    '<form method="POST" action="/__unlock">' +
    '<input type="password" name="password" placeholder="Contraseña" autofocus autocomplete="current-password" inputmode="numeric">' +
    '<button type="submit">Entrar</button>' + err +
    '</form>' +
    '<p class="foot">ConnectWorks Low Voltage Solutions · San Diego County</p>' +
    '</div></body></html>';
}
