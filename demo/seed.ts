import type { Lead, LeadAppointment, LeadLabel, PermissionMatrix, UserProfile, Product } from '../types';
import type { DemoDatabase, DemoPipe, DemoLead } from './types.ts';
import { ACCOUNTING_ID, OPENING_ID, ONBOARDING_ID, ADMIN_ID, DAY_MS, HERO_ID, SCHEMA_VERSION, SEED_VERSION, STATUS } from './types.ts';

const navigation = Object.fromEntries([
  'indicadores', 'crm', 'activities', 'clients', 'acessorias', 'relatorios', 'goals',
  'categories', 'unidades-atendimento', 'products', 'campaigns', 'users', 'profiles', 'hierarchy',
  'cold-leads', 'public-surveys', 'settings',
].map(key => [key, ['indicadores', 'crm', 'activities', 'clients'].includes(key)])) as PermissionMatrix['navigation'];
const permissions: PermissionMatrix = { navigation, actions: {} as PermissionMatrix['actions'] };
export const USERS: UserProfile[] = [
  [ADMIN_ID, 'Apresentador Demo', 'AD'],
  ['demo-ana', 'Ana Demo', 'AN'],
  ['demo-bruno', 'Bruno Demo', 'BR'],
].map(([id, name, avatarInitials], index) => ({
  id, name, avatarInitials, email: `${id}@example.invalid`, active: true,
  role: index === 0 ? 'ADMIN' : 'OPERADOR', roleLabel: index === 0 ? 'Administrador demonstrativo' : 'Consultor fict\u00edcio',
  profile: { id: `profile-${id}`, name: 'Demonstra\u00e7\u00e3o', code: index === 0 ? 'ADMIN' : 'OPERADOR', isStaff: true, isAdmin: index === 0 },
  permissions,
}));

