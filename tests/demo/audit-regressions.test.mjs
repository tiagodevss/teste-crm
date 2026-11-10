import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRepository, clearDemo, validateDatabase } from '../../demo/storage.ts';
import { createSeed, PIPES, USERS } from '../../demo/seed.ts';
import { HERO_ID, ACCOUNTING_ID, ADMIN_ID, STORAGE_KEY } from '../../demo/types.ts';
import { getLeadTemperature } from '../../lib/lead-temperature.ts';
import { DEMO_PREFERENCES_KEY, readDatePreference, writeDatePreference } from '../../lib/demoPreferences.ts';
import { resolveIndicatorPeriods, indicatorQuery, isValidCalendarRange } from '../../lib/dashboardPeriods.ts';
const NOW = new Date('2026-11-10T15:00:00Z');
function setup() {
  const map = new Map();
  const storage = { getItem: k => map.get(k) ?? null, setItem: (k,v) => map.set(k,v), removeItem: k => map.delete(k) };
  const repo = createRepository(storage, () => NOW);
  const request = (method,path,body={},query={}) => repo.request(method,path,new URLSearchParams(query),body).body;
  return { repo, storage, request, reload: () => createRepository(storage, () => NOW) };
}
const payload = (extra={}) => ({ type:'meeting', channel:'video_call', ownerUserId: ADMIN_ID, scheduledAt:'2026-11-11T15:00:00Z', ...extra });

