"""Regression suite for the audited flows, using the compiled UI and real MSW."""
import os,json,re,time,subprocess,traceback,sys
from pathlib import Path
from datetime import datetime,timedelta
from zoneinfo import ZoneInfo
from urllib.request import urlopen
from urllib.parse import urlsplit,parse_qs,urlencode
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'audit-results'/'regression';OUT.mkdir(parents=True,exist_ok=True)
BASE='http://127.0.0.1:4174'+os.environ.get('DEMO_BASE_PATH','/').rstrip('/');KEY='teste-crm:database:v1';HERO='demo-lead-001'
results=[];responses=[];errors=[];external=[];case_name='setup'
def check(ok,detail):
    if not ok:raise AssertionError(detail)
def state(p):return p.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',KEY)
def lead(p,id=HERO):return next(l for l in state(p)['leads'] if l['id']==id)
def api(p,path,method='GET',body=None):
    return p.evaluate('''async ({path,method,body})=>{let r=await fetch(location.pathname+'__demo_api__/v1'+path,{method,headers:{'Content-Type':'application/json','Authorization':'Bearer contabil-demo-local-access'},...(body==null?{}:{body:JSON.stringify(body)})});return {status:r.status,body:await r.json()}}''',{'path':path,'method':method,'body':body})
def good(r):check(r['status']<300,r);return r['body']
def go(p,path):p.goto(BASE+'/#'+path);expect(p.locator('.demo-toolbar')).to_be_visible();p.wait_for_timeout(300)
def capture(p,name):
    name=re.sub(r'[^a-zA-Z0-9_-]','_',name)
    p.screenshot(path=str(OUT/(name+'.png')),full_page=True)
    (OUT/(name+'.txt')).write_text(p.locator('body').inner_text(),encoding='utf-8')
    try:(OUT/(name+'-state.json')).write_text(json.dumps(p.evaluate('(k)=>localStorage.getItem(k)',KEY),ensure_ascii=False))
    except Exception:pass

def select(p,locator,text):locator.click();p.get_by_role('option',name=text,exact=True).click()
def tomorrow(days=1):return (datetime.now(ZoneInfo('America/Sao_Paulo'))+timedelta(days=days)).replace(hour=14,minute=0,second=0,microsecond=0)
def create_activity_api(p,kind='follow_up',note='Audit fixture'):
    return good(api(p,'/lead-appointments','POST',{'leadId':HERO,'ownerUserId':'demo-presenter','type':kind,'channel':'phone','scheduledAt':tomorrow().isoformat(),'notes':note}))
def appointment(p,id):return next(a for a in state(p)['appointments'] if a['id']==id)
def new_activity(p,kind='Reunião',link=False):
    go(p,'/atividades');p.get_by_role('button',name='Nova atividade',exact=True).first.click()
    select(p,p.locator('#appt-type'),kind);p.locator('#appt-scheduled-at').fill(tomorrow().strftime('%Y-%m-%dT%H:%M'));p.locator('#appt-notes').fill('Atividade ficticia da auditoria '+kind)
    if link:
        p.locator('#appt-lead').fill('Aurora');p.get_by_role('option').filter(has_text='Aurora Comércio').first.click()
def await_request(p,fn,method,path):
    with p.expect_response(lambda r:r.request.method==method and r.url.endswith(path),timeout=10000) as info:fn()
    r=info.value
    return {'status':r.status,'body':r.json()}
def run(browser,name,fn):
    global case_name
    case_name=name;c=browser.new_context(viewport={'width':1366,'height':768},locale='pt-BR',timezone_id='America/Sao_Paulo',service_workers='allow')
    c.on('request',lambda r:external.append({'case':name,'url':r.url}) if r.url.startswith(('http:','https:','ws:','wss:')) and not r.url.startswith(BASE+'/') and r.url!=BASE else None)
    c.route(re.compile(r'^https?://(?!127\.0\.0\.1:4174(?:/|$)).*'),lambda route:route.abort())
    p=c.new_page();p.set_default_timeout(10000)
    p.on('pageerror',lambda e:errors.append({'case':name,'error':str(e)}))
    p.on('response',lambda r:responses.append({'case':name,'url':r.url,'status':r.status,'method':r.request.method,'payload':r.request.post_data}) if '/__demo_api__/' in r.url else None)
    start=time.monotonic()
    try:
        p.goto(BASE+'/');p.get_by_role('button',name='Entrar na demonstração',exact=True).click();expect(p.get_by_role('heading',name='Indicadores',exact=True)).to_be_visible()
        detail=fn(p,c);results.append({'name':name,'status':'passed','detail':detail})
    except Exception as e:
        results.append({'name':name,'status':'failed','error':str(e),'trace':traceback.format_exc()})
        try:capture(p,name+'-failed')
        except Exception as exc:results[-1]['capture_error']=str(exc)
    finally:c.close()
    results[-1]['seconds']=round(time.monotonic()-start,2);print(json.dumps(results[-1],ensure_ascii=False),flush=True)

def client_comment(p,c):
    go(p,'/cliente/demo-lead-005');note='Comentario de cliente confirmado pela interface da auditoria.'
    p.get_by_placeholder('Comentário interno sobre o cliente (não substitui o registro de contato)...').fill(note)
    good(await_request(p,lambda:p.get_by_role('button',name='Enviar',exact=True).click(),'POST','/leads/demo-lead-005/comments'))
    p.reload();expect(p.get_by_text(note,exact=True)).to_be_visible();check(any(x['text']==note for x in lead(p,'demo-lead-005')['comments']),'Comment not persisted');capture(p,'client-comment-passed')
def client_owner(p,c):
    go(p,'/cliente/demo-lead-005');before=lead(p,'demo-lead-005')['responsibleUserId'];target='demo-bruno' if before!='demo-bruno' else 'demo-ana';label='Bruno Demo' if target=='demo-bruno' else 'Ana Demo'
    p.get_by_role('button',name='Editar',exact=True).click();d=p.get_by_role('dialog');select(p,d.get_by_role('button',name='Responsável',exact=True),label)
    good(await_request(p,lambda:d.get_by_role('button',name='Salvar',exact=True).click(),'PATCH','/clients/demo-lead-005'))
    expect(d).not_to_be_visible();p.reload();p.wait_for_timeout(300);actual=lead(p,'demo-lead-005')['responsibleUserId']
    capture(p,'client-owner-after-save');check(actual==target,{'previous':before,'chosen':target,'persisted':actual})
