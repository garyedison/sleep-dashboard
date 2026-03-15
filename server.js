const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const RAPIDAPI_KEY = '730acc74a4msh46492f9f3f943d9p12632djsn32cd72dc258a';
const RAPIDAPI_HOST = 'real-time-amazon-data.p.rapidapi.com';

function apiGet(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams(params).toString();
    const fullPath = endpoint + (qs ? '?' + qs : '');
    const options = {
      hostname: RAPIDAPI_HOST,
      path: fullPath,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY,
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

const routes = {
  '/api/search': (q) => apiGet('/search', { query: q.query || 'sleep products', page: q.page || '1', country: q.country || 'US', sort_by: q.sort_by || 'RELEVANCE' }),
  '/api/reviews': (q) => apiGet('/product-reviews', { asin: q.asin, country: q.country || 'US', page: q.page || '1', sort_by: q.sort_by || 'TOP_REVIEWS', star_rating: q.star_rating || 'ALL', verified_purchases_only: q.verified || 'false' }),
  '/api/top-reviews': (q) => apiGet('/top-product-reviews', { asin: q.asin, country: q.country || 'US' }),
  '/api/details': (q) => apiGet('/product-details', { asin: q.asin, country: q.country || 'US' }),
};

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (routes[pathname]) {
    res.setHeader('Content-Type', 'application/json');
    try {
      const data = await routes[pathname](parsed.query);
      res.writeHead(200);
      res.end(JSON.stringify(data));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(__dirname, 'public', filePath);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404); res.end('Not found'); }
    else { res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' }); res.end(content); }
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  Sleep Product Dashboard running at:');
  console.log('  http://localhost:' + PORT);
  console.log('');
  console.log('  Open that URL in your browser.');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});