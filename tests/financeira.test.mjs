import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidCpf, maskCpf } from '../utils/cpf.ts';
import { classifyRepasseTransition } from '../lib/financeira-transitions.ts';
import { buildFinanceiraTransitionFields } from '../lib/financeira-stage-fields.ts';
import { buildStageTransitionFields } from '../lib/stage-transition-fields.ts';
import { parseActiveApiFields, parseInactiveApiFields } from '../lib/pipe-field-parser.ts';
import { getPrivateUploadId } from '../lib/private-upload-id.ts';

const transition = (stageName, kind = 'manual') => ({
  id: stageName,
  toStepId: stageName,
  stageName,
  actionLabel: stageName,
  kind,
  autoExecute: false,
});

test('CPF: valida dígitos verificadores e aplica máscara', () => {
  assert.equal(isValidCpf('529.982.247-25'), true);
  assert.equal(isValidCpf('111.111.111-11'), false);
  assert.equal(isValidCpf('123'), false);
  assert.equal(maskCpf('52998224725'), '529.982.247-25');
});

test('Repasse: Pendência e Desistência usam serviços próprios; SIOPI é rota automática', () => {
  const lead = {
    stage: 'ENGENHARIA',
    availableTransitions: [transition('DÉBITO DO FGTS'), transition('PENDENTE', 'financeira_exception'), transition('DESISTENCIA', 'financeira_exception')],
  };
  assert.equal(classifyRepasseTransition(lead, 'DÉBITO DO FGTS'), null);
  assert.equal(classifyRepasseTransition(lead, 'PENDENTE'), 'pendencia');
  assert.equal(classifyRepasseTransition(lead, 'DESISTENCIA'), 'desistencia');

  const siopi = { stage: 'SIOPI', availableTransitions: [transition('RESERVA ORÇAMENTARIA', 'siopi_route')] };
  assert.equal(classifyRepasseTransition(siopi, 'RESERVA ORÇAMENTARIA'), 'siopi');
});

test('Repasse: card em Pendente/Desistência é retomado para etapa operacional', () => {
  const pendente = {
    stage: 'PENDENTE',
    availableTransitions: [transition('SIOPI', 'financeira_exception'), transition('DESISTENCIA', 'financeira_exception')],
  };
  assert.equal(classifyRepasseTransition(pendente, 'SIOPI'), 'retomar');
  assert.equal(classifyRepasseTransition(pendente, 'DESISTENCIA'), 'desistencia');

  const desistente = { stage: 'DESISTENCIA', availableTransitions: [transition('PENDENTE', 'financeira_exception')] };
  assert.equal(classifyRepasseTransition(desistente, 'PENDENTE'), 'retomar');
});

test('Repasse: destino não liberado pelo backend nunca é classificado', () => {
  assert.equal(classifyRepasseTransition({ stage: 'SIOPI', availableTransitions: [] }, 'PENDENTE'), null);
  assert.equal(classifyRepasseTransition({ stage: 'SIOPI' }, 'SICTD'), null);
});

test('transição financeira: obrigatórios de saída da origem + campos de entrada do destino', () => {
  const source = [
    { key: 'doc', label: 'Documento', type: 'attachment', required: false, requiredOnExit: true, validationTiming: 'exit' },
    { key: 'obs', label: 'Observação', type: 'textarea', required: false },
  ];
  const target = [
    { key: 'registro', label: 'Registro', type: 'select', required: true },
    { key: 'saida_destino', label: 'Saída do destino', type: 'text', required: true, validationTiming: 'exit' },
  ];
  const { fields, sourceKeys } = buildFinanceiraTransitionFields(source, target);
  assert.deepEqual(fields.map((f) => f.key), ['doc', 'obs', 'registro']);
  assert.equal(fields[0].required, true);
  assert.equal(fields[0].validationTiming, 'entry');
  assert.deepEqual([...sourceKeys].sort(), ['doc', 'obs']);
});

test('transição padrão: exibe e persiste somente exigências de saída da origem', () => {
  const source = [
    { key: 'nota', label: 'Nota', type: 'textarea', required: false },
    { key: 'documento', label: 'Documento', type: 'attachment', required: false, requiredOnExit: true, validationTiming: 'exit' },
  ];
  const target = [
    { key: 'aprovacao', label: 'Aprovação', type: 'select', required: true },
    { key: 'proxima_saida', label: 'Próxima saída', type: 'text', required: true, validationTiming: 'exit' },
  ];
  const { fields, sourceKeys } = buildStageTransitionFields(source, target);
  assert.deepEqual(fields.map((field) => field.key), ['documento', 'aprovacao']);
  assert.equal(fields[0].required, true);
  assert.equal(fields[0].validationTiming, 'entry');
  assert.deepEqual([...sourceKeys], ['documento']);
});

test('parser de campos: metadata (widget, timing, checklist) e campos aposentados', () => {
  const api = [
    {
      key: 'tarefas_tarefas',
      label: 'Tarefas',
      type: 'multi_select',
      options: JSON.stringify(['A', 'B']),
      metadata: JSON.stringify({ uiConfig: { widget: 'checklist', showProgress: true }, validationTiming: 'exit', requireAllOptions: true }),
    },
    { key: 'antigo', label: 'Antigo', type: 'text', isActive: false },
  ];
  const [active] = parseActiveApiFields(api);
  assert.equal(parseActiveApiFields(api).length, 1);
  assert.equal(active.uiConfig.widget, 'checklist');
  assert.equal(active.validationTiming, 'exit');
  assert.equal(active.requireAllOptions, true);
  assert.deepEqual(active.options, ['A', 'B']);
  assert.deepEqual(parseInactiveApiFields(api).map((f) => f.key), ['antigo']);
});

test('anexo privado: extrai o id do upload da URL de conteúdo autenticada', () => {
  assert.equal(getPrivateUploadId('/v1/financeira/uploads/abc-123/conteudo'), 'abc-123');
  assert.equal(getPrivateUploadId('https://api.exemplo.com/v1/uploads/files/2026/arquivo.pdf'), null);
  assert.equal(getPrivateUploadId(undefined), null);
});