def client_clear_email(p,c):
    go(p,'/cliente/demo-lead-005');p.get_by_role('button',name='Editar',exact=True).click();d=p.get_by_role('dialog');d.locator('input[name=email]').fill('')
    good(await_request(p,lambda:d.get_by_role('button',name='Salvar',exact=True).click(),'PATCH','/clients/demo-lead-005'));expect(d).not_to_be_visible();p.reload();p.wait_for_timeout(300)
    check(not lead(p,'demo-lead-005').get('email'),{'stored':lead(p,'demo-lead-005').get('email')})
def meeting_without_lead(p,c):
    before=len(state(p)['appointments']);new_activity(p,'Reunião');r=await_request(p,lambda:p.get_by_role('button',name='Salvar atividade').click(),'POST','/lead-appointments')
    capture(p,'meeting-no-lead-result');check(r['status']==201,r);check(len(state(p)['appointments'])==before+1,'Activity missing')
def meeting_with_lead(p,c):
    before=len(state(p)['appointments']);new_activity(p,'Reunião',True);good(await_request(p,lambda:p.get_by_role('button',name='Salvar atividade').click(),'POST','/lead-appointments'))
    check(len(state(p)['appointments'])==before+1,'Missing linked meeting');check(state(p)['appointments'][-1]['leadId']==HERO,'Wrong lead')
def followup_requires_lead(p,c):
    new_activity(p,'Retorno');before=state(p);p.get_by_role('button',name='Salvar atividade').click();expect(p.get_by_text('Vincule um lead para registrar o retorno no histórico.',exact=True)).to_be_visible();check(state(p)==before,'Invalid followup saved')
def manual_origin(p,c):
    go(p,'/crm/contabilidade-demo');p.get_by_role('button',name='Novo Lead',exact=True).click();d=p.get_by_role('dialog');name='Empresa Manual Auditoria ficticia'
    d.locator('input[name=name]').fill(name);d.locator('input[name=phone]').fill('00000000000');d.get_by_role('button',name='MEI',exact=True).click()
    good(await_request(p,lambda:d.get_by_role('button',name='Criar lead').click(),'POST','/leads'));expect(d).not_to_be_visible()
    p.get_by_role('button',name='Todo o período',exact=True).click();p.get_by_placeholder('Buscar lead por nome...').fill(name);p.get_by_placeholder('Buscar lead por nome...').press('Enter');expect(p.get_by_role('heading',name=name,exact=True)).to_be_visible()
    p.get_by_role('button',name='Filtros avançados',exact=True).click();p.get_by_label('Origem do lead',exact=True).select_option('manual');p.wait_for_timeout(600);capture(p,'manual-origin-filter')
    check(p.get_by_role('heading',name=name,exact=True).count()==1,'New manual lead vanishes in Manual origin filter')
def team_owners(p,c):
    go(p,'/atividades/equipe');p.locator('#team-user-filter').select_option('demo-ana');p.wait_for_timeout(400);capture(p,'team-owner-filter')
    names=p.locator('.demo-content h3').all_text_contents();check('Ana Demo' in names,{'headings':names})
def labels_ui(p,c):
    go(p,'/lead/'+HERO);p.get_by_role('button',name='Etiquetas',exact=True).click();d=p.get_by_role('dialog');d.get_by_role('button',name='Indicação',exact=True).click();d.get_by_role('button',name='Aplicar',exact=True).click();expect(d).not_to_be_visible()
    p.reload();p.wait_for_timeout(300);check(any(x['name']=='Indicação' for x in lead(p)['labels']),'Label assignment lost')
    go(p,'/crm/contabilidade-demo');p.get_by_role('button',name='Todo o período',exact=True).click();p.get_by_label('Filtrar por etiqueta').select_option('demo-accounting-label-referral');expect(p.get_by_role('heading',name='Aurora Comércio (demonstração)',exact=True)).to_be_visible()
def loss_ui(p,c):
    ret=create_activity_api(p,'follow_up','Must cancel after loss');meeting=create_activity_api(p,'meeting','Must preserve after loss');go(p,'/lead/'+HERO)
    p.get_by_role('button',name='Registrar perda',exact=True).click();d=p.get_by_role('dialog');d.get_by_label('Mover para').select_option('demo-accounting-step-5');d.get_by_label('Motivo da recusa').select_option('price');d.get_by_placeholder('Explique o que o cliente recusou e por quê...').fill('Cliente ficticio recusou o preco da proposta nesta auditoria.')
    good(await_request(p,lambda:d.get_by_role('button',name='Confirmar perda').click(),'POST','/leads/'+HERO+'/loss'));expect(d).not_to_be_visible();p.reload();p.wait_for_timeout(300)
    check(lead(p)['status']=='Perdido','Loss not persisted');check(lead(p)['loss']['fromStage']=='Follow-up','Wrong source stage');check(appointment(p,meeting['id'])['status']=='scheduled','Meeting wrongly canceled')
    capture(p,'loss-and-pending-return');check(appointment(p,ret['id'])['status']=='canceled','Loss leaves pending returns active')
def deadline_ui(p,c):
    go(p,'/lead/'+HERO);value=tomorrow(4).strftime('%Y-%m-%d');p.locator('#lead-response-deadline').fill(value);p.get_by_role('button',name='Salvar prazo',exact=True).click();p.wait_for_function('([k,v])=>JSON.parse(localStorage.getItem(k)).leads[0].responseDeadline===v',arg=[KEY,value]);p.reload();expect(p.locator('#lead-response-deadline')).to_have_value(value)
    p.locator('#lead-response-deadline').fill('');p.get_by_role('button',name='Salvar prazo',exact=True).click();p.wait_for_function('(k)=>JSON.parse(localStorage.getItem(k)).leads[0].responseDeadline===null',arg=KEY)
