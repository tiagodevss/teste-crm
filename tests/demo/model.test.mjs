import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSeed, PIPES } from '../../demo/seed.ts';
import { createRepository, clearDemo, validateDatabase } from '../../demo/storage.ts';
import { execute, indicators, DEMO_LOGIN, DEMO_PASSWORD } from '../../demo/model.ts';
import { HERO_ID, ACCOUNTING_ID, FINANCIAL_ID, STORAGE_KEY, STATUS, DemoError } from '../../demo/types.ts';
const NOW = new Date('2026-11-10T15:00:00Z');
const memory = () => { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k,v) => map.set(k,v), removeItem: k => map.delete(k), map }; };
const setup = () => { const storage = memory(); return { storage, repo: createRepository(storage, () => NOW) }; };
const read = (repo, path, params = {}) => repo.request('GET', path, new URLSearchParams(params)).body;
const write = (repo, method, path, body) => repo.request(method, path, new URLSearchParams(), body).body;

test('seed deterministic, referentially valid, 108 fictitious records with two independent operations', () => {
  const first = createSeed(NOW); assert.deepEqual(first, createSeed(NOW)); validateDatabase(first);
  assert.equal(first.leads.length,108); assert.equal(first.leads.filter(l=>l.pipeId===ACCOUNTING_ID).length,72);
  assert.ok(first.leads.every(l=>l.email.endsWith('@example.invalid') && l.phone==='00000000000'));
  assert.equal(new Set(first.leads.map(l=>l.id)).size,108);
});
test('login uses the existing session response contract; rejects arbitrary credentials', () => {
  const { repo }=setup(); const auth=write(repo,'POST','/auth/login',{login:DEMO_LOGIN,password:DEMO_PASSWORD});
  assert.equal(auth.user.profile.isAdmin,true); assert.ok(auth.accessToken && auth.refreshToken && auth.expiresIn>3600);
  assert.throws(()=>write(repo,'POST','/auth/login',{login:'real@example.com',password:'anything'}),e=>e.status===401);
});
test('list filters, summary and per-stage pagination use the same cohort', () => {
  const {repo}=setup(); const params={pipeId:ACCOUNTING_ID,ownerUserId:'demo-presenter',dateFrom:'2026-10-01',dateTo:'2026-11-10',limit:'500'};
  const rows=read(repo,'/leads',params); const summary=read(repo,'/leads/summary',params);
  assert.equal(summary.total,rows.total);
  const counts=read(repo,'/leads/count-by-stage',params);
  assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),rows.total);
  for (const stage of Object.keys(counts)) assert.equal(read(repo,'/leads',{...params,stage}).total,counts[stage]);
  assert.equal(read(repo,'/leads',{...params,search:'cannotmatch'}).total,0);
  const sorted=read(repo,'/leads',{limit:'5',sortBy:'name',sortOrder:'asc'}); assert.equal(sorted.data.length,5); assert.equal(sorted.totalPages,22);
});
test('metrics derive from matching records, separated credit principal and illustrative commission', () => {
  const {repo}=setup(); const db=repo.snapshot(); const query=new URLSearchParams({startDate:'2026-10-01',endDate:'2026-11-10'});
  const general=indicators(db,'general',query,NOW); const accounting=indicators(db,'accounting',query,NOW); const financial=indicators(db,'financial',query,NOW);
  assert.equal(general.summary.totalLeads, accounting.summary.leadsReceived+financial.summary.financialLeads);
  assert.equal(general.summary.totalRevenue,accounting.summary.recurringRevenue+financial.summary.releasedValue*.02);
  assert.equal(general.operationShare.reduce((n,o)=>n+o.leads,0),general.summary.totalLeads);
  assert.equal(accounting.funnel.reduce((n,s)=>n+s.count,0),accounting.summary.leadsReceived);
  assert.equal(financial.ranking.reduce((n,r)=>n+r.releasedValue,0),financial.summary.releasedValue);
});
test('hero conversion persists, creates the client view and changes the indicators exactly once', () => {
  const {repo,storage}=setup(); const before=read(repo,'/indicators/accounting');
  const result=write(repo,'PUT',`/leads/${HERO_ID}`,{stage:PIPES[0].steps[4].name,kanbanObservation:'Conversao demonstrativa confirmada.'});
  assert.equal(result.status,STATUS.won); assert.equal(read(repo,`/clients/${HERO_ID}`).id,HERO_ID);
  const after=read(repo,'/indicators/accounting'); assert.equal(after.summary.clientsActivated,before.summary.clientsActivated+1);
  assert.equal(after.summary.recurringRevenue,before.summary.recurringRevenue+result.value);
  assert.equal(read(createRepository(storage,()=>NOW),`/lead/${HERO_ID}`).status,STATUS.won);
  write(repo,'PUT',`/leads/${HERO_ID}`,{stage:PIPES[0].steps[4].name,kanbanObservation:'Conversao demonstrativa confirmada.'});
  assert.equal(read(repo,'/indicators/accounting').summary.clientsActivated,after.summary.clientsActivated);
});
test('contact follow-up creates a linked activity and completing it removes it from scheduled queries', () => {
  const {repo}=setup(); const count=repo.snapshot().appointments.length;
  write(repo,'PUT',`/leads/${HERO_ID}`,{contactAttempt:{type:'ligacao_realizada',channel:'telefone',result:'sucesso',contactDate:'2026-11-10T14:55:00Z',followUpDate:'2026-11-11T15:00:00Z',notes:'Contato inteiramente ficticio.'}});
  assert.equal(repo.snapshot().appointments.length,count+1);
  const added=repo.snapshot().appointments.at(-1); assert.equal(added.leadId,HERO_ID);
  const list=read(repo,'/lead-appointments',{leadId:HERO_ID,dateFrom:'2026-11-11',dateTo:'2026-11-11',status:'scheduled'}); assert.ok(list.data.some(a=>a.id===added.id));
  write(repo,'PATCH',`/lead-appointments/${added.id}`,{status:'completed'});
  assert.ok(!read(repo,'/lead-appointments',{leadId:HERO_ID,status:'scheduled'}).data.some(a=>a.id===added.id));
  assert.equal(read(repo,`/lead/${HERO_ID}`).appointments.find(a=>a.id===added.id).status,'completed');
});
test('failed contact + follow-up transaction leaves no partial change', () => {
  const {repo}=setup(); const before=repo.snapshot();
  assert.throws(()=>write(repo,'PUT',`/leads/${HERO_ID}`,{name:'Should not persist',contactAttempt:{result:'sucesso',channel:'telefone',contactDate:'2026-11-10T14:00:00Z',followUpDate:'2026-11-09T14:00:00Z'}}));
  assert.deepEqual(repo.snapshot(),before);
});
test('new lead validates fixed fields, can be edited, and is persisted across reload', () => {
  const {repo,storage}=setup();
  assert.throws(()=>write(repo,'POST','/leads',{name:'Empresa ficticia',pipeId:ACCOUNTING_ID}));
  assert.equal(repo.snapshot().leads.length,108);
  const created=write(repo,'POST','/leads',{name:'Empresa Nova (ficticia)',pipeId:ACCOUNTING_ID,value:1234,customFields:[{key:'regimeTributario',value:'MEI'}]});
  write(repo,'PUT',`/leads/${created.id}`,{company:'Nova empresa (demo)',value:1500});
  assert.equal(read(createRepository(storage,()=>NOW),`/lead/${created.id}`).value,1500);
});
test('loss captures reason and historic source stage; rejects silent direct loss', () => {
  const {repo}=setup(); const loss=PIPES[0].steps[5];
  assert.throws(()=>write(repo,'PUT',`/leads/${HERO_ID}`,{stage:loss.name}));
  write(repo,'POST',`/leads/${HERO_ID}/loss`,{targetStageId:loss.id,category:'price',description:'Valor ficticio acima do limite de teste.'});
  const result=read(repo,`/leads/${HERO_ID}/commercial-feedback`); assert.equal(result.loss.category,'price'); assert.equal(result.loss.fromStage,'Follow-up');
  assert.equal(read(repo,`/lead/${HERO_ID}`).status,STATUS.lost);
});
test('comments and deadlines survive reload; invalid calendar dates are rejected', () => {
  const {repo,storage}=setup(); write(repo,'POST',`/leads/${HERO_ID}/comments`,{text:'Comentario de teste.'});
  assert.throws(()=>write(repo,'PUT',`/leads/${HERO_ID}/response-deadline`,{responseDeadline:'2026-02-31'}));
  write(repo,'PUT',`/leads/${HERO_ID}/response-deadline`,{responseDeadline:'2026-11-15'});
  const next=createRepository(storage,()=>NOW); assert.equal(read(next,`/lead/${HERO_ID}`).comments.at(-1).text,'Comentario de teste.');
  assert.equal(read(next,`/leads/${HERO_ID}/commercial-feedback`).responseDeadline,'2026-11-15');
});
test('reset removes only demo state and recreates the deterministic seed', () => {
  const {repo,storage}=setup(); storage.setItem('production-key','preserve'); write(repo,'PUT',`/leads/${HERO_ID}`,{value:9999});
  clearDemo(storage); assert.equal(storage.getItem('production-key'),'preserve'); assert.deepEqual(createRepository(storage,()=>NOW).snapshot(),createSeed(NOW));
});
test('corrupt state fails closed and requires explicit recovery, never silently resets', () => {
  const storage=memory(); storage.setItem(STORAGE_KEY,'not json'); assert.throws(()=>createRepository(storage,()=>NOW),e=>e.status===409); assert.equal(storage.getItem(STORAGE_KEY),'not json');
  const broken=createSeed(NOW); broken.leads[0].pipeId='unknown'; assert.throws(()=>validateDatabase(broken));
});
test('storage failure rolls back the whole mutation', () => {
  const {repo,storage}=setup(); const before=repo.snapshot(); storage.setItem=()=>{throw new Error('quota')};
  assert.throws(()=>write(repo,'PUT',`/leads/${HERO_ID}`,{value:9876}),e=>e.status===507); assert.deepEqual(repo.snapshot(),before);
});
test('parallel tabs cannot silently overwrite each other', () => {
  const {repo,storage}=setup(); const other=createRepository(storage,()=>NOW);
  write(repo,'PUT',`/leads/${HERO_ID}`,{value:1234});
  assert.throws(()=>write(other,'PUT',`/leads/${HERO_ID}`,{value:4321}),e=>e.status===409);
  assert.equal(read(createRepository(storage,()=>NOW),`/lead/${HERO_ID}`).value,1234);
});
test('unknown routes and external-service commands are rejected, never fake success', () => {
  const {repo}=setup(); for (const path of ['/whatsapp/send','/uploads','/billing/pay','/auth/activity']) assert.throws(()=>write(repo,'POST',path,{}),e=>e.status===501);
  assert.throws(()=>read(repo,'/lead/demo-missing'),e=>e.status===404);
});
test('empty and impossible filters produce finite zero-valued metrics', () => {
  const db=createSeed(NOW); const q=new URLSearchParams({responsibleId:'unknown'});
  for (const kind of ['general','accounting','financial']) assert.ok(!JSON.stringify(indicators(db,kind,q,NOW)).includes('null'));
  assert.equal(indicators(db,'general',q,NOW).summary.totalLeads,0);
});

test('accounting qualification fields belong to the first stage used by the real form', () => {
  const pipe=PIPES.find(p=>p.id===ACCOUNTING_ID);
  assert.equal(pipe.fields.length,0);
  assert.ok(pipe.steps[0].fields.some(f=>f.key==='regimeTributario' && f.required));
});

test('real create form may submit an unfilled optional currency field', () => {
  for (const optional of [undefined, null, '']) {
    const {repo}=setup();
    const payload=JSON.parse(JSON.stringify({name:'Empresa ficticia',phone:'00000000000',pipeId:ACCOUNTING_ID,customFields:[{key:'regimeTributario',value:'MEI'},{key:'faturamentoMedioMensal',value:optional}]}));
    const created=write(repo,'POST','/leads',payload);
    assert.equal(created.customFields.find(f=>f.key==='regimeTributario').value,'MEI');
    assert.equal(repo.snapshot().leads.length,109);
  }
});
