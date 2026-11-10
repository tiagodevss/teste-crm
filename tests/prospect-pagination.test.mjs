import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getProspectPageFromSearchParams,
  getProspectUrlFilterState,
  setProspectPageInSearchParams,
  getRestoredProspectPageSize,
  parseProspectDateFilterOptions,
  getValidPageAfterDeletion,
  getVisibleSelectedIds,
} from '../modules/ColdLeads/lib/prospect-pagination.ts';

test('deletion stays on the current page while that page still exists', () => {
  assert.equal(
    getValidPageAfterDeletion({ currentPage: 2, limit: 10, total: 35, deleted: 1 }),
    2,
  );
});

test('deletion moves back when the last page stops existing', () => {
  assert.equal(
    getValidPageAfterDeletion({ currentPage: 3, limit: 10, total: 21, deleted: 1 }),
    2,
  );
  assert.equal(
    getValidPageAfterDeletion({ currentPage: 3, limit: 10, total: 25, deleted: 5 }),
    2,
  );
});

test('deleting all filtered records leaves page one valid', () => {
  assert.equal(
    getValidPageAfterDeletion({ currentPage: 1, limit: 10, total: 4, deleted: 4 }),
    1,
  );
});

test('bulk actions drop selected IDs that are no longer visible', () => {
  assert.deepEqual(
    getVisibleSelectedIds(
      new Set(['prospect-1', 'prospect-2', 'prospect-3']),
      ['prospect-1', 'prospect-3', 'prospect-4'],
    ),
    ['prospect-1', 'prospect-3'],
  );
});


test('current page is restored from URL search params', () => {
  const params = new URLSearchParams('page=37');
  assert.equal(getProspectPageFromSearchParams(params), 37);
});

test('invalid page search params fall back safely', () => {
  assert.equal(getProspectPageFromSearchParams(new URLSearchParams('page=-2')), 1);
  assert.equal(getProspectPageFromSearchParams(new URLSearchParams('page=abc')), 1);
});


test('comparison date ranges can be restored after navigating back', () => {
  const options = parseProspectDateFilterOptions(
    JSON.stringify({
      compareTwoRanges: {
        intervalA: { start: '2026-08-01', end: '2026-08-31' },
        intervalB: { start: '2026-09-01', end: '2026-09-30' },
      },
    }),
  );
  assert.deepEqual(options, {
    compareTwoRanges: {
      intervalA: { start: '2026-08-01', end: '2026-08-31' },
      intervalB: { start: '2026-09-01', end: '2026-09-30' },
    },
  });
});

test('invalid stored comparison state is ignored', () => {
  assert.equal(parseProspectDateFilterOptions('{invalid'), undefined);
  assert.equal(
    parseProspectDateFilterOptions(JSON.stringify({ compareOneRange: { start: 123 } })),
    undefined,
  );
});


test('page size is restored from the persisted prospect store state', () => {
  assert.equal(getRestoredProspectPageSize(50), 50);
  assert.equal(getRestoredProspectPageSize(100), 100);
  assert.equal(getRestoredProspectPageSize(0), 10);
});


test('resolved page is written back to the URL after list mutations', () => {
  assert.equal(
    setProspectPageInSearchParams(new URLSearchParams('page=3&status=pendente'), 2).toString(),
    'page=2&status=pendente',
  );
  assert.equal(
    setProspectPageInSearchParams(new URLSearchParams('page=2&status=pendente'), 1).toString(),
    'status=pendente',
  );
});


test('URL-backed filters can be rehydrated when browser history changes', () => {
  const state = getProspectUrlFilterState(
    new URLSearchParams(
      'page=4&status=contatado&sla=overdue&ownerUserId=u1&city=Campinas&origin=partner&clientWms=yes&dateField=contactDate&search=acme',
    ),
  );
  assert.equal(state.statusQuickFilter, 'contatado');
  assert.equal(state.slaFilter, 'overdue');
  assert.equal(state.assignedUserId, 'u1');
  assert.equal(state.cityFilter, 'Campinas');
  assert.equal(state.sourceTypeFilter, 'partner');
  assert.equal(state.clientWmsFilter, 'yes');
  assert.equal(state.dateField, 'contactDate');
  assert.equal(state.search, 'acme');
});

test('invalid URL-backed enum filters fall back to their neutral values', () => {
  const state = getProspectUrlFilterState(
    new URLSearchParams('status=unknown&sla=late&origin=foo&clientWms=maybe'),
  );
  assert.equal(state.statusQuickFilter, '');
  assert.equal(state.slaFilter, '');
  assert.equal(state.sourceTypeFilter, '');
  assert.equal(state.clientWmsFilter, '');
});