def agenda_action(p,c,action):
    item=create_activity_api(p,'meeting','Agenda audit '+action);go(p,'/atividades/agenda');p.locator('#agenda-date-picker').fill(tomorrow().strftime('%Y-%m-%d'));row=p.locator('li:visible').filter(has_text='Agenda audit '+action);expect(row).to_be_visible()
    if action=='Reagendar':
        row.get_by_role('button',name='Reagendar',exact=True).click();p.locator('#appt-scheduled-at').fill(tomorrow(2).strftime('%Y-%m-%dT%H:%M'))
        good(await_request(p,lambda:p.get_by_role('button',name='Salvar alterações').click(),'PATCH','/lead-appointments/'+item['id']))
        check(appointment(p,item['id'])['scheduledAt'].startswith(tomorrow(2).strftime('%Y-%m-%d')),'Reschedule not saved')
    else:
        if action=='Concluir':row.get_by_role('button',name=re.compile('Marcar atividade')).click()
        else:row.get_by_role('button',name=action,exact=True).filter(visible=True).click()
        p.wait_for_timeout(150);dialog=p.get_by_role('dialog')
        if dialog.count():dialog.locator('button').all()[-1].click()
        expected={'Concluir':'completed','Não veio':'no_show','Cancelar':'canceled'}[action]
        p.wait_for_function('([k,id,s])=>JSON.parse(localStorage.getItem(k)).appointments.find(a=>a.id===id).status===s',arg=[KEY,item['id'],expected])
    capture(p,'agenda-'+action)
def quota(p,c):
    before=state(p);p.evaluate('''()=>{window.auditSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='teste-crm:database:v1')throw new DOMException('Full','QuotaExceededError');return window.auditSet.call(this,k,v)}}''')
    try:r=api(p,'/leads/'+HERO,'PUT',{'company':'Must rollback'});check(r['status']==507,r);check(state(p)==before,'Partial state saved');return r
    finally:p.evaluate('()=>{Storage.prototype.setItem=window.auditSet;}')
def corrupt(p,c):
    p.evaluate('(k)=>localStorage.setItem(k,"{broken-json")',KEY);p.reload();expect(p.get_by_role('button',name='Restaurar cenário local')).to_be_visible();check(p.evaluate('(k)=>localStorage.getItem(k)',KEY)=='{broken-json','Silently reset')
    p.once('dialog',lambda d:d.accept());p.get_by_role('button',name='Restaurar cenário local').click()
    p.wait_for_function('(k)=>{try{return JSON.parse(localStorage.getItem(k)).leads.length===108}catch{return false}}',arg=KEY)
    check(p.get_by_role('button',name='Tentar novamente',exact=True).count()==0,'Still on bootstrap error');capture(p,'corrupt-recovered')
def storage_denied(p,c):
    p.add_init_script("const get=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(k==='teste-crm:database:v1')throw new DOMException('Denied','SecurityError');return get.call(this,k)}")
    p.reload();expect(p.get_by_role('heading',name='Não foi possível abrir a demonstração')).to_be_visible();expect(p.get_by_role('button',name='Tentar novamente')).to_be_visible();capture(p,'storage-denied-controlled')
def sw_failure(p,c):
    p.add_init_script("navigator.serviceWorker.register=async()=>{throw new Error('Audit simulated worker failure')}");p.reload();expect(p.get_by_role('heading',name='Não foi possível abrir a demonstração')).to_be_visible();capture(p,'worker-failure-controlled')
def external_protocols(p,c):
    report=p.evaluate('''async()=>{let a={};try{new EventSource('https://example.invalid/events')}catch{a.eventSource=true}try{let x=new XMLHttpRequest();x.open('POST','https://example.invalid/send');x.send('test')}catch{a.xhr=true}try{await fetch('https://example.invalid/api')}catch{a.fetch=true}try{new WebSocket('wss://example.invalid')}catch{a.websocket=true}a.beacon=!navigator.sendBeacon('https://example.invalid/beacon','demo');a.popup=!window.open('https://example.invalid/');return a}''');check(all(report.values()) and len(report)==6,report);return report

def fixed_lookup(p,c):
    r=good(api(p,'/lead-appointments/leads/search?id=demo-onboarding-lead-100&limit=1'));check(len(r)==1 and r[0]['id']=='demo-onboarding-lead-100',{'response_count':len(r),'ids':[v['id'] for v in r]})
def confirm(p):
    d=p.get_by_role('dialog');expect(d).to_be_visible();d.locator('textarea').fill('Movimentacao ficticia confirmada pela auditoria.');d.get_by_role('button',name='Confirmar e mover',exact=True).click();expect(d).not_to_be_visible()
def hot_final(p,c):
    go(p,'/lead/demo-lead-002')
    for stage in ['Proposta enviada','Follow-up']:
        p.get_by_text('Ações do processo',exact=True).click();p.get_by_role('button',name='Avançar para '+stage,exact=True).click();confirm(p)
        p.wait_for_function('([k,s])=>JSON.parse(localStorage.getItem(k)).leads[1].stage===s',arg=[KEY,stage])
    row=lead(p,'demo-lead-002');check(len([x for x in row['timeline'] if x['type']=='stage_change'])>=2,'Missing transitions')
    go(p,'/crm/contabilidade-demo');p.get_by_role('button',name='Todo o período',exact=True).click();p.get_by_label('Temperatura do lead').select_option('hot');p.wait_for_timeout(500);capture(p,'hot-filter-after-confirmed-moves')
    check(p.get_by_role('heading',name=row['name'],exact=True).count()==1,'Hot filter omits recently advanced lead')
