import { Router } from 'express';
import { openApiDocument } from './openapi';

const SWAGGER = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14';

const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Kosh API docs</title>
  <link rel="stylesheet" href="${SWAGGER}/swagger-ui.css">
</head>
<body>
  <div id="docs"></div>
  <script src="${SWAGGER}/swagger-ui-bundle.js" crossorigin="anonymous"></script>
  <script src="/api/docs/init.js"></script>
</body>
</html>`;

const init = `window.ui = SwaggerUIBundle({
  url: '/api/openapi.json',
  dom_id: '#docs',
  deepLinking: true,
  persistAuthorization: true,
  withCredentials: true,
  tryItOutEnabled: false,
});`;

/** Machine-readable spec plus an interactive Swagger UI page. Only this page may load the pinned CDN assets. */
export const docsRouter = Router();

docsRouter.get('/openapi.json', (_req, res) => {
  res.json(openApiDocument);
});

docsRouter.get('/docs', (_req, res) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; img-src 'self' data: https://cdn.jsdelivr.net; connect-src 'self'; frame-ancestors 'none'",
  );
  res.type('html').send(page);
});

docsRouter.get('/docs/init.js', (_req, res) => {
  res.type('application/javascript').send(init);
});
