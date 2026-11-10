import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareLeadLoss, prepareResponseDeadline, formatCalendarDate, deadlineState } from '../lib/commercial-feedback.ts';
test('loss requires an explicit target, known category and meaningful description', () => {
  assert.deepEqual(prepareLeadLoss('loss', 'price', '  Cliente recusou pelo valor.  '), { targetStageId: 'loss', category: 'price', description: 'Cliente recusou pelo valor.' });
  for (const args of [['', 'price', 'Cliente recusou pelo valor.'], ['loss', '__proto__', 'Cliente recusou pelo valor.'], ['loss', 'price', '          '], ['loss', 'price', 'x'.repeat(4001)]]) assert.throws(() => prepareLeadLoss(...args));
});
test('deadline preserves the calendar date and allows explicit clearing', () => {
  assert.equal(prepareResponseDeadline('2024-02-29'), '2024-02-29');
  assert.equal(prepareResponseDeadline(''), null);
  assert.equal(formatCalendarDate('2026-09-15'), '15/09/2026');
  for (const value of ['2026-02-29', '2026-02-30', '15/09/2026', '2026-09-15T00:00:00Z', '1899-01-01']) assert.throws(() => prepareResponseDeadline(value));
});
test('deadline warning uses the business day in Sao Paulo, including the UTC midnight boundary', () => {
  const now = new Date('2026-09-16T01:00:00Z');
  assert.equal(deadlineState('2026-09-15', now), 'today');
  assert.equal(deadlineState('2026-09-14', now), 'overdue');
  assert.equal(deadlineState('2026-09-16', now), 'future');
  assert.equal(deadlineState(null, now), 'none');
});