def client_contact_filter(p,c):
    id='demo-lead-005';today=datetime.now(ZoneInfo('America/Sao_Paulo')).strftime('%Y-%m-%d');go(p,'/cliente/'+id)
    p.locator('#client-contact-notes').fill('Atendimento registrado hoje para validar o filtro de ultimo contato.')
    good(await_request(p,lambda:p.get_by_role('button',name='Registrar atendimento',exact=True).click(),'PUT','/leads/'+id))
    row=lead(p,id);check(row['lastContactDate'][:10]==today,{'lastContactDate':row['lastContactDate'],'today':today})
    go(p,'/clientes');p.locator('#clients-list-search').fill(row['name']);p.locator('#clients-list-search').press('Enter');expect(p.get_by_text(row['name'],exact=True).first).to_be_visible()
    p.get_by_role('button',name='Abrir filtros').click();d=p.get_by_role('dialog');d.get_by_label('Contato a partir de').fill(today);d.get_by_label('Contato até',exact=True).fill(today);d.get_by_role('button',name='Aplicar',exact=True).click();p.wait_for_timeout(400);capture(p,'client-last-contact-filter')
    check(p.get_by_text(row['name'],exact=True).count()>0,{'createdAt':row['createdAt'],'lastContactDate':row['lastContactDate'],'range':today})
def client_filters_sort(p,c):
    go(p,'/clientes');p.get_by_role('button',name='Próxima página').click();expect(p.locator('.demo-content')).to_contain_text('Empresa')
    p.get_by_role('button',name='Página anterior').click();p.get_by_role('button',name='Abrir filtros').click();d=p.get_by_role('dialog');d.locator('#filter-company').fill('not-a-real-company-unique');d.get_by_role('button',name='Aplicar',exact=True).click();p.wait_for_timeout(300)
    check(p.get_by_role('button',name=re.compile('Ver detalhes de')).count()==0,'Empty company filter ignored')
    p.get_by_role('button',name='Abrir filtros').click();d=p.get_by_role('dialog');d.get_by_role('button',name=re.compile('Limpar')).click();p.wait_for_timeout(300)
    if d.count():p.keyboard.press('Escape')
    p.get_by_role('tab',name='Repescagem',exact=True).click();p.wait_for_timeout(300);capture(p,'clients-recovery-tab');check('Repescagem' in p.locator('body').inner_text(),'Tab missing')
def dashboard_dates(p,c,mode):
    go(p,'/indicadores/geral');before=[r for r in responses if r['case']==case_name and '/indicators/general' in r['url']];p.get_by_role('button',name=mode,exact=True).click();d=p.get_by_role('dialog');inputs=d.locator('input[type=text]')
    values=['01/01/2030','31/01/2030'] if mode=='1 período' else ['01/01/2030','31/01/2030','01/01/2031','31/01/2031']
    for i,v in enumerate(values):inputs.nth(i).fill(v);inputs.nth(i).press('Tab')
    d.get_by_role('button',name='Aplicar',exact=True).click();expect(d).not_to_be_visible();p.wait_for_timeout(400);after=[r for r in responses if r['case']==case_name and '/indicators/general' in r['url']];capture(p,'dashboard-custom-'+str(len(values)))
    check(any('2030' in r['url'] or (r.get('payload') and '2030' in r['payload']) for r in after[len(before):]),{'before':before,'after':after,'chosen':values})
def drilldown(p,c,operation):
    title={'geral':'Leads totais','contabilidade':'Leads recebidos'}[operation]
    go(p,'/indicadores/'+operation);p.get_by_role('button',name='Todo o período',exact=True).click();p.locator('.demo-content select').first.select_option('demo-ana');p.wait_for_timeout(250)
    with p.expect_response(lambda r:'/__demo_api__/v1/leads?' in r.url and r.request.method=='GET') as info:p.get_by_role('button',name=re.compile(title)).click()
    expect(p.get_by_role('heading',name='Registros do indicador')).to_be_visible();q=parse_qs(urlsplit(urlsplit(p.url).fragment).query);rows=[x for x in state(p)['leads'] if x['ownerUserId']=='demo-ana']
    if operation!='geral':rows=[x for x in rows if x['pipeId']=='demo-accounting']
    actual=info.value.json();check(actual['total']==len(rows),{'expected':len(rows),'actual':actual['total'],'query':q});check(q.get('ownerUserId')==['demo-ana'],q)
    p.locator('#demo-indicator-search').fill('no-match-ever');p.get_by_role('button',name='Pesquisar',exact=True).click();p.wait_for_timeout(250);expect(p.get_by_text('Nenhum registro corresponde a esses filtros.')).to_be_visible()
def stage_and_owner_drilldown(p,c):
    go(p,'/indicadores/contabilidade');p.get_by_role('button',name='Todo o período',exact=True).click();p.wait_for_timeout(300)
    targets=p.locator('[title^="Abrir etapa "]').evaluate_all('es=>es.map(e=>e.title)');check(len(targets)>0,'Stage drilldowns absent')
    for title in targets:
        go(p,'/indicadores/contabilidade');p.get_by_title(title,exact=True).click();expect(p.get_by_role('heading',name='Registros do indicador')).to_be_visible();check('stage=' in p.url,p.url)
    go(p,'/indicadores/contabilidade');targets=p.locator('[title^="Ver leads de "]').evaluate_all('es=>es.map(e=>e.title)')
    for title in targets:
        go(p,'/indicadores/contabilidade');p.get_by_title(title,exact=True).click();expect(p.get_by_role('heading',name='Registros do indicador')).to_be_visible();check('ownerUserId=' in p.url,p.url)
    return 'All rendered accounting stage/ranking drilldowns opened correctly'
