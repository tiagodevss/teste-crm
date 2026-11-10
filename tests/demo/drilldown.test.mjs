import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDemoDrilldown } from '../../lib/demoDrilldown.ts';

test('dashboard drilldowns preserve cohort, operation, owner and status', () => {
  const result = new URL(buildDemoDrilldown('/crm?status=Cliente&ownerUserId=demo-ana', {dateFrom:'2026-10-01',dateTo:'2026-11-10'}, 'accounting'), 'http://demo.local');
  assert.equal(result.pathname, '/demo/oportunidades');
  for (const [key,value] of Object.entries({status:'Cliente', ownerUserId:'demo-ana', dateFrom:'2026-10-01', dateTo:'2026-11-10', dateField:'createdAt', pipeId:'demo-accounting'})) assert.equal(result.searchParams.get(key),value);
});
test('general drilldown preserves a selected pipe while unbounded ranges remain unbounded', () => {
  const result = new URL(buildDemoDrilldown('/crm?pipeId=demo-opening&slaStatus=overdue', {}, 'general'), 'http://demo.local');
  assert.equal(result.searchParams.get('pipeId'),'demo-opening');
  assert.equal(result.searchParams.get('slaStatus'),'overdue');
  assert.equal(result.searchParams.get('dateFrom'),null);
  assert.equal(result.searchParams.get('dateTo'),null);
});
