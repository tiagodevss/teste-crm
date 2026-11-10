import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSeed, PIPES, PRODUCTS } from '../../demo/seed.ts';
import { createRepository, validateDatabase, migrateAccountingScenario } from '../../demo/storage.ts';
import { ACCOUNTING_ID, OPENING_ID, ONBOARDING_ID, HERO_ID, ADMIN_ID, SEED_VERSION, STORAGE_KEY, STATUS } from '../../demo/types.ts';
import { DEMO_PREFERENCES_KEY } from '../../lib/demoPreferences.ts';
const NOW = new Date('2026-11-10T15:00:00Z');
function memory(initial) {
 const values=new Map(initial ? [[STORAGE_KEY, JSON.stringify(initial)]] : []);
 return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
}
function setup(initial) {
 const storage=memory(initial),repo=createRepository(storage,()=>NOW);
 const request=(method,path,body={},query={})=>repo.request(method,path,new URLSearchParams(query),body).body;
 return {storage,repo,request};
}
function legacy() {
 const db=createSeed(NOW);db.seedVersion='2026-11-10.1';db.revision=9;
 db.leads=db.leads.filter(l=>l.pipeId===ACCOUNTING_ID);
 db.labels=db.labels.filter(l=>l.pipeId===ACCOUNTING_ID);
 db.leads[0].company='Accounting edit to preserve';db.leads[0].value=2345;
 const removed=structuredClone(db.leads[0]);removed.id='demo-old-financial';removed.pipeId='demo-financial';removed.businessUnit='FINANCEIRA';removed.labels=[];
 db.leads.push(removed);
 db.appointments.push({...db.appointments[0],id:'demo-old-linked',leadId:removed.id});
 db.appointments.push({...db.appointments[0],id:'demo-standalone-preserved',type:'meeting',leadId:undefined});
 return db;
}
test('accounting scope: three different pipelines with independent stages, forms, products and sample records',()=>{
 const db=createSeed(NOW);validateDatabase(db);
 assert.deepEqual(PIPES.map(p=>p.id),[ACCOUNTING_ID,OPENING_ID,ONBOARDING_ID]);
 assert.ok(PIPES.every(p=>p.unitType==='CONTABILIDADE'));
 assert.deepEqual(PIPES.map(p=>db.leads.filter(l=>l.pipeId===p.id).length),[72,18,18]);
 assert.equal(new Set(PIPES.flatMap(p=>p.steps.map(s=>s.id))).size,18);
 assert.equal(new Set(db.leads.map(l=>l.id)).size,108);
 for(const pipe of PIPES){
  assert.ok(pipe.steps[0].fields.some(f=>f.required));
  assert.ok(pipe.steps[0].fields.some(f=>f.key==='honorarios'));
  assert.ok(PRODUCTS.some(product=>product.pipeId===pipe.id));
  assert.ok(db.leads.filter(l=>l.pipeId===pipe.id).every(l=>pipe.steps.some(s=>s.name===l.stage)));
 }
 assert.ok(!/FINANCEIRA|WMS|cr[e\u00e9]dito|repasse/i.test(JSON.stringify({pipes:PIPES,products:PRODUCTS,leads:db.leads})));
});
test('retired finance endpoints are unavailable and public branding is neutral',()=>{
 const {request}=setup();
 assert.throws(()=>request('GET','/indicators/financial'),e=>e.status===404);
 assert.throws(()=>request('GET','/pipes/demo-financial'),e=>e.status===404);
 assert.ok(!/wms|financeira/i.test(JSON.stringify(request('GET','/settings/public'))));
});
test('general dashboard counts every pipeline exactly once with full contracted fees, not commissions',()=>{
 const {repo,request}=setup(),all=repo.snapshot().leads,g=request('GET','/indicators/general');
 assert.equal(g.summary.totalLeads,all.length);
 assert.equal(g.summary.totalRevenue,all.filter(l=>l.status===STATUS.won).reduce((sum,l)=>sum+l.value,0));
 assert.deepEqual(g.operationShare.map(p=>p.leads),[72,18,18]);
 assert.equal(g.operationShare.reduce((sum,p)=>sum+p.revenue,0),g.summary.totalRevenue);
 for(const pipe of PIPES){const share=g.operationShare.find(p=>p.pipeId===pipe.id);assert.equal(share.slug,pipe.slug);assert.equal(share.operation,pipe.name);}
 const monthly=request('GET','/indicators/accounting').summary.recurringRevenue;
 assert.equal(monthly,all.filter(l=>l.pipeId===ACCOUNTING_ID&&l.status===STATUS.won).reduce((sum,l)=>sum+l.value,0));
 assert.equal(g.evolution.reduce((sum,row)=>sum+row.accountingLeads+row.openingLeads+row.onboardingLeads,0),108);
});
for(const pipeId of [OPENING_ID,ONBOARDING_ID]) {
 test(`new workflow ${pipeId}: required form, isolated product, forward/return, finalization and persisted client`,()=>{
  const {repo,request,storage}=setup();const pipe=PIPES.find(p=>p.id===pipeId),before=repo.snapshot();
  assert.throws(()=>request('POST','/leads',{name:'Missing required fields',pipeId}),e=>e.status===400);
  assert.deepEqual(repo.snapshot(),before);
  const field=pipe.steps[0].fields.find(f=>f.required);
  const created=request('POST','/leads',{name:'Fictitious company test',pipeId,cpfCnpj:before.leads[0].cpfCnpj,value:1500,customFields:[{key:field.key,value:pipeId===OPENING_ID?'Sociedade Limitada':'Previous demo system'}]});
  assert.equal(created.productId,PRODUCTS.find(p=>p.pipeId===pipeId).id);
  const sameBefore=repo.snapshot();
  assert.throws(()=>request('PUT',`/leads/${created.id}`,{productId:PRODUCTS[0].id}),e=>e.status===400);
  assert.throws(()=>request('PUT',`/leads/${created.id}`,{stage:PIPES[0].steps[1].name}),e=>e.status===400);
  assert.deepEqual(repo.snapshot(),sameBefore);
  request('PUT',`/leads/${created.id}`,{stage:pipe.steps[1].name});
  request('PUT',`/leads/${created.id}`,{stage:pipe.steps[0].name});
  const recurring=request('GET','/indicators/accounting').summary.recurringRevenue;
  for(const step of pipe.steps.slice(1,5))request('PUT',`/leads/${created.id}`,{stage:step.name,kanbanObservation:'Fictitious completion approved.'});
  const won=request('GET',`/clients/${created.id}`);assert.equal(won.status,STATUS.won);assert.equal(won.demoRevenue,1500);
  assert.equal(request('GET','/indicators/accounting').summary.recurringRevenue,recurring);
  const restored=createRepository(storage,()=>NOW).snapshot();assert.equal(restored.leads.find(l=>l.id===created.id).stage,pipe.steps[4].name);
  assert.equal(JSON.stringify(restored.leads.filter(l=>l.pipeId===ACCOUNTING_ID)),JSON.stringify(before.leads.filter(l=>l.pipeId===ACCOUNTING_ID)));
  assert.equal(request('GET','/leads',{}, {pipeId}).total,19);
 });
 test(`new workflow ${pipeId}: attendance and follow-up are linked to the right process`,()=>{
  const {repo,request}=setup();const row=repo.snapshot().leads.find(l=>l.pipeId===pipeId);
  request('PUT',`/leads/${row.id}`,{contactAttempt:{contactDate:NOW.toISOString(),channel:'phone',result:'answered',notes:'Fictitious attendance',followUpDate:'2026-11-11T15:00:00Z'}});
  const item=repo.snapshot().appointments.at(-1);assert.equal(item.leadId,row.id);assert.equal(item.ownerUserId,row.ownerUserId);
  request('PATCH',`/lead-appointments/${item.id}`,{status:'completed'});
  assert.equal(repo.snapshot().appointments.at(-1).status,'completed');
 });
}
test('one-time migration keeps accounting edits and independent meetings, drops finance and adds new pipelines',()=>{
 const old=legacy(),storage=memory(old);storage.values.set(DEMO_PREFERENCES_KEY,'old-filters');storage.values.set('unrelated','keep');
 const repo=createRepository(storage,()=>NOW),db=repo.snapshot();
 assert.equal(db.seedVersion,SEED_VERSION);assert.equal(db.revision,10);
 assert.equal(JSON.stringify(db.leads.filter(l=>l.pipeId===ACCOUNTING_ID)),JSON.stringify(old.leads.filter(l=>l.pipeId===ACCOUNTING_ID)));
 assert.equal(db.leads.length,108);assert.ok(!db.leads.some(l=>l.pipeId==='demo-financial'));
 assert.ok(db.appointments.some(a=>a.id==='demo-standalone-preserved'));assert.ok(!db.appointments.some(a=>a.id==='demo-old-linked'));
 assert.equal(storage.getItem(DEMO_PREFERENCES_KEY),null);assert.equal(storage.getItem('unrelated'),'keep');
 assert.equal(JSON.stringify(createRepository(storage,()=>NOW).snapshot()),JSON.stringify(db));
 assert.deepEqual(migrateAccountingScenario(db,NOW),db);
});
test('migration fails closed for corrupt accounting data without replacing the saved database',()=>{
 const bad=legacy();bad.leads[0].stage='invalid-stage';const storage=memory(bad),before=storage.getItem(STORAGE_KEY);
 assert.throws(()=>createRepository(storage,()=>NOW),e=>e.status===409);
 assert.equal(storage.getItem(STORAGE_KEY),before);
});
test('migration handles full storage without discarding previous data or unrelated preferences',()=>{
 const old=legacy(),storage=memory(old),before=storage.getItem(STORAGE_KEY);storage.values.set(DEMO_PREFERENCES_KEY,'previous');storage.setItem=()=>{throw new Error('Full')};
 assert.throws(()=>createRepository(storage,()=>NOW),e=>e.status===507);
 assert.equal(storage.getItem(STORAGE_KEY),before);assert.equal(storage.getItem(DEMO_PREFERENCES_KEY),'previous');
});

