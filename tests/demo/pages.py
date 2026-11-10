"""Verify strict GitHub Pages hosting, MSW scope, hash deep links and network isolation."""
import os,json,subprocess,time
from pathlib import Path
from urllib.request import urlopen
from urllib.error import HTTPError
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'audit-results'/'pages';OUT.mkdir(parents=True,exist_ok=True)
BASE='http://127.0.0.1:4174'+os.environ.get('DEMO_BASE_PATH','/teste-crm/').rstrip('/')+'/'
errors=[];external=[];responses=[];checks=[]
server=subprocess.Popen(['node','scripts/serve-demo.mjs'],cwd=ROOT,env={**os.environ,'DEMO_BASE_PATH':urlsplit(BASE).path},stdout=subprocess.DEVNULL)
try:
    for _ in range(100):
        try:urlopen(BASE,timeout=1).read();break
        except Exception:time.sleep(.1)
    try:urlopen(BASE+'lead/demo-lead-001')
    except HTTPError as e:assert e.code==404
    else:raise AssertionError('Test host must not provide a hidden SPA fallback')
    checks.append('strict static host has no SPA fallback')
    with sync_playwright() as pw:
        b=pw.chromium.launch(headless=True,**({'executable_path':os.environ['CHROMIUM_PATH']} if os.environ.get('CHROMIUM_PATH') else {}))
        c=b.new_context(timezone_id='America/Sao_Paulo');p=c.new_page()
        p.on('pageerror',lambda e:errors.append(str(e)))
        c.on('request',lambda r:external.append(r.url) if r.url.startswith(('http:','https:','ws:','wss:')) and not r.url.startswith(BASE) else None)
        p.on('response',lambda r:responses.append({'url':r.url,'status':r.status}))
        p.goto(BASE+'#/lead/demo-lead-001')
        p.get_by_role('button',name='Entrar na demonstração').click();expect(p.locator('.demo-toolbar')).to_be_visible()
        scope=p.evaluate("async()=>{const r=await navigator.serviceWorker.ready;return {scope:r.scope,worker:r.active.scriptURL,controller:navigator.serviceWorker.controller?.scriptURL};}")
        assert scope['scope']==BASE,scope
        assert scope['worker']==BASE+'mockServiceWorker.js',scope
        assert scope['controller']==scope['worker'],scope
        checks.append('MSW controller and scope remain inside project path')
        for route in ['/indicadores/financeira','/lead/demo-lead-001','/cliente/demo-lead-005','/atividades/agenda']:
            p.goto(BASE+'#'+route);expect(p.locator('.demo-toolbar')).to_be_visible();p.reload();expect(p.locator('.demo-toolbar')).to_be_visible()
            assert urlsplit(p.url).path==urlsplit(BASE).path,p.url
            assert not p.get_by_text('Esta tela não pôde ser exibida').count()
        checks.append('nested hash routes reload under the hosting prefix')
        blocked=p.evaluate("async()=>{let n=0;for(const url of ['/__demo_api__/v1/leads','/v1/leads','/other-repository/api','https://example.invalid/api']){try{await fetch(url)}catch{n++}}return n}")
        assert blocked==4,blocked;checks.append('root APIs, sibling projects and external requests blocked')
        p.get_by_role('button',name='Restaurar demo',exact=True).click();p.get_by_role('button',name='Restaurar cenário',exact=True).click()
        expect(p.get_by_role('button',name='Entrar na demonstração')).to_be_visible(timeout=15000)
        assert p.url==BASE+'#/login',p.url
        checks.append('reset returns to prefixed login rather than account root')
        p.screenshot(path=str(OUT/'login-pages.png'),full_page=True)
        assert not errors,errors
        assert not external,external
        assert not [r for r in responses if r['status']>=400],responses
        checks.append('no failed assets, external network traffic or uncaught JavaScript errors')
        b.close()
finally:
    server.terminate();server.wait(timeout=10)
    (OUT/'report.json').write_text(json.dumps({'checks':checks,'page_errors':errors,'external_requests':external,'responses':responses},ensure_ascii=False,indent=2))
print(json.dumps({'passed':len(checks),'checks':checks},ensure_ascii=False))