def drag_mouse(p,c):
    p.set_viewport_size({'width':1920,'height':1080});go(p,'/crm/contabilidade-demo');p.get_by_role('button',name='Todo o período',exact=True).click()
    name=lead(p,'demo-lead-002')['name'];search=p.get_by_placeholder('Buscar lead por nome...');search.fill(name);search.press('Enter');p.wait_for_timeout(600)
    card=p.locator('[draggable=true]').filter(has_text=name);target=p.locator('[data-kanban-stage="Proposta enviada"]');expect(card).to_be_visible()
    p.evaluate("window.dragAudit=[];for(const t of ['dragstart','dragover','drop','dragend'])document.addEventListener(t,e=>window.dragAudit.push({type:t,target:e.target.closest('[data-kanban-stage]')?.getAttribute('data-kanban-stage')}),true)")
    source_box=card.bounding_box();target_box=target.bounding_box();check(source_box and target_box,'Drag elements unavailable')
    sx=source_box['x']+source_box['width']/2;sy=source_box['y']+20;tx=target_box['x']+target_box['width']/2;ty=target_box['y']+100
    p.mouse.move(sx,sy);p.mouse.down();p.mouse.move(sx+15,sy+15,steps=5);p.wait_for_timeout(150)
    p.mouse.move(tx,ty,steps=20);p.mouse.move(tx+2,ty+2,steps=2);p.wait_for_timeout(150);p.mouse.up();p.wait_for_timeout(300)
    (OUT/'native-mouse-drag-events.json').write_text(json.dumps(p.evaluate('window.dragAudit'),ensure_ascii=False,indent=2));capture(p,'native-mouse-drag-before-confirm')
    confirm(p);p.wait_for_function('(k)=>JSON.parse(localStorage.getItem(k)).leads[1].stage==="Proposta enviada"',arg=KEY)
    go(p,'/lead/demo-lead-002');p.get_by_text('Ações do processo',exact=True).click();p.get_by_role('button',name='Retornar para Diagnóstico',exact=True).click();confirm(p)
    p.wait_for_function('(k)=>JSON.parse(localStorage.getItem(k)).leads[1].stage==="Diagnóstico"',arg=KEY);capture(p,'drag-and-return-confirmed')
    return 'Native mouse drag plus return action, observing the actual persisted stage'
def reset_wait_login(p,c):
    go(p,'/crm/contabilidade-demo');p.get_by_role('button',name='Hoje',exact=True).click();p.wait_for_timeout(300)
    p.evaluate("localStorage.setItem('date-filter:/crm','week');localStorage.setItem('production-session-sentinel','preserve')");before=p.evaluate("JSON.parse(localStorage.getItem('teste-crm:preferences:v1')||'{}')['date-filter:/crm']");check(before=='today',{'initial_filter':before})
    p.get_by_role('button',name='Restaurar demo',exact=True).click();p.get_by_role('button',name='Restaurar cenário',exact=True).click()
    p.get_by_role('button',name='Entrar na demonstração',exact=True).click();expect(p.get_by_role('heading',name='Indicadores',exact=True)).to_be_visible();expect(p.locator('.demo-toolbar')).to_be_visible()
    go(p,'/crm/contabilidade-demo');check(len(state(p)['leads'])==108,'Database did not reset')
    check(p.evaluate("localStorage.getItem('date-filter:/crm')")=='week','Reset changed production filters');check(p.evaluate("localStorage.getItem('production-session-sentinel')")=='preserve','Reset changed production session');value=p.evaluate("JSON.parse(localStorage.getItem('teste-crm:preferences:v1')||'{}')['date-filter:/crm']");capture(p,'reset-date-filter-after-awaited-login')
    check(value!='today',{'saved_filter':value,'records':108})
def precise_comparison(p,c,operation):
    endpoint={'geral':'general','contabilidade':'accounting'}[operation];key={'geral':'totalLeads','contabilidade':'leadsReceived'}[operation]
    go(p,'/indicadores/'+operation);p.locator('.demo-content select').first.select_option('demo-ana');today=datetime.now(ZoneInfo('America/Sao_Paulo')).date()
    dates=[today-timedelta(days=15),today,today-timedelta(days=150),today-timedelta(days=70)]
    queries=[{'startDate':str(dates[0]),'endDate':str(dates[1]),'responsibleId':'demo-ana'},{'startDate':str(dates[2]),'endDate':str(dates[3]),'responsibleId':'demo-ana'}]
    counts=[good(api(p,'/indicators/'+endpoint+'?'+urlencode(q)))['summary'][key] for q in queries]
    p.get_by_role('button',name='2 períodos',exact=True).click();d=p.get_by_role('dialog')
    for i,value in enumerate(dates):d.locator('input[type=text]').nth(i).fill(value.strftime('%d/%m/%Y'));d.locator('input[type=text]').nth(i).press('Tab')
    d.get_by_role('button',name='Aplicar',exact=True).click();expect(d).not_to_be_visible();panel=p.get_by_test_id('indicator-period-comparison');expect(panel.locator('tbody tr')).to_have_count(4);cells=panel.locator('tbody tr').first.locator('td')
    expect(cells.nth(0)).to_have_text(str(counts[0]));expect(cells.nth(1)).to_have_text(str(counts[1]));expect(cells.nth(2)).to_have_text(str(counts[1]-counts[0]))
    for query in queries:check(any('/indicators/'+endpoint+'?' in r['url'] and all(v in r['url'] for v in query.values()) for r in responses if r['case']==case_name),'Range/owner query not observed')
    capture(p,'comparison-'+operation);p.get_by_role('button',name='Limpar todos',exact=True).click();expect(panel).not_to_be_visible();expect(p.locator('.demo-content select').first).to_have_value('')
    expect(p.get_by_role('button',name='60 Dias',exact=True)).to_have_class(re.compile('bg-salesforce-blue'));p.reload();expect(p.get_by_role('button',name='60 Dias',exact=True)).to_have_class(re.compile('bg-salesforce-blue'))
    return {'counts':counts,'ranges':queries}
def additional_single_range(p,c,operation):
    endpoint={'contabilidade':'accounting'}[operation]
    go(p,'/indicadores/'+operation);p.get_by_role('button',name='1 período',exact=True).click();d=p.get_by_role('dialog')
    for i,v in enumerate(['01/01/2030','31/01/2030']):d.locator('input[type=text]').nth(i).fill(v);d.locator('input[type=text]').nth(i).press('Tab')
    d.get_by_role('button',name='Aplicar',exact=True).click();expect(d).not_to_be_visible();p.wait_for_timeout(500)
    check(any('/indicators/'+endpoint+'?' in r['url'] and 'startDate=2030-01-01' in r['url'] and 'endDate=2030-01-31' in r['url'] for r in responses if r['case']==case_name),'Single range ignored')
def viewport_no_overflow(p,c):
    checked=[]
    for width in [390,768,1366,1920]:
        p.set_viewport_size({'width':width,'height':900 if width<1000 else 1080})
        for path in ['/indicadores/geral','/lead/'+HERO,'/clientes','/atividades/agenda']:
            go(p,path);p.wait_for_timeout(300);measure=p.evaluate('({viewport:window.innerWidth,document:document.documentElement.scrollWidth})');check(measure['document']<=measure['viewport'],{'width':width,'path':path,'measure':measure})
            checked.append({'width':width,'path':path,**measure});capture(p,'viewport-'+str(width)+path.replace('/','-'))
    return checked

