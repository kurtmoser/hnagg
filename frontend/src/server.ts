import { renderApplication } from '@angular/platform-server';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import bootstrap from './main.server';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = readFileSync(join(serverDistFolder, 'index.server.html'), 'utf-8');

const app = express();

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    immutable: true,
    index: false,
  }),
);

app.use(
  '/sitemap.xml',
  createProxyMiddleware({ target: 'http://backend:3000/api/sitemap.xml', ignorePath: true }),
);

app.use(
  '/api',
  createProxyMiddleware({ target: 'http://backend:3000/api', changeOrigin: true }),
);

app.use('/{*path}', (req, res, next) => {
  const { protocol, originalUrl, headers } = req;
  const url = `${protocol}://${headers.host}${originalUrl}`;

  renderApplication(bootstrap, {
    document: indexHtml,
    url,
  })
    .then((html) => res.send(html))
    .catch((err) => next(err));
});

const port = 4000;
app.listen(port, () => {
  console.log(`SSR server listening on http://localhost:${port}`);
});
