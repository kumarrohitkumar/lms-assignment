import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildTestApp } from './helpers';

const app = buildTestApp();

const ENDPOINTS: [string, string][] = [
  ['post', '/api/auth/register'], ['post', '/api/auth/login'], ['post', '/api/auth/logout'], ['get', '/api/auth/me'],
  ['get', '/api/borrower/profile'], ['put', '/api/borrower/profile'], ['post', '/api/borrower/salary-slip'],
  ['post', '/api/borrower/salary-slip/direct-upload'], ['post', '/api/borrower/salary-slip/direct-upload/complete'],
  ['get', '/api/borrower/loans'], ['post', '/api/borrower/loans'],
  ['get', '/api/loans'], ['get', '/api/loans/{id}'], ['get', '/api/loans/{id}/salary-slip'],
  ['get', '/api/sales/leads'],
  ['get', '/api/sanction/loans'], ['post', '/api/sanction/loans/{id}/approve'], ['post', '/api/sanction/loans/{id}/reject'],
  ['get', '/api/disbursement/loans'], ['post', '/api/disbursement/loans/{id}/disburse'], ['post', '/api/disbursement/loans/{id}/reject'],
  ['get', '/api/collection/loans'], ['get', '/api/collection/loans/{id}/payments'], ['post', '/api/collection/loans/{id}/payments'],
  ['post', '/api/collection/payments/{id}/reverse'],
  ['get', '/api/decisions/rejection-categories'], ['get', '/api/sanction/decisions'], ['get', '/api/disbursement/decisions'], ['get', '/api/admin/overview'], ['get', '/api/health'],
];

describe('API documentation', () => {
  it('serves an OpenAPI 3.1 document that covers every endpoint', async () => {
    const res = await request(app).get('/api/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.1.0');
    expect(res.body.info.title).toMatch(/Kosh/);
    for (const [method, path] of ENDPOINTS) {
      expect(res.body.paths[path]?.[method], `${method.toUpperCase()} ${path}`).toBeDefined();
      expect(res.body.paths[path][method].summary, `${method.toUpperCase()} ${path} summary`).toEqual(expect.any(String));
    }
    expect(Object.keys(res.body.components.securitySchemes)).toEqual(expect.arrayContaining(['cookieAuth', 'bearerAuth']));
  });

  it('documents only endpoints that exist (nothing extra)', async () => {
    const res = await request(app).get('/api/openapi.json');
    const documented = Object.entries(res.body.paths).flatMap(([path, ops]) => Object.keys(ops as object).map((m) => `${m} ${path}`));
    expect(documented.sort()).toEqual(ENDPOINTS.map(([m, p]) => `${m} ${p}`).sort());
  });

  it('serves the interactive docs page, allowing only the pinned Swagger UI CDN', async () => {
    const res = await request(app).get('/api/docs');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('swagger-ui-dist@5.17.14');
    expect(res.text).not.toMatch(/<script>[^<]/); // no inline script
    expect(res.headers['content-security-policy']).toContain('https://cdn.jsdelivr.net');
    const init = await request(app).get('/api/docs/init.js');
    expect(init.status).toBe(200);
    expect(init.text).toContain('/api/openapi.json');
  });
});