def standalone_meeting_edit_complete(p,c):
    new_activity(p,'Reunião');good(await_request(p,lambda:p.get_by_role('button',name='Salvar atividade').click(),'POST','/lead-appointments'))
    item=state(p)['appointments'][-1];check(not item.get('leadId'),'Standalone meeting got invented link')
    go(p,'/atividades/agenda');p.locator('#agenda-date-picker').fill(tomorrow().strftime('%Y-%m-%d'))
    row=p.locator('li:visible').filter(has_text='Atividade ficticia da auditoria Reunião');expect(row).to_be_visible();row.get_by_role('button',name='Reagendar',exact=True).click()
    scheduled=tomorrow(2);p.locator('#appt-scheduled-at').fill(scheduled.strftime('%Y-%m-%dT%H:%M'))
    good(await_request(p,lambda:p.get_by_role('button',name='Salvar alterações').click(),'PATCH','/lead-appointments/'+item['id']))
    p.wait_for_function('([k,id,at])=>Date.parse(JSON.parse(localStorage.getItem(k)).appointments.find(a=>a.id===id).scheduledAt)===Date.parse(at)',arg=[KEY,item['id'],scheduled.isoformat()])
    p.reload();p.locator('#agenda-date-picker').fill(tomorrow(2).strftime('%Y-%m-%d'));expect(row).to_be_visible();row.get_by_role('button',name=re.compile('Marcar atividade')).click()
    dialog=p.get_by_role('dialog');expect(dialog).to_be_visible();good(await_request(p,lambda:dialog.get_by_role('button',name='Concluir',exact=True).click(),'PATCH','/lead-appointments/'+item['id']))
    p.wait_for_function('([k,id])=>JSON.parse(localStorage.getItem(k)).appointments.find(a=>a.id===id).status==="completed"',arg=[KEY,item['id']]);capture(p,'standalone-meeting-completed')
def date_modal_apply_cancel(p,c):
    go(p,'/indicadores/geral')
    def indicator_calls():return [r['url'] for r in responses if r['case']==case_name and '/indicators/general?' in r['url']]
    p.wait_for_timeout(200);before=len(indicator_calls());p.get_by_role('button',name='1 período',exact=True).click();d=p.get_by_role('dialog')
    for i,v in enumerate(['01/01/2030','31/01/2030']):d.locator('input[type=text]').nth(i).fill(v);d.locator('input[type=text]').nth(i).press('Tab')
    p.wait_for_timeout(200);check(len(indicator_calls())==before,'Draft dates fetched before Apply');d.get_by_role('button',name='Cancelar',exact=True).click();expect(d).not_to_be_visible()
    expect(p.get_by_role('button',name='60 Dias',exact=True)).to_have_class(re.compile('bg-salesforce-blue'));p.get_by_role('button',name='1 período',exact=True).click();d=p.get_by_role('dialog')
    for i,v in enumerate(['31/01/2030','01/01/2030']):d.locator('input[type=text]').nth(i).fill(v);d.locator('input[type=text]').nth(i).press('Tab')
    expect(d.get_by_role('button',name='Aplicar',exact=True)).to_be_disabled()
    for i,v in enumerate(['01/01/2030','31/01/2030']):d.locator('input[type=text]').nth(i).fill(v);d.locator('input[type=text]').nth(i).press('Tab')
    d.get_by_role('button',name='Aplicar',exact=True).click();expect(d).not_to_be_visible();expect(p.locator('[aria-busy=true]')).to_have_count(0)
    check(any('startDate=2030-01-01' in u and 'endDate=2030-01-31' in u for u in indicator_calls()),'Applied range not fetched');before=len(indicator_calls());p.get_by_role('button',name='2 períodos',exact=True).click();d=p.get_by_role('dialog')
    for i,v in enumerate(['01/01/2031','31/01/2031','01/01/2032','31/01/2032']):d.locator('input[type=text]').nth(i).fill(v);d.locator('input[type=text]').nth(i).press('Tab')
    p.keyboard.press('Escape');expect(d).not_to_be_visible();p.wait_for_timeout(200);check(len(indicator_calls())==before,'Escape changed the applied range')
    expect(p.get_by_test_id('indicator-period-comparison')).not_to_be_visible();capture(p,'date-modal-cancel-restored-applied-range')


# Accounting-only scenarios exercise the actual dynamic forms and existing modules.
NEW_PIPES=[('demo-opening','abertura-empresas-demo','Abertura de Empresas','demo-opening-lead-073','demo-opening-lead-076','Viabilidade','Solicitação recebida','Concluir abertura'),('demo-onboarding','onboarding-contabil-demo','Onboarding Contábil','demo-onboarding-lead-091','demo-onboarding-lead-094','Coleta de documentos','Boas-vindas','Concluir onboarding')]
def accounting_brand_and_pipes(p,c):
    for path in ['/indicadores/geral','/indicadores/contabilidade','/crm','/clientes','/atividades']:
        go(p,path)
        text=p.locator('body').inner_text()
        check(not re.search(r'\bWMS\b|Financeira|Crédito|Repasse',text,re.I),{'path':path,'unexpected_brand_or_operation':text})
        check(p.locator('img[src*=logo]').count()==0,'Legacy logo image rendered')
    go(p,'/crm')
    for name in ['Contabilidade','Abertura de Empresas','Onboarding Contábil']:expect(p.get_by_role('heading',name=name,exact=True)).to_be_visible()
    expect(p.get_by_role('button',name='Criar novo funil',exact=True)).to_have_count(0)
    go(p,'/crm/financeira-demo');expect(p.get_by_role('heading',name='Fluxos de Trabalho',exact=True)).to_be_visible()
    capture(p,'accounting-three-pipeline-picker')
    go(p,'/indicadores/financeira');check(p.url.endswith('/indicadores/geral'),'Retired route did not redirect')
    p.get_by_role('button',name='Sair da demonstração').click();expect(p.get_by_role('button',name='Entrar na demonstração')).to_be_visible()
    check('CRM Contábil' in p.locator('body').inner_text(),'Neutral login brand missing');check(not re.search(r'\bWMS\b|Financeira',p.locator('body').inner_text(),re.I),'Old login branding')
    capture(p,'accounting-neutral-login')