test('contracted fee remains consistent across form edits, transitions, persistence and indicators',()=>{
 const {repo,request,storage}=setup();
 for(const pipe of PIPES){
  const original=repo.snapshot().leads.find(l=>l.pipeId===pipe.id && l.status===STATUS.won);
  let row=request('GET',`/leads/${original.id}`);
  assert.equal(row.customFields.find(f=>f.key==='honorarios').value,row.value);
  const before=request('GET','/indicators/general').summary.totalRevenue;
  const fields=row.customFields.map(f=>f.key==='honorarios'?{...f,value:2750}:f);
  row=request('PUT',`/leads/${row.id}`,{customFields:fields});
  assert.equal(row.value,2750);assert.equal(row.demoRevenue,2750);
  assert.equal(request('GET','/indicators/general').summary.totalRevenue,before-original.value+2750);
  request('PATCH',`/clients/${row.id}`,{value:3000});
  row=request('GET',`/clients/${row.id}`);
  assert.equal(row.customFields.find(f=>f.key==='honorarios').value,3000);
  assert.equal(createRepository(storage,()=>NOW).snapshot().leads.find(l=>l.id===row.id).value,3000);
  const unchanged=repo.snapshot();
  assert.throws(()=>request('PUT',`/leads/${row.id}`,{customFields:[{key:'honorarios',value:-1}]}),e=>e.status===400);
  assert.deepEqual(repo.snapshot(),unchanged);
 }
});
