import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeDemoBase, demoRoute, isWithinDemo } from '../../lib/demoPaths.ts';

test('Pages paths normalize local root and project path', () => {
  assert.equal(normalizeDemoBase('/'), '/');
  assert.equal(normalizeDemoBase('/teste-crm'), '/teste-crm/');
  assert.equal(normalizeDemoBase('/teste-crm/'), '/teste-crm/');
});
test('Pages base rejects external origins and path traversal', () => {
  for (const bad of ['https://example.com/', '//example.com/', '/x/../', '/x?y=1', '/x#z', '/x\\y']) assert.throws(() => normalizeDemoBase(bad));
});
test('hash deep links retain the hosting prefix and application query', () => {
  assert.equal(demoRoute('/teste-crm/', '/lead/demo-lead-001'), '/teste-crm/#/lead/demo-lead-001');
  assert.equal(demoRoute('/', '/login'), '/#/login');
  assert.equal(demoRoute('/teste-crm/', '/crm?period=today'), '/teste-crm/#/crm?period=today');
});
test('redirects cannot escape into external URLs', () => {
  for (const bad of ['https://example.com/', '//example.com/', 'javascript:alert(1)', '/x#another']) assert.throws(() => demoRoute('/teste-crm/', bad));
});
test('project membership is both origin and path scoped', () => {
  const origin='https://tiagodevss.github.io';
  assert.equal(isWithinDemo(new URL(origin+'/teste-crm/assets/a.js'),origin,'/teste-crm/'),true);
  for (const u of [origin+'/other/assets/a.js',origin+'/teste-crm-other/a.js','https://example.com/teste-crm/a.js',origin+'/teste-crm/../other/a.js']) assert.equal(isWithinDemo(new URL(u),origin,'/teste-crm/'),false);
});
test('standalone configuration cannot select a real backend', () => {
  const source=readFileSync(new URL('../../config/constants.ts',import.meta.url),'utf8');
  assert.doesNotMatch(source,/VITE_API_URL|VITE_AUTH_URL|wmsempresarial\.com|localhost:3002/);
  assert.match(source,/mode: 'mock'/);
});