def new_pipe_create(p,c,pipe):
    pid,slug,title,first,winning,next_stage,initial,finish=pipe
    go(p,'/crm/'+slug);p.get_by_role('button',name='Novo Lead',exact=True).click();d=p.get_by_role('dialog')
    name='Empresa teste '+pid+' (ficticia)';d.locator('input[name=name]').fill(name);d.locator('input[name=phone]').fill('00000000000')
    before=len(state(p)['leads']);d.get_by_role('button',name='Criar lead',exact=True).click();p.wait_for_timeout(200)
    check(len(state(p)['leads'])==before,'Required dynamic field was not enforced')
    if pid=='demo-opening':d.get_by_role('button',name='Sociedade Limitada',exact=True).click();d.locator('input[name=atividadePrincipal]').fill('Servicos ficticios')
    else:d.locator('input[name=sistemaAnterior]').fill('Sistema ficticio de origem')
    d.locator('input[name=honorarios]').fill('150000');d.locator('input[name=honorarios]').press('Tab')
    good(await_request(p,lambda:d.get_by_role('button',name='Criar lead',exact=True).click(),'POST','/leads'));expect(d).not_to_be_visible()
    created=next(l for l in state(p)['leads'] if l['name']==name);check(created['pipeId']==pid and created['stage']==initial,created)
    check(created['productId'].endswith('opening' if pid=='demo-opening' else 'onboarding'),'Default service missing')
    check(created['value']==1500,{'fees':created['value']})
    go(p,'/lead/'+created['id']);expect(p.get_by_role('heading',name=name,exact=True)).to_be_visible();p.reload();expect(p.get_by_role('heading',name=name,exact=True)).to_be_visible()
    check(lead(p,created['id'])['pipeId']==pid,'Reload lost pipe');capture(p,'created-'+pid)
def new_pipe_lifecycle(p,c,pipe):
    pid,slug,title,first,winning,next_stage,initial,finish=pipe
    original=lead(p);go(p,'/lead/'+first)
    p.get_by_text('Ações do processo',exact=True).click();p.get_by_role('button',name='Avançar para '+next_stage,exact=True).click();confirm(p)
    check(lead(p,first)['stage']==next_stage,'Forward move missing')
    p.get_by_text('Ações do processo',exact=True).click();p.get_by_role('button',name='Retornar para '+initial,exact=True).click();confirm(p)
    p.wait_for_function('([k,id,s])=>JSON.parse(localStorage.getItem(k)).leads.find(l=>l.id===id).stage===s',arg=[KEY,first,initial])
    go(p,'/lead/'+winning);name=lead(p,winning)['name'];p.get_by_text('Ações do processo',exact=True).click();p.get_by_role('button',name=finish,exact=True).click()
    d=p.get_by_role('dialog');d.locator('textarea[name=kanbanObservation]').fill('Conclusao ficticia do processo contabil auditado.');d.get_by_role('button',name='Confirmar conversão',exact=True).click();expect(d).not_to_be_visible()
    p.wait_for_function('([k,id])=>JSON.parse(localStorage.getItem(k)).leads.find(l=>l.id===id).status==="Cliente"',arg=[KEY,winning])
    go(p,'/clientes');p.locator('#clients-list-search').fill(name);p.locator('#clients-list-search').press('Enter');expect(p.get_by_text(name,exact=True).first).to_be_visible()
    go(p,'/cliente/'+winning);p.reload();expect(p.get_by_role('heading',name=name,exact=True)).to_be_visible();check(lead(p,winning)['status']=='Cliente','Completed status lost');check(lead(p)==original,'Other pipeline changed');capture(p,'completed-'+pid)
def new_pipe_followup(p,c,pipe):
    pid,slug,title,first,*_=pipe;go(p,'/lead/'+first)
    p.locator('#lead-contact-notes').fill('Atendimento ficticio para o novo processo '+pid)
    # The established contact form exposes an optional next-contact datetime.
    p.get_by_label(re.compile('Próximo follow-up')).fill(tomorrow().strftime('%Y-%m-%dT%H:%M'))
    good(await_request(p,lambda:p.get_by_role('button',name='Registrar atendimento',exact=True).click(),'PUT','/leads/'+first))
    item=state(p)['appointments'][-1];check(item['leadId']==first,'Follow-up linked to wrong pipeline')
    go(p,'/atividades/agenda');p.locator('#agenda-date-picker').fill(tomorrow().strftime('%Y-%m-%d'));row=p.locator('li:visible').filter(has_text='Atendimento ficticio para o novo processo '+pid);expect(row).to_be_visible();row.get_by_role('button',name=re.compile('Marcar atividade')).click();p.get_by_role('dialog').get_by_role('button',name='Concluir',exact=True).click()
    p.wait_for_function('([k,id])=>JSON.parse(localStorage.getItem(k)).appointments.find(a=>a.id===id).status==="completed"',arg=[KEY,item['id']]);capture(p,'followup-'+pid)
