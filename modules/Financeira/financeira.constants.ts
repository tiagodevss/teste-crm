/** Chaves de campo e nomes de etapa dos funis financeiros (espelham `backend/src/financeira/financeira.constants.ts`). */
export const FIELD_KEYS = {
  primeiroProponente: 'primeiro_proponente_primeiro',
  cpfProponente1: 'cpf_proponente_1o_cpf_prop',
  nascimento1: 'data_de_nascimento_1o_data_de_',
  possuiSegundo: 'possui_segundo_proponente_possui_s',
  segundoProponente: 'segundo_proponente_segundo_',
  cpfProponente2: 'cpf_proponente_ii_cpf_prop',
  nascimento2: 'data_de_nascimento_2o_data_de_',
  celularCliente: 'celular_do_cliente_celular_',
  emailCliente: 'e_mail_cliente_emai_cli',
  localizacao: 'localizacao_do_imovel_localiza',
  agenciaCredito: 'agencia_caixa_vinculo',
  nomeParceiro: 'nome_do_parceiro_nome_do_',
  celularCorretor: 'celular_do_corretor_celular_',
  emailCorretor: 'e_mail_do_corretor_email_do',
  resultadoAvaliacao: 'resultado_da_avaliacao_a_pasta_',
  modalidade: 'modalidade_modalida',
  tarefasSiopi: 'tarefas_tarefas',
} as const;

export const CREDITO_STEPS = {
  AVALIACAO: 'AVALIAÇÃO DE CRÉDITO',
  CONCLUIDO: 'CONCLUÍDO',
} as const;

export const REPASSE_STEPS = {
  ENGENHARIA: 'ENGENHARIA',
  SIOPI: 'SIOPI',
  CONCLUIDO: 'CONCLUÍDO',
  PENDENTE: 'PENDENTE',
  DESISTENCIA: 'DESISTENCIA',
  SUBSIDIOS_LEGADO: 'SOLICITAÇÃO DE SUBSIDIOS',
} as const;

export const MOTIVO_MIN_LENGTH = 5;
export const MOTIVO_MAX_LENGTH = 2000;

/** Etapas de exceção do Repasse: não aparecem como destino de retomada. */
export const REPASSE_EXCEPTION_STEPS: readonly string[] = [
  REPASSE_STEPS.PENDENTE,
  REPASSE_STEPS.DESISTENCIA,
  REPASSE_STEPS.SUBSIDIOS_LEGADO,
];
