from pathlib import Path
import re

def replace(path, old, new):
    p=Path(path);s=p.read_text();assert old in s,(path,old[:80]);p.write_text(s.replace(old,new))

replace('modules/Indicadores/components/GeneralDashboard.tsx',"(name.includes('Receita') ? formatValueCurrency(value, name)","((name.includes('Receita') || name.includes('Honor\u00e1rios')) ? formatValueCurrency(value, name)")
replace('modules/Indicadores/components/GeneralDashboard.tsx','Receita consolidada e volume de SLAs vencidos para leitura r\u00e1pida de desempenho e risco.','Honor\u00e1rios contratados e volume de SLAs vencidos. Servi\u00e7os pontuais n\u00e3o s\u00e3o receita recorrente.')
replace('demo/storage.ts','...value, seedVersion: SEED_VERSION, revision: value.revision + 1,','...value, seedVersion: SEED_VERSION, referenceDate: seed.referenceDate, revision: value.revision + 1,')
replace('demo/DemoApp.tsx','<Route path="/crm" element={<CRM />} />','<Route path="/crm/financeira-demo" element={<Navigate to="/crm" replace />} />\n        <Route path="/crm" element={<CRM />} />')
p=Path('modules/CRM/components/CRMPipeGrid.tsx');s=p.read_text()
s=s.replace('Plus, Settings, Kanban, Target, ArrowRight','Kanban, Target, ArrowRight')
s=re.sub(r'\n                <div className="flex gap-3">.*?</div>\n            </header>', '\n            </header>',s,flags=re.S)
s=re.sub(r'\n                    <button\n                        onClick=\{onNavigateToCreatePipe\}.*?</button>', '',s,flags=re.S)
s=re.sub(r'\n                                <button\n                                    type="button"\n                                    onClick=\{\(\) => onNavigateToPipeSettings\(pipe.id\)\}.*?</button>', '',s,flags=re.S)
s=s.replace('Nenhum funil encontrado','Nenhuma esteira encontrada').replace('Comece criando seu primeiro funil de vendas para organizar seus processos comerciais e aumentar suas vendas.','Use Restaurar demo para recuperar as tr\u00eas esteiras de exemplo.')
s=s.replace('min-w-0 flex-1 pr-10','min-w-0 flex-1 pr-3');p.write_text(s)
replace('tests/demo/audit_regression.py',"p.get_by_role('button',name='Retornar para '+initial,exact=True).click()", "p.get_by_role('button',name='Retornar para '+initial,exact=True).click();confirm(p)")
replace('tests/demo/audit_regression.py',"p.reload();expect(p.get_by_text(name,exact=True).first).to_be_visible();check(lead(p)==original,'Other pipeline changed');capture(p,'completed-'+pid)","go(p,'/cliente/'+winning);p.reload();expect(p.get_by_role('heading',name=name,exact=True)).to_be_visible();check(lead(p,winning)['status']=='Cliente','Completed status lost');check(lead(p)==original,'Other pipeline changed');capture(p,'completed-'+pid)")
replace('tests/demo/audit_regression.py',"go(p,path);check(p.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),{'width':width,'path':path});capture(p,f'accounting-{width}-'+path.replace('/','-'))", "go(p,path);p.wait_for_function('!document.querySelector(\"[aria-busy=true]\")');p.wait_for_timeout(150)\n            layout=p.evaluate('''()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,elements:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+2||r.left< -2)&&!e.closest('nav[aria-label=\"Progresso no funil\"]')}).slice(0,30).map(e=>({tag:e.tagName,class:e.className,text:e.textContent.slice(0,90),rect:e.getBoundingClientRect().toJSON(),parent:e.parentElement?.className}))})''')\n            check(layout['scroll']<=width+2,{'path':path,**layout});capture(p,f'accounting-{width}-'+path.replace('/','-'))")
replace('tests/demo/audit_regression.py',"capture(p,'accounting-three-pipeline-picker')", "expect(p.get_by_role('button',name='Criar novo funil',exact=True)).to_have_count(0)\n    go(p,'/crm/financeira-demo');expect(p.get_by_role('heading',name='Fluxos de Trabalho',exact=True)).to_be_visible()\n    capture(p,'accounting-three-pipeline-picker')")
print('Applied final display and browser harness refinements')
