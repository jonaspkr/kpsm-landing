const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 8080;
const STATIC = path.join(__dirname, 'dist');
const CLIENT_ID = 'Ov23ligNK26B9i6T4ybc';
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.yml': 'text/yaml', '.ico': 'image/x-icon',
  '.xml': 'application/xml', '.txt': 'text/plain', '.webp': 'image/webp',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://api.github.com https://github.com;",
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
};

const PAGE_404 = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 — KPSM</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;700&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Montserrat',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fff;color:#000}
    .wrap{text-align:center;padding:40px}
    .code{font-size:8rem;font-weight:700;line-height:1;color:#ff3e07}
    .msg{font-size:1.1rem;font-weight:300;color:#555;margin:16px 0 40px}
    a{display:inline-block;padding:14px 36px;background:#ff3e07;color:#fff;text-decoration:none;font-size:.78rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;transition:background .3s}
    a:hover{background:#ff6438}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="code">404</div>
    <p class="msg">This page doesn't exist. Let's get you back to the meeting.</p>
    <a href="/">Back to homepage</a>
  </div>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // OAuth: start
  if (url.pathname === '/oauth/auth') {
    const state = crypto.randomBytes(16).toString('hex');
    res.writeHead(302, {
      Location: `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo,user&state=${state}`,
    });
    return res.end();
  }

  // OAuth: callback
  if (url.pathname === '/oauth/callback') {
    const code = url.searchParams.get('code');
    if (!code) { res.writeHead(400); return res.end('Missing code'); }

    try {
      const body = JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code });
      const resp = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body,
      });
      const data = await resp.json();

      if (data.error) {
        res.writeHead(400, { 'Content-Type': 'text/html', ...SECURITY_HEADERS });
        return res.end(`<p>Error: ${data.error_description}</p>`);
      }

      const content = `
        <script>
          (function() {
            function recieveMessage(e) {
              console.log("recieveMessage %o", e);
              window.opener.postMessage(
                'authorization:github:success:${JSON.stringify({ token: data.access_token, provider: 'github' })}',
                e.origin
              );
              window.removeEventListener("message", recieveMessage, false);
            }
            window.addEventListener("message", recieveMessage, false);
            window.opener.postMessage("authorizing:github", "*");
          })();
        </script>`;
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(content);
    } catch (err) {
      res.writeHead(500); return res.end('OAuth exchange failed');
    }
  }

  // Static files
  let filePath = path.join(STATIC, url.pathname === '/' ? 'index.html' : url.pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  try {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream', ...SECURITY_HEADERS };
    // Cache static assets for 1 year (images, fonts)
    if (['.png', '.jpg', '.webp', '.svg', '.ico'].includes(ext)) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    } else {
      headers['Cache-Control'] = 'public, max-age=3600';
    }
    res.writeHead(200, headers);
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html', ...SECURITY_HEADERS });
    res.end(PAGE_404);
  }
});

server.listen(PORT, () => console.log(`Listening on :${PORT}`));