test('QA-01/08: client responsible alias updates owner, snapshots, filters and persists', () => {
  const {repo,request,reload}=setup();
  const changed=request('PATCH','/clients/demo-lead-005',{responsibleUserId:'demo-bruno'});
  assert.equal(changed.ownerUserId,'demo-bruno'); assert.equal(changed.responsibleUserId,'demo-bruno'); assert.equal(changed.owner.name,'Bruno Demo');
  assert.equal(reload().snapshot().leads.find(l=>l.id===changed.id).ownerUserId,'demo-bruno');
  const list=request('GET','/clients',{}, {ownerUserId:'demo-bruno'});
  assert.ok(list.data.some(l=>l.id===changed.id)); assert.ok(list.data.every(l=>l.owner.id==='demo-bruno'));
  const before=repo.snapshot();
  assert.throws(()=>request('PATCH','/clients/demo-lead-005',{ownerUserId:'demo-ana',responsibleUserId:'demo-bruno'}),e=>e.status===400);
  assert.deepEqual(repo.snapshot(),before);
  assert.throws(()=>request('PATCH','/clients/demo-lead-005',{responsibleUserId:'unknown'}));
});
test('QA-02: standalone meeting supports full lifecycle and reload without a fake lead', () => {
  const {request,reload}=setup();
  const created=request('POST','/lead-appointments',payload()); assert.equal(created.leadId,undefined); assert.equal(created.lead,undefined);
  validateDatabase(reload().snapshot());
  for (const status of ['completed','scheduled','no_show','canceled']) {
    const changed=request('PATCH',`/lead-appointments/${created.id}`,{status}); assert.equal(changed.status,status);
    assert.equal(changed.completedAt,status==='completed'?NOW.toISOString():undefined);
    assert.equal(changed.canceledAt,status==='canceled'?NOW.toISOString():undefined);
  }
  request('PATCH',`/lead-appointments/${created.id}`,{scheduledAt:'2026-11-12T15:00:00Z',notes:'Rescheduled without a lead'});
  request('DELETE',`/lead-appointments/${created.id}`);
  assert.ok(!reload().snapshot().appointments.some(a=>a.id===created.id));
});
test('QA-02: follow-up always requires a valid lead, including changes to existing meetings', () => {
  const {repo,request}=setup();
  assert.throws(()=>request('POST','/lead-appointments',payload({type:'follow_up'})),e=>e.status===400);
  assert.throws(()=>request('POST','/lead-appointments',payload({leadId:'missing'})),e=>e.status===404);
  const meeting=request('POST','/lead-appointments',payload()); const before=repo.snapshot();
  assert.throws(()=>request('PATCH',`/lead-appointments/${meeting.id}`,{type:'follow_up'}),e=>e.status===400); assert.deepEqual(repo.snapshot(),before);
  request('PATCH',`/lead-appointments/${meeting.id}`,{type:'follow_up',leadId:HERO_ID});
  assert.throws(()=>request('PATCH',`/lead-appointments/${meeting.id}`,{leadId:null}),e=>e.status===400);
  const detached=request('PATCH',`/lead-appointments/${meeting.id}`,{leadId:null,type:'meeting'}); assert.equal(detached.leadId,undefined);
});
test('QA-03: loss cancels only pending follow-ups atomically and preserves other activities', () => {
  const {request,repo,reload}=setup();
  const pending=request('POST','/lead-appointments',payload({type:'follow_up',leadId:HERO_ID}));
  const completed=request('POST','/lead-appointments',payload({type:'follow_up',leadId:HERO_ID}));
  request('PATCH',`/lead-appointments/${completed.id}`,{status:'completed'});
  const meeting=request('POST','/lead-appointments',payload({leadId:HERO_ID}));
  const other=request('POST','/lead-appointments',payload({type:'follow_up',leadId:'demo-lead-002'}));
  const lead=request('POST',`/leads/${HERO_ID}/loss`,{targetStageId:PIPES[0].steps[5].id,category:'price',description:'Motivo ficticio suficientemente detalhado.'});
  const appointments=reload().snapshot().appointments;
  assert.equal(appointments.find(a=>a.id===pending.id).status,'canceled');
  assert.equal(appointments.find(a=>a.id===pending.id).canceledAt,NOW.toISOString());
  assert.equal(appointments.find(a=>a.id===completed.id).status,'completed');
  assert.equal(appointments.find(a=>a.id===meeting.id).status,'scheduled'); assert.equal(appointments.find(a=>a.id===other.id).status,'scheduled');
  assert.equal(lead.appointments.find(a=>a.id===pending.id).status,'canceled');
  assert.ok(!request('GET','/lead-appointments',{}, {leadId:HERO_ID,status:'scheduled',type:'follow_up'}).total);
  const before=repo.snapshot();assert.throws(()=>request('POST',`/leads/${HERO_ID}/loss`,{category:'price'}));assert.deepEqual(repo.snapshot(),before);
});
test('QA-04: clients use last contact bounds; CRM and explicit dateField retain creation semantics', () => {
  const {request}=setup();
  request('PUT','/leads/demo-lead-005',{contactAttempt:{channel:'telefone',result:'sucesso',contactDate:'2026-11-10T14:00:00Z',notes:'Contato ficticio hoje.'}});
  const query={search:'Empresa Cedro 005',dateFrom:'2026-11-10',dateTo:'2026-11-10'};
  assert.equal(request('GET','/clients',{},query).total,1);
  assert.equal(request('GET','/leads',{},query).total,0);
  assert.equal(request('GET','/clients',{}, {...query,dateField:'createdAt'}).total,0);
  assert.equal(request('GET','/clients',{}, {...query,dateTo:'2026-11-09'}).total,0);
});
test('QA-05: one and two periods preserve exact dates and owner for both queries', () => {
  const preset={dateFrom:'2026-09-11',dateTo:'2026-11-10'};
  const a={start:'2030-01-01',end:'2030-01-31'}, b={start:'2031-01-01',end:'2031-01-31'};
  assert.deepEqual(resolveIndicatorPeriods(preset),{primary:preset});
  assert.deepEqual(resolveIndicatorPeriods(preset,{compareOneRange:a}),{primary:{dateFrom:a.start,dateTo:a.end}});
  const pair=resolveIndicatorPeriods(preset,{compareTwoRanges:{intervalA:a,intervalB:b}});
  assert.equal(indicatorQuery(pair.primary,'demo-ana'),'startDate=2030-01-01&endDate=2030-01-31&responsibleId=demo-ana');
  assert.equal(indicatorQuery(pair.comparison,'demo-ana'),'startDate=2031-01-01&endDate=2031-01-31&responsibleId=demo-ana');
  for (const range of [{start:'2030-02-31',end:'2030-03-01'},{start:'2030-03-02',end:'2030-03-01'},{start:'',end:''}]) assert.equal(isValidCalendarRange(range),false);
});
test('QA-06: UI temperatures, list filters, counts and summary share exactly the same algorithm', () => {
  const {repo,request}=setup();
  request('PUT','/leads/demo-lead-002',{stage:PIPES[0].steps[2].name}); request('PUT','/leads/demo-lead-002',{stage:PIPES[0].steps[3].name});
  const hot=request('GET','/lead/demo-lead-002'); assert.equal(hot.temperature,'hot');
  assert.equal(getLeadTemperature({...hot,temperature:undefined},NOW.getTime()),'hot');
  const all=request('GET','/leads',{}, {limit:'500'}).data;
  for(const temperature of ['hot','warm','cold']) {
    const query={temperature,limit:'500'};
    const filtered=request('GET','/leads',{},query); const expected=all.filter(l=>getLeadTemperature({...l,temperature:undefined},NOW.getTime())===temperature);
    assert.deepEqual(filtered.data.map(l=>l.id).sort(),expected.map(l=>l.id).sort());
    assert.equal(request('GET','/leads/summary',{},query).total,expected.length);
  }
});
test('QA-07: creating a manual opportunity remains visible under Manual origin and through reload', () => {
  const {request,reload}=setup();
  const created=request('POST','/leads',{name:'Manual QA fixture',pipeId:ACCOUNTING_ID,customFields:[{key:'regimeTributario',value:'MEI'}]});
  assert.equal(created.origin,'manual'); assert.equal(created.sourceType,'manual'); assert.equal(created.owner.id,ADMIN_ID);
  assert.equal(request('GET','/leads',{}, {search:created.name,origin:'manual'}).total,1);
  assert.equal(reload().snapshot().leads.find(l=>l.id===created.id).origin,'manual');
});
test('QA-09: explicit empty optional fields clear stored client values; omission preserves them', () => {
  const {request,reload}=setup();
  const original=request('GET','/clients/demo-lead-005'); request('PATCH','/clients/demo-lead-005',{company:'Changed only company'});
  assert.equal(request('GET','/clients/demo-lead-005').email,original.email);
  request('PATCH','/clients/demo-lead-005',{email:'',phone:'',address:''});
  const stored=reload().snapshot().leads.find(l=>l.id===original.id); assert.equal(stored.email,''); assert.equal(stored.phone,''); assert.equal(stored.address,'');
});
test('QA-10: demo preferences do not inherit or overwrite production and reset clears all demo filter scopes', () => {
  const {storage,repo}=setup(); const key='date-filter:/crm';
  storage.setItem(key,'today'); storage.setItem('production-session','preserve');
  assert.equal(readDatePreference(storage,key,true),null); assert.equal(readDatePreference(storage,key,false),'today');
  for(const scope of [key,'date-filter:/clientes','date-filter:/indicadores/geral']) writeDatePreference(storage,scope,'today',true);
  assert.equal(readDatePreference(storage,key,true),'today'); clearDemo(storage);
  assert.equal(storage.getItem(DEMO_PREFERENCES_KEY),null); assert.equal(storage.getItem(STORAGE_KEY),null);
  assert.equal(storage.getItem(key),'today'); assert.equal(storage.getItem('production-session'),'preserve');
  assert.equal(createRepository(storage,()=>NOW).snapshot().leads.length,108);
});
test('QA-10: malformed optional preferences are recoverable and failing preference storage does not break screens', () => {
  const {storage}=setup(); storage.setItem(DEMO_PREFERENCES_KEY,'{broken'); assert.equal(readDatePreference(storage,'x',true),null);
  writeDatePreference(storage,'x','month',true);assert.equal(readDatePreference(storage,'x',true),'month');
  const denied={getItem(){throw Error('denied')},setItem(){throw Error('denied')},removeItem(){}};
  assert.equal(readDatePreference(denied,'x',true),null);assert.doesNotThrow(()=>writeDatePreference(denied,'x','today',true));
});
test('QA-11: agenda lookup by id is exact, limits are bounded and missing id gives no match', () => {
  const {request}=setup(); const id='demo-opening-lead-079';
  const rows=request('GET','/lead-appointments/leads/search',{}, {id,limit:'1'}); assert.equal(rows.length,1);assert.equal(rows[0].id,id);
  assert.equal(request('GET','/lead-appointments/leads/search',{}, {id:'missing',limit:'1'}).length,0);
  assert.equal(request('GET','/lead-appointments/leads/search',{}, {limit:'2'}).length,2);
  assert.equal(request('GET','/lead-appointments/leads/search',{}, {limit:'NaN'}).length,20);
  assert.equal(request('GET','/lead-appointments/leads/search',{}, {limit:'1000000'}).length,100);
});
test('QA-02: storage validation accepts standalone activities but rejects orphaned linked and unlinked follow-ups', () => {
  const db=createSeed(NOW);const a=db.appointments[0];delete a.leadId; a.type='meeting';validateDatabase(db);
  a.type='follow_up';assert.throws(()=>validateDatabase(db));a.type='meeting';a.leadId='not-found';assert.throws(()=>validateDatabase(db));
});
