#!/usr/bin/env node
// Verifies the published OData v4 service is reachable before wiring the frontend to it.
// Run: node --env-file=../.env web/scripts/sap-smoke.mjs   (from repo root)

const required = ['SAP_BASE_URL', 'SAP_SERVICE_PATH', 'SAP_USER', 'SAP_PASS'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const { SAP_BASE_URL, SAP_SERVICE_PATH, SAP_USER, SAP_PASS } = process.env;
const serviceUrl = `${SAP_BASE_URL}${SAP_SERVICE_PATH}`;
const authHeader = `Basic ${Buffer.from(`${SAP_USER}:${SAP_PASS}`).toString('base64')}`;

async function check(label, fn) {
  process.stdout.write(`${label}... `);
  try {
    await fn();
    console.log('PASS');
    return true;
  } catch (err) {
    console.log(`FAIL — ${err.message}`);
    return false;
  }
}

let allPassed = true;

allPassed &= await check('Service root reachable', async () => {
  const res = await fetch(serviceUrl, { headers: { Authorization: authHeader, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
});

allPassed &= await check('Equipment entity set reachable', async () => {
  const res = await fetch(`${serviceUrl}/Equipment?$top=1`, {
    headers: { Authorization: authHeader, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  if (!Array.isArray(body.value)) throw new Error('response missing "value" array');
});

allPassed &= await check('CSRF token fetchable', async () => {
  const res = await fetch(serviceUrl, {
    headers: { Authorization: authHeader, 'x-csrf-token': 'fetch' },
  });
  const token = res.headers.get('x-csrf-token');
  if (!token) throw new Error('no x-csrf-token header in response — writes will fail');
});

if (!allPassed) {
  console.error('\nSmoke test FAILED. See docs/REDEPLOY.md if the trial system may have reset.');
  process.exit(1);
}

console.log('\nAll smoke checks passed.');
