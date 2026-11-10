import test from 'node:test';
import assert from 'node:assert/strict';
import { createLatestRequestTracker } from '../lib/latest-request.ts';
import { buildLeadFilterQuery } from '../lib/lead-query.ts';

test('a late response cannot overwrite a newly selected label, even after switching back', () => {
  const tracker = createLatestRequestTracker();
  tracker.setScope('all');
  const old = tracker.begin('all', 'Entrada');
  tracker.setScope('hot');
  const current = tracker.begin('hot', 'Entrada');
  assert.equal(old(), false);
  assert.equal(current(), true);
  tracker.setScope('all');
  assert.equal(old(), false);
  assert.equal(current(), false);
});
test('columns are independent but retry invalidates an older request in the same column', () => {
  const tracker = createLatestRequestTracker();
  tracker.setScope('label-1');
  const a = tracker.begin('label-1', 'Entrada');
  const b = tracker.begin('label-1', 'Proposta');
  const retry = tracker.begin('label-1', 'Entrada');
  assert.equal(a(), false);
  assert.equal(b(), true);
  assert.equal(retry(), true);
  tracker.invalidate();
  assert.equal(retry(), false);
});
test('an obsolete callback cannot register a new request in the current filter', () => {
  const tracker = createLatestRequestTracker();
  tracker.setScope('new');
  assert.equal(tracker.begin('old', 'Entrada')(), false);
});
test('labels, temperature, stage, SLA and combined filters use the same query encoding', () => {
  const filters = { labelId: 'label-hot', temperature: 'hot', stage: 'Não aceito', ownerUserId: 'owner',
    search: ' Maria & Filhos ', slaStatus: 'warning', dateFrom: '2026-01-01', productId: 'product' };
  const query = new URLSearchParams(buildLeadFilterQuery(filters).toString());
  assert.equal(query.get('labelId'), 'label-hot');
  assert.equal(query.get('temperature'), 'hot');
  assert.equal(query.get('stage'), 'Não aceito');
  assert.equal(query.get('search'), 'Maria & Filhos');
  assert.equal(query.get('slaStatus'), 'warning');
  assert.equal(query.get('ownerUserId'), 'owner');
  assert.equal(query.get('productId'), 'product');
});
test('all-period label or temperature search does not introduce an implicit date cutoff', () => {
  const labelQuery = buildLeadFilterQuery({ labelId: 'hot' });
  assert.equal(labelQuery.has('dateFrom'), false);
  assert.equal(labelQuery.has('dateTo'), false);
  const temperatureQuery = buildLeadFilterQuery({ temperature: 'hot' });
  assert.equal(temperatureQuery.has('dateFrom'), false);
  assert.equal(temperatureQuery.has('dateTo'), false);
  assert.equal(buildLeadFilterQuery({ labelId: '', temperature: '', search: ' ' }).toString(), '');
});