function buildPipe(id: string, name: string, unitType: DemoPipe['unitType'], stages: string[], slug: string): DemoPipe {
  const steps: DemoPipe['steps'] = stages.map((stage, index) => ({
    id: `${id}-step-${index}`, name: stage, positionX: index * 280, positionY: index === 5 ? 160 : 0,
    stageKind: index === 4 ? 'win' : index === 5 ? 'loss' : 'default', sortOrder: index,
    allowReturnAction: index > 0, isActive: true, fields: [], fromActions: [], toActions: [],
  }));
  const actions: DemoPipe['actions'] = [];
  for (let index = 0; index < 4; index++) {
    actions.push({ id: `${id}-next-${index}`, fromStepId: steps[index].id, toStepId: steps[index + 1].id, label: index === 3 ? (id === ACCOUNTING_ID ? 'Concluir neg\u00f3cio' : id === OPENING_ID ? 'Concluir abertura' : 'Concluir onboarding') : `Avan\u00e7ar para ${stages[index + 1]}`, kind: 'manual', autoExecute: false });
    actions.push({ id: `${id}-loss-${index}`, fromStepId: steps[index].id, toStepId: steps[5].id, label: 'Registrar perda', kind: 'manual', autoExecute: false });
  }
  for (let index = 1; index <= 4; index++) actions.push({ id: `${id}-return-${index}`, fromStepId: steps[index].id, toStepId: steps[index - 1].id, label: `Retornar para ${stages[index - 1]}`, kind: 'return', autoExecute: false });
  for (const step of steps) {
    step.fromActions = actions.filter(a => a.fromStepId === step.id).map(a => ({ ...a, toStep: { id: a.toStepId, name: steps.find(s => s.id === a.toStepId)!.name } }));
    step.toActions = actions.filter(a => a.toStepId === step.id).map(a => ({ ...a, fromStep: { id: a.fromStepId, name: steps.find(s => s.id === a.fromStepId)!.name } }));
  }
  const pipe: DemoPipe = {
    id, name, slug, unitType, sortOrder: id === ACCOUNTING_ID ? 0 : id === OPENING_ID ? 1 : 2,
    description: id === ACCOUNTING_ID ? 'Prospecção, proposta e contratação de assessoria contábil.' : id === OPENING_ID ? 'Da viabilidade ao registro: acompanhe cada abertura de empresa.' : 'Documentos, configuração e integração dos novos clientes.',
    icon: id === ACCOUNTING_ID ? 'Building' : id === OPENING_ID ? 'Briefcase' : 'Users', createClientOnFinalStage: true,
    steps, actions,
    fields: id === ACCOUNTING_ID ? [
      { id: `${id}-regime`, key: 'regimeTributario', label: 'Regime tribut\u00e1rio', type: 'select', required: true, options: JSON.stringify(['Simples Nacional', 'Lucro Presumido', 'Lucro Real', 'MEI']), sortOrder: 0, isActive: true },
      { id: `${id}-faturamento`, key: 'faturamentoMedioMensal', label: 'Faturamento mensal estimado', type: 'currency', required: false, sortOrder: 1, isActive: true },
    ] : id === OPENING_ID ? [
      { id: `${id}-natureza`, key: 'naturezaJuridica', label: 'Natureza jurídica', type: 'select', required: true, options: JSON.stringify(['Sociedade Limitada', 'Empresário Individual', 'MEI']), sortOrder: 0, isActive: true },
      { id: `${id}-atividade`, key: 'atividadePrincipal', label: 'Atividade principal', type: 'text', required: false, sortOrder: 1, isActive: true },
    ] : [
      { id: `${id}-sistema`, key: 'sistemaAnterior', label: 'Sistema contábil anterior', type: 'text', required: true, sortOrder: 0, isActive: true },
      { id: `${id}-competencia`, key: 'competenciaInicial', label: 'Início do atendimento', type: 'date', required: false, sortOrder: 1, isActive: true },
    ],
  };
  pipe.fields!.push({ id: `${id}-honorarios`, key: 'honorarios', label: 'Honorários contratados', type: 'currency', required: false, sortOrder: 2, isActive: true });
  pipe.steps[0].fields = pipe.fields;
  pipe.fields = [];
  return pipe;
}
export const PIPES: DemoPipe[] = [
  buildPipe(ACCOUNTING_ID, 'Contabilidade', 'CONTABILIDADE' as DemoPipe['unitType'], ['Lead recebido', 'Diagn\u00f3stico', 'Proposta enviada', 'Follow-up', 'Ganho (Ativo)', 'Perdido'], 'contabilidade-demo'),
  buildPipe(OPENING_ID, 'Abertura de Empresas', 'CONTABILIDADE' as DemoPipe['unitType'], ['Solicitação recebida', 'Viabilidade', 'Documentação', 'Registro e inscrições', 'Empresa aberta', 'Cancelado'], 'abertura-empresas-demo'),
  buildPipe(ONBOARDING_ID, 'Onboarding Contábil', 'CONTABILIDADE' as DemoPipe['unitType'], ['Boas-vindas', 'Coleta de documentos', 'Configuração contábil', 'Validação inicial', 'Onboarding concluído', 'Cancelado'], 'onboarding-contabil-demo'),
];
export const PRODUCTS: Product[] = [
  { id: 'demo-product-accounting', name: 'Assessoria cont\u00e1bil (demo)', groupId: 'demo-group', price: 1800, pipeId: ACCOUNTING_ID, businessUnit: 'CONTABILIDADE', leadFormFields: [], pipelineSteps: [] },
  { id: 'demo-product-opening', name: 'Abertura de empresa (demo)', groupId: 'demo-group', price: 1200, pipeId: OPENING_ID, businessUnit: 'CONTABILIDADE', leadFormFields: [], pipelineSteps: [] },
  { id: 'demo-product-onboarding', name: 'Implantação contábil (demo)', groupId: 'demo-group', price: 600, pipeId: ONBOARDING_ID, businessUnit: 'CONTABILIDADE', leadFormFields: [], pipelineSteps: [] },
];
export const PARTNERS = [
  { id: 'demo-partner-1', name: 'Parceiro Horizonte (fict\u00edcio)', responsibleName: 'Equipe Demo', email: 'parceiro@example.invalid', phone: '00000000000', active: true, role: 'IMOBILIARIA' },
  { id: 'demo-partner-2', name: 'Parceiro Caminho (fict\u00edcio)', responsibleName: 'Equipe Demo', email: 'caminho@example.invalid', phone: '00000000000', active: true, role: 'IMOBILIARIA' },
];
export function saoPauloDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
function syntheticCpf(index: number): string {
  const base = `900${String(index).padStart(6, '0')}`.split('').map(Number);
  for (const size of [10, 11]) { const sum = base.reduce((total, digit, position) => total + digit * (size - position), 0); const digit = (sum * 10) % 11; base.push(digit === 10 ? 0 : digit); }
  return base.join('');
}

