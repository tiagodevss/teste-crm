"""Exercise the packaged demo through real UI and its real MSW service worker."""
import os
import json
import pathlib
import re
import subprocess
import time
import urllib.request
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright, expect

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'demo-test-results'
OUTPUT.mkdir(exist_ok=True)
BASE = 'http://127.0.0.1:4174' + os.environ.get('DEMO_BASE_PATH', '/').rstrip('/')
KEY = 'teste-crm:database:v1'
server = subprocess.Popen(['node', 'scripts/serve-demo.mjs'], cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
errors, requests, failures, external, checks = [], [], [], [], []
try:
    for attempt in range(100):
        try:
            urllib.request.urlopen(BASE, timeout=1)
            break
        except Exception:
            if server.poll() is not None:
                raise RuntimeError(server.stdout.read().decode())
            time.sleep(.1)
    else:
        raise RuntimeError('Demo server did not start')
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, **({'executable_path': os.environ['CHROMIUM_PATH']} if os.environ.get('CHROMIUM_PATH') else {}))
        context = browser.new_context(viewport={'width': 1366, 'height': 768}, timezone_id='America/Sao_Paulo')
        page = context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.on('response', lambda r: requests.append({'status': r.status, 'url': r.url}) if '/__demo_api__/' in r.url or r.status >= 400 else None)
        page.on('request', lambda r: external.append(r.url) if not r.url.startswith(BASE) else None)
        page.on('websocket', lambda ws: external.append(ws.url))
        def capture(name):
            page.screenshot(path=str(OUTPUT / (name + '.png')), full_page=False)
            (OUTPUT / (name + '.txt')).write_text(page.locator('body').inner_text(), encoding='utf-8')
        def state():
            return page.evaluate('(key) => JSON.parse(localStorage.getItem(key))', KEY)
        def hero():
            return next(lead for lead in state()['leads'] if lead['id'] == 'demo-lead-001')
        def login():
            page.get_by_role('button', name='Entrar na demonstração').click()
            expect(page.get_by_role('heading', name='Indicadores', exact=True)).to_be_visible(timeout=15000)
        def go(path):
            page.goto(BASE + '/#' + path)
            page.wait_for_timeout(900)
        try:
            page.goto(BASE + '/#/login')
            expect(page.get_by_role('button', name='Entrar na demonstração')).to_be_visible(timeout=20000)
            capture('login')
            login()
            for route in ['indicadores/geral', 'indicadores/contabilidade', 'indicadores/financeira', 'crm', 'crm/contabilidade-demo', 'crm/financeira-demo', 'lead/demo-lead-001', 'atividades', 'atividades/agenda', 'atividades/equipe', 'clientes', 'cliente/demo-lead-005']:
                go('/' + route)
                capture(route.replace('/', '_'))
                assert not page.get_by_text('Esta tela não pôde ser exibida').count(), route
                assert 'Configuração incompleta' not in page.locator('body').inner_text(), route
            checks.append('12 real module routes, including fresh deep links')

            go('/indicadores/geral')
            page.get_by_text('Leads totais', exact=True).click()
            expect(page.get_by_role('heading', name='Registros do indicador')).to_be_visible()
            assert 'dateField=createdAt' in page.url and 'dateFrom=' in page.url
            capture('indicator-drilldown')
            checks.append('indicator drilldown preserves creation-date cohort')

            go('/lead/demo-lead-001')
            expect(page.get_by_text('Ações do processo', exact=True)).to_be_visible()
            page.get_by_role('button', name='Editar', exact=True).click()
            dialog = page.get_by_role('dialog')
            dialog.locator('input[name="company"]').fill('Aurora - atendimento demonstrativo')
            dialog.get_by_role('button', name='Salvar', exact=True).click()
            expect(dialog).not_to_be_visible()
            page.wait_for_function('(key) => JSON.parse(localStorage.getItem(key)).leads[0].company === "Aurora - atendimento demonstrativo"', arg=KEY)
            page.reload()
            expect(page.get_by_role('heading', name=re.compile('Aurora Com'))).to_be_visible()
            assert hero()['company'] == 'Aurora - atendimento demonstrativo'
            checks.append('edit + persistence after browser reload')

            note = 'Atendimento ficticio validado no roteiro automatizado.'
            page.locator('#lead-contact-notes').fill(note)
            tomorrow = datetime.now(ZoneInfo('America/Sao_Paulo')).date() + timedelta(days=1)
            page.get_by_label(re.compile('Próximo follow-up')).fill(str(tomorrow) + 'T14:00')
            count = len(state()['appointments'])
            page.get_by_role('button', name='Registrar atendimento', exact=True).click()
            page.wait_for_function('([key, count]) => JSON.parse(localStorage.getItem(key)).appointments.length === count + 1', arg=[KEY, count])
            appointment = state()['appointments'][-1]
            assert appointment['leadId'] == 'demo-lead-001'
            capture('contact-recorded')
            go('/atividades/agenda')
            page.locator('#agenda-date-picker').fill(str(tomorrow))
            row = page.locator('li:visible').filter(has_text=note)
            expect(row).to_be_visible()
            row.get_by_role('button', name=re.compile('Marcar atividade.*conclu')).click()
            page.get_by_role('dialog').get_by_role('button', name='Concluir', exact=True).click()
            page.wait_for_function('([key,id]) => JSON.parse(localStorage.getItem(key)).appointments.find(a=>a.id===id).status === "completed"', arg=[KEY, appointment['id']])
            checks.append('contact creates linked follow-up; agenda completes the same activity')

            go('/lead/demo-lead-001')
            page.get_by_text('Ações do processo', exact=True).click()
            page.get_by_role('button', name='Concluir negócio', exact=True).click()
            expect(page.get_by_role('heading', name='Converter em cliente')).to_be_visible()
            page.locator('textarea[name="kanbanObservation"]').fill('Conversao ficticia confirmada durante o roteiro.')
            page.get_by_role('button', name='Confirmar conversão').click()
            page.wait_for_function('(key) => JSON.parse(localStorage.getItem(key)).leads[0].status === "Cliente"', arg=KEY)
            go('/clientes')
            page.locator('#clients-list-search').fill('Aurora')
            page.locator('#clients-list-search').press('Enter')
            expect(page.get_by_text('Aurora Comércio (demonstração)', exact=True).first).to_be_visible()
            capture('converted-client')
            go('/indicadores/contabilidade')
            capture('accounting-after-conversion')
            checks.append('conversion through actual UI -> client list -> refreshed dashboard')

            go('/crm/contabilidade-demo')
            page.get_by_role('button', name='Novo Lead', exact=True).click()
            dialog = page.get_by_role('dialog')
            dialog.locator('input[name="name"]').fill('Empresa Teste de Apresentacao (ficticia)')
            dialog.locator('input[name="phone"]').fill('00000000000')
            dialog.get_by_role('button', name='MEI', exact=True).click()
            page.get_by_role('button', name='Criar lead', exact=True).click()
            page.wait_for_function('(key) => JSON.parse(localStorage.getItem(key)).leads.some(l=>l.name==="Empresa Teste de Apresentacao (ficticia)")', arg=KEY)
            capture('created-opportunity')
            checks.append('create opportunity through the original dynamic form')

            go('/indicadores/geral')
            for width, height in [(1920,1080), (390,844)]:
                page.set_viewport_size({'width':width,'height':height})
                page.wait_for_timeout(400)
                capture(f'dashboard-{width}')
                assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 2'), f'Page overflows viewport {width}'
            checks.append('desktop and mobile dashboard viewport checks')
            page.set_viewport_size({'width':1366,'height':768})
            blocked = page.evaluate('''async () => {
              let count=0;
              try { await fetch('https://example.invalid/api'); } catch { count++; }
              try { new WebSocket('wss://example.invalid/socket'); } catch { count++; }
              if (!navigator.sendBeacon('https://example.invalid/ping','demo')) count++;
              if (!window.open('https://example.invalid/')) count++;
              return count;
            }''')
            assert blocked == 4
            checks.append('fetch, websocket, beacon and external popup blocked before network')
            page.get_by_role('button', name='Restaurar demo', exact=True).click()
            page.get_by_role('button', name='Restaurar cenário', exact=True).click()
            expect(page.get_by_role('button', name='Entrar na demonstração')).to_be_visible(timeout=15000)
            login()
            assert len(state()['leads']) == 108 and hero()['status'] == 'Oportunidade'
            checks.append('reset clears mutations and restores the repeatable scenario')
            go('/configuracoes')
            expect(page.get_by_role('heading', name='Esta área não faz parte da demonstração')).to_be_visible()
            capture('unsupported-route')
            checks.append('out-of-scope route cannot expose operational settings')
        except Exception:
            import traceback
            failures.append(traceback.format_exc() + '\nURL: ' + page.url)
            try: capture('failure')
            except Exception: pass
        finally:
            report = {'checks':checks, 'errors':errors, 'api':requests, 'external':external, 'failures':failures}
            (OUTPUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
            browser.close()
finally:
    server.terminate()
    server.wait(timeout=10)
print(json.dumps({'checks':checks,'errors':errors,'external':external,'failures':failures}, ensure_ascii=True, indent=2))
assert not failures and not errors and not external and not any(r['status'] >= 400 for r in requests), 'Inspect demo-test-results/report.json and screenshots.'
