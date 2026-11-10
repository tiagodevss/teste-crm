import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareContactDates, toLocalDateTimeValue } from '../lib/contact-record.ts';
const now = new Date(2026, 8, 15, 12, 0);
const valid = { contactDate: '2026-09-14T10:15', followUpDate: '2026-09-17T09:30', notes: '  Proposta discutida.  ' };
test('preserves the local attendance time and trims the detail', () => {
    const record = prepareContactDates(valid, now);
    assert.equal(toLocalDateTimeValue(new Date(record.contactDate)), valid.contactDate);
    assert.equal(toLocalDateTimeValue(new Date(record.followUpDate)), valid.followUpDate);
    assert.equal(record.notes, 'Proposta discutida.');
});
test('rejects impossible, future attendance dates and expired next returns', () => {
    for (const contactDate of ['', 'invalid', '2026-02-30T09:00', '2026-09-16T09:00']) {
        assert.throws(() => prepareContactDates({ ...valid, contactDate }, now));
    }
    assert.throws(() => prepareContactDates({ ...valid, followUpDate: '2026-09-14T11:00' }, now));
});
test('requires a date when the result or type promises a scheduled return', () => {
    assert.throws(() => prepareContactDates({ ...valid, type: 'retorno_agendado', followUpDate: '' }, now));
    assert.throws(() => prepareContactDates({ ...valid, result: 'retorno_agendado', followUpDate: '' }, now));
    assert.equal(prepareContactDates({ ...valid, followUpDate: '' }, now).followUpDate, undefined);
});
test('limits notes and does not change the meaning of an empty next return', () => {
    assert.throws(() => prepareContactDates({ ...valid, notes: 'x'.repeat(4001) }, now));
    assert.equal(prepareContactDates({ ...valid, followUpDate: '', notes: '   ' }, now).notes, undefined);
});