def accounting_migration(p,c):
    go(p,'/lead/'+HERO)
    previous=state(p);retained=[l for l in previous['leads'] if l['pipeId']=='demo-accounting'];retained[0]['company']='Edicao anterior preservada';retained[0]['value']=2345
    old={**previous,'seedVersion':'2026-11-10.1','leads':retained,'labels':[l for l in previous['labels'] if l['pipeId']=='demo-accounting']}
    obsolete={**retained[0],'id':'demo-retired-financial','pipeId':'demo-financial','businessUnit':'FINANCEIRA','labels':[]};old['leads'].append(obsolete)
    p.evaluate('([k,v])=>{localStorage.setItem(k,JSON.stringify(v));localStorage.setItem("teste-crm:preferences:v1",JSON.stringify({bad:"filter"}));localStorage.setItem("unrelated-guard","keep");}',[KEY,old])
    p.reload();expect(p.get_by_role('button',name='Entrar na demonstração')).to_be_visible();p.get_by_role('button',name='Entrar na demonstração').click();expect(p.get_by_role('heading',name='Indicadores',exact=True)).to_be_visible()
    db=state(p);check(db['seedVersion']=='2026-11-10.accounting.2','Migration missing');check(len(db['leads'])==108,'Migration duplicated or lost sample records');check(lead(p)['company']=='Edicao anterior preservada' and lead(p)['value']==2345,'Migration discarded edits')
    check(not any(l['pipeId']=='demo-financial' for l in db['leads']),'Retired rows remain');check(p.evaluate('localStorage.getItem("unrelated-guard")')=='keep','Unrelated storage cleared')
    p.reload();p.wait_for_timeout(300);check(len(state(p)['leads'])==108,'Reload duplicates migration');capture(p,'accounting-migrated-existing-browser')
def accounting_pipe_viewports(p,c):
    for width in [390,768,1366,1920]:
        p.set_viewport_size({'width':width,'height':900})
        for path in ['/crm','/lead/demo-opening-lead-073','/lead/demo-onboarding-lead-091']:
            go(p,path);p.wait_for_function('!document.querySelector("[aria-busy=true]")');p.wait_for_timeout(150)
            layout=p.evaluate('''()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,elements:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+2||r.left< -2)&&!e.closest('nav[aria-label="Progresso no funil"]')}).slice(0,30).map(e=>({tag:e.tagName,class:e.className,text:e.textContent.slice(0,90),rect:e.getBoundingClientRect().toJSON(),parent:e.parentElement?.className}))})''')
            check(layout['scroll']<=width+2,{'path':path,**layout});capture(p,f'accounting-{width}-'+path.replace('/','-'))
        for pipe in NEW_PIPES:
            go(p,'/crm/'+pipe[1]);p.get_by_role('button',name='Novo Lead',exact=True).click();d=p.get_by_role('dialog');expect(d).to_be_visible()
            box=d.bounding_box();check(box['x']>=-2 and box['x']+box['width']<=width+2,{'width':width,'dialog':box})
            capture(p,f'form-{width}-'+pipe[0]);p.keyboard.press('Escape');expect(d).not_to_be_visible()

log=open(OUT/'server.log','w');server=subprocess.Popen(['node','scripts/serve-demo.mjs'],cwd=ROOT,stdout=log,stderr=log)
try:
    for _ in range(100):
        try:urlopen(BASE+'/',timeout=1).read();break
        except Exception:time.sleep(.1)
    with sync_playwright() as pw:
        b=pw.chromium.launch(headless=True, **({'executable_path': os.environ['CHROMIUM_PATH']} if os.environ.get('CHROMIUM_PATH') else {}))
        checks=[('client-comment-real-UI',client_comment),('client-responsible-change',client_owner),('client-clear-optional-email',client_clear_email),('meeting-without-lead',meeting_without_lead),('meeting-with-lead',meeting_with_lead),('followup-requires-lead',followup_requires_lead),('manual-origin-after-creation',manual_origin),('two-stage-actions-and-hot-filter',hot_final),('team-owner-names',team_owners),('labels-assignment-and-filter',labels_ui),('loss-history-and-cancel-followups',loss_ui),('deadline-save-clear-reload',deadline_ui),('quota-recovery-correct-harness',quota),('corrupt-storage-confirmed-reset',corrupt),('storage-denied-recovery',storage_denied),('service-worker-failure-recovery',sw_failure),('external-protocols-blocked',external_protocols),('fixed-lead-lookup-by-id',fixed_lookup),('clients-last-contact-filter',client_contact_filter),('clients-filters-pagination',client_filters_sort),('dashboard-custom-one-period',lambda p,c:dashboard_dates(p,c,'1 período')),('dashboard-custom-two-periods',lambda p,c:dashboard_dates(p,c,'2 períodos')),('accounting-stage-ranking-drilldowns',stage_and_owner_drilldown),('kanban-native-drag-and-return',drag_mouse),('reset-isolated-date-filter-state',reset_wait_login)]
        for op in ['geral','contabilidade']:checks.append(('drilldown-filter-preservation-'+op,lambda p,c,op=op:drilldown(p,c,op)))
        for action in ['Reagendar','Concluir','Não veio','Cancelar']:checks.append(('agenda-'+action,lambda p,c,action=action:agenda_action(p,c,action)))
        for operation in ['geral','contabilidade']:checks.append(('exact-two-period-comparison-'+operation,lambda p,c,operation=operation:precise_comparison(p,c,operation)))
        for operation in ['contabilidade']:checks.append(('custom-one-period-'+operation,lambda p,c,operation=operation:additional_single_range(p,c,operation)))
        checks.append(('date-modal-apply-cancel-validation',date_modal_apply_cancel));checks.extend([('viewport-no-document-overflow',viewport_no_overflow),('standalone-meeting-edit-complete',standalone_meeting_edit_complete)])
        checks.extend([('accounting-brand-and-three-pipes',accounting_brand_and_pipes),('accounting-existing-browser-migration',accounting_migration),('accounting-new-pipe-viewports',accounting_pipe_viewports)])
        for pipe in NEW_PIPES:
            checks.extend([(pipe[0]+'-create-required-form',lambda p,c,pipe=pipe:new_pipe_create(p,c,pipe)),(pipe[0]+'-forward-return-complete',lambda p,c,pipe=pipe:new_pipe_lifecycle(p,c,pipe)),(pipe[0]+'-followup-agenda',lambda p,c,pipe=pipe:new_pipe_followup(p,c,pipe))])
        for name,fn in checks:run(b,name,fn)
        b.close()
finally:
    server.terminate();server.wait(timeout=10);log.close()
    report={'target':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'results':results,'responses':responses,'external_requests':external,'page_errors':errors,'passed':sum(x['status']=='passed' for x in results),'failed':sum(x['status']=='failed' for x in results)}
    (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print('FINAL TOTAL',report['passed'],report['failed'])
if any(x['status']=='failed' for x in results) or errors or external:sys.exit(1)
