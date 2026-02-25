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
};

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
        res.writeHead(400, { 'Content-Type': 'text/html' });
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
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => console.log(`Listening on :${PORT}`));