export function createSeed(reference = new Date()): DemoDatabase {
  const day = saoPauloDate(reference);
  const anchor = new Date(`${day}T09:00:00-03:00`).getTime();
  const eventBase = Math.min(anchor, reference.getTime() - 60000);
  const ago = (days: number) => new Date(eventBase - days * DAY_MS).toISOString();
  const labels: LeadLabel[] = PIPES.flatMap(pipe => [
    { id: `${pipe.id}-label-hot`, pipeId: pipe.id, name: 'Prioridade', color: '#b45309', sortOrder: 0, isActive: true },
    { id: `${pipe.id}-label-referral`, pipeId: pipe.id, name: 'Indica\u00e7\u00e3o', color: '#0369a1', sortOrder: 1, isActive: true },
  ]);
  const nouns = ['Aurora', 'Horizonte', 'Ip\u00ea', 'Lume', 'Cedro', 'Ponte', 'Norte', 'Farol', 'Prisma', 'Vale', 'Rumo', 'Trilha'];
  const leads: DemoLead[] = Array.from({ length: 108 }, (_, index) => {
    const pipeIndex = index < 72 ? 0 : index < 90 ? 1 : 2;
    const pipe = PIPES[pipeIndex];
    const position = index === 0 ? 3 : index % 6;
    const age = index === 0 ? 2 : (index * 7) % 175 + 1;
    const owner = USERS[(Math.floor(index / 6) + index) % USERS.length];
    const value = pipe.id === ACCOUNTING_ID ? 900 + (index % 8) * 300 : pipe.id === OPENING_ID ? 900 + (index % 6) * 150 : 300 + (index % 6) * 100;
    const status = position === 4 ? STATUS.won : position === 5 ? STATUS.lost : position === 0 ? STATUS.lead : STATUS.opportunity;
    const id = pipeIndex === 0 ? `demo-lead-${String(index + 1).padStart(3, '0')}` : `${pipe.id}-lead-${String(index + 1).padStart(3, '0')}`;
    return {
      id, name: index === 0 ? 'Aurora Com\u00e9rcio (demonstra\u00e7\u00e3o)' : `Empresa ${nouns[index % nouns.length]} ${String(index + 1).padStart(3, '0')} (fict\u00edcia)`,
      company: `Empresa demonstrativa ${index + 1}`, pipeId: pipe.id, businessUnit: pipe.unitType,
      stage: pipe.steps[position].name, status: status as Lead['status'], value,
      productId: PRODUCTS[pipeIndex].id, productName: PRODUCTS[pipeIndex].name,
      ownerUserId: owner.id, responsibleUserId: owner.id, createdAt: ago(age), updatedAt: ago(Math.min(age, 2)),
      lastContactDate: ago(Math.min(age, index % 9)), enteredStageAt: ago(Math.min(age, index % 10)),
      closedAt: position >= 4 ? ago(Math.max(0, age - 7)) : undefined,
      demoRevenue: status === STATUS.won ? value : 0,
      email: `empresa${index + 1}@example.invalid`, phone: '00000000000', cpfCnpj: syntheticCpf(index + 1),
      address: 'Rua Exemplo, 100 - Endere\u00e7o fict\u00edcio', city: 'Cidade Exemplo', ramo: 'Servi\u00e7os demonstrativos',
      partnerId: index % 4 === 0 ? PARTNERS[Math.floor(index / 4) % PARTNERS.length].id : undefined,
      origin: index % 4 === 0 ? 'partner' : 'manual', sourceType: 'manual', sourceSubtype: 'demonstracao',
      labels: index % 3 === 0 ? [labels.find(label => label.pipeId === pipe.id)!] : [],
      customFields: pipe.id === ACCOUNTING_ID ? [
        { key: 'regimeTributario', label: 'Regime tribut\u00e1rio', type: 'select', stage: pipe.steps[0].name, value: 'Simples Nacional' },
        { key: 'faturamentoMedioMensal', label: 'Faturamento mensal estimado', type: 'currency', stage: pipe.steps[0].name, value: 65000 + index * 1000 },
      ] : pipe.id === OPENING_ID ? [
        { key: 'naturezaJuridica', label: 'Natureza jurídica', type: 'select', stage: pipe.steps[0].name, value: 'Sociedade Limitada' },
        { key: 'atividadePrincipal', label: 'Atividade principal', type: 'text', stage: pipe.steps[0].name, value: 'Comércio e serviços (fictício)' },
      ] : [
        { key: 'sistemaAnterior', label: 'Sistema contábil anterior', type: 'text', stage: pipe.steps[0].name, value: 'Sistema Exemplo (fictício)' },
        { key: 'competenciaInicial', label: 'Início do atendimento', type: 'date', stage: pipe.steps[0].name, value: day },
      ],
      timeline: [{ id: `${id}-created`, type: 'created', description: 'Cadastro fict\u00edcio criado para demonstra\u00e7\u00e3o.', date: ago(age), userId: owner.id, userName: owner.name, source: 'system' }],
      comments: index === 0 ? [{ id: 'demo-comment-1', text: 'Cen\u00e1rio do roteiro: apresentar proposta, registrar retorno e concluir o atendimento. Nenhum contato real ser\u00e1 realizado.', date: ago(1), userId: ADMIN_ID, userName: USERS[0].name, userInitials: 'AD' }] : [],
      stageHistory: pipe.steps.slice(0, position + 1).filter(step => position === 5 ? step.sortOrder === 0 || step.sortOrder === 5 : true).map((step, stageIndex) => ({ id: `${id}-history-${stageIndex}`, stageName: step.name, enteredAt: ago(Math.max(0, age - stageIndex)), exitedAt: step.name === pipe.steps[position].name ? undefined : ago(Math.max(0, age - stageIndex - 1)), slaStatus: 'on_time' })),
    };
  });
  const appointments: LeadAppointment[] = Array.from({ length: 12 }, (_, index) => {
    const lead = leads[index * 3];
    const scheduledAt = new Date(anchor + ((index % 5) - 1) * DAY_MS + (index % 6) * 3600000).toISOString();
    return { id: `demo-appointment-${index + 1}`, leadId: lead.id, ownerUserId: lead.ownerUserId!, type: 'follow_up', channel: 'phone', scheduledAt, status: index === 11 ? 'completed' : 'scheduled', notes: 'Retorno demonstrativo, sem contato externo.', createdBy: ADMIN_ID, createdAt: ago(3), updatedAt: ago(1) };
  });
  return { schemaVersion: SCHEMA_VERSION, seedVersion: SEED_VERSION, referenceDate: new Date(anchor).toISOString(), revision: 0, sequence: 200, leads, appointments, labels, notifications: [{ id: 'demo-notification-1', title: 'Seu roteiro est\u00e1 preparado', message: 'Abra a oportunidade Aurora para iniciar a demonstra\u00e7\u00e3o.', read: false, createdAt: ago(0), link: `/lead/${HERO_ID}` }] };
}
