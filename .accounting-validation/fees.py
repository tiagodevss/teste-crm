from pathlib import Path
p=Path('demo/model.ts');s=p.read_text()
old='  const next = appointments.find(a => a.status === \'scheduled\');\n  return { ...lead, owner:'
new="""  const next = appointments.find(a => a.status === 'scheduled');
  // Expose a single canonical fee in both the detail form and numeric indicators.
  const feeField = initialFields(getPipe(lead.pipeId)).find(field => field.key === 'honorarios');
  const customFields = (lead.customFields || []).filter(field => field.key !== 'honorarios');
  if (feeField) customFields.push({ key: feeField.key, label: feeField.label, type: 'currency', stage: getPipe(lead.pipeId).steps[0].name, value: lead.value });
  return { ...lead, customFields, owner:"""
assert old in s;s=s.replace(old,new)
old="    lead.customFields = body.customFields.filter"
new="""    const fee = body.customFields.find((field: any) => field.key === 'honorarios');
    if (!('value' in body) && fee?.value != null && String(fee.value).trim() !== '') {
      const amount = Number(fee.value);
      required(Number.isFinite(amount) && amount >= 0, 'Honor\u00e1rios inv\u00e1lidos.');
      lead.value = amount;
    }
    lead.customFields = body.customFields.filter"""
assert old in s;s=s.replace(old,new);p.write_text(s)
p=Path('tests/demo/accounting-only.test.mjs')
p.write_text(p.read_text()+"""
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
""")
p=Path('tests/demo/audit_regression.py');s=p.read_text();old="    capture(p,'accounting-three-pipeline-picker')\n";new="""    for title,slug in [('Contabilidade','contabilidade-demo'),('Abertura de Empresas','abertura-empresas-demo'),('Onboarding Cont\u00e1bil','onboarding-contabil-demo')]:
        p.get_by_role('button').filter(has=p.get_by_role('heading',name=title,exact=True)).click()
        expect(p).to_have_url(re.compile('/crm/'+slug+'(?:\\\\?|$)'))
        expect(p.get_by_role('button',name='Novo Lead',exact=True)).to_be_visible()
        p.get_by_role('link',name='CRM / Funil',exact=True).click()
        expect(p.get_by_role('heading',name='Fluxos de Trabalho',exact=True)).to_be_visible()
    capture(p,'accounting-three-pipeline-picker')
"""
assert old in s;s=s.replace(old,new);p.write_text(s)
print('Canonical fees and in-application switching verified by permanent tests')
