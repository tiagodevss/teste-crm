export type PipeConfigTabId = 'info' | 'stages' | 'fields' | 'automations' | 'labels' | 'pdf';

export const PIPE_CONFIG_TAB_LABELS: Record<PipeConfigTabId, string> = {
  info: 'Identidade',
  stages: 'Etapas',
  fields: 'Campos',
  automations: 'Automações',
  labels: 'Etiquetas',
  pdf: 'PDF',
};

export const PIPE_CONFIG_TAB_SHORT: Record<PipeConfigTabId, string> = {
  info: 'Pipe',
  stages: 'Fluxo',
  fields: 'Formulário',
  automations: 'Regras',
  labels: 'Tags',
  pdf: 'Documentos',
};

export type PipeConfigTabMeta = {
  title: string;
  subtitle: string;
};

export const PIPE_CONFIG_TAB_META: Record<PipeConfigTabId, PipeConfigTabMeta> = {
  info: {
    title: 'Identidade do funil',
    subtitle: 'Nome, unidade, descrição e ícone exibidos na seleção de funis do CRM.',
  },
  stages: {
    title: 'Etapas e transições',
    subtitle: 'Organize o fluxo comercial. Clique em um card para configurar SLA, permissões e campos da etapa.',
  },
  fields: {
    title: 'Campos globais',
    subtitle: 'Dados coletados em todo o funil. Campos exigidos só em uma etapa são definidos ao abrir o card na aba Etapas.',
  },
  automations: {
    title: 'Automações',
    subtitle: 'Gatilhos e ações executadas automaticamente quando eventos ocorrem neste funil.',
  },
  labels: {
    title: 'Etiquetas',
    subtitle: 'Classifique leads e defina etiquetas aplicadas automaticamente ao entrar em cada etapa.',
  },
  pdf: {
    title: 'Modelos de PDF',
    subtitle: 'Monte documentos reutilizáveis com texto fixo e campos do lead. Modelos ativos ficam disponíveis para download direto no card.',
  },
};

/** @deprecated Use PIPE_CONFIG_TAB_META[tab].subtitle */
export const PIPE_CONFIG_TAB_HELP: Record<PipeConfigTabId, string> = {
  info: PIPE_CONFIG_TAB_META.info.subtitle,
  stages: PIPE_CONFIG_TAB_META.stages.subtitle,
  fields: PIPE_CONFIG_TAB_META.fields.subtitle,
  automations: PIPE_CONFIG_TAB_META.automations.subtitle,
  labels: PIPE_CONFIG_TAB_META.labels.subtitle,
  pdf: PIPE_CONFIG_TAB_META.pdf.subtitle,
};

/** EP1.1 - sequência padrão da esteira comercial (contabilidade). */
export const COMMERCIAL_FLOW_STAGE_SEQUENCE = [
  'Entrada',
  'Qualificacao',
  'Pesquisa/Diagnostico',
  'Contato Realizado',
  'Reuniao/Visita Agendada',
  'Proposta',
  'Negociacao',
  'Aceite',
  'Financeiro',
  'Legalizacao',
  'Conclusao (Ganho)',
  'Conclusao (Perda)',
] as const;

export const COMMERCIAL_FLOW_REQUIRED_FIELDS_BY_STAGE: Record<string, readonly string[]> = {
  Entrada: ['nomeRazaoSocial', 'cpfCnpj', 'telefoneWhatsapp', 'origemLead', 'servicoInteresse'],
  Qualificacao: ['tipoOrganizacao', 'perfilEmpresa', 'regimeTributario', 'faturamentoMedioMensal', 'numeroFuncionarios', 'urgenciaContratacao'],
  'Pesquisa/Diagnostico': ['dorPrincipal', 'objetivosCliente', 'maturidadeProcessos'],
  'Contato Realizado': ['canalContato', 'responsavelContato', 'resumoContato', 'dataUltimoContato'],
  'Reuniao/Visita Agendada': ['dataReuniao', 'tipoReuniao', 'participantesCliente', 'escopoPreliminar'],
  Proposta: ['propostaCodigo', 'propostaTabelaPreco', 'segmentoEmpresa', 'faixaFaturamento', 'propostaServicosInclusos', 'propostaDataEnvio'],
  Negociacao: ['negociacaoResponsavel', 'negociacaoPendencias', 'negociacaoPrevisaoFechamento'],
  Aceite: ['aceiteData', 'aceiteResponsavel', 'aceiteCanal'],
  Financeiro: ['financeiroFormaPagamento', 'financeiroVencimento', 'financeiroStatusCobranca'],
  Legalizacao: ['legalizacaoTipoProcesso', 'legalizacaoNumeroProtocolo', 'legalizacaoStatus'],
  'Conclusao (Ganho)': ['dataConclusao', 'motivoGanho'],
  'Conclusao (Perda)': ['dataConclusao', 'motivoPerda'],
};
