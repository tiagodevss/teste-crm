import type { Lead } from '../types';

export type RepasseTransitionKind = 'pendencia' | 'desistencia' | 'retomar' | 'siopi';

// Nomes persistidos em Lead.stage (espelham modules/Financeira/financeira.constants.ts).
const PENDENTE = 'PENDENTE';
const DESISTENCIA = 'DESISTENCIA';
const EXCEPTION_STEPS: readonly string[] = [PENDENTE, DESISTENCIA, 'SOLICITAÇÃO DE SUBSIDIOS'];

/**
 * Classifica o movimento de um card do Repasse para a etapa `targetStage`.
 * Pendência, Desistência, retomada e "Concluir SIOPI e avançar" têm serviços de domínio próprios
 * (não passam pelo PUT genérico). `null` = movimento ordinário.
 * Só considera transições que o backend realmente liberou em `availableTransitions`.
 */
export function classifyRepasseTransition(lead: Lead, targetStage: string): RepasseTransitionKind | null {
  const transition = lead.availableTransitions?.find((item) => item.stageName === targetStage);
  if (!transition) return null;
  if (targetStage === PENDENTE) return lead.stage === DESISTENCIA ? 'retomar' : 'pendencia';
  if (targetStage === DESISTENCIA) return 'desistencia';
  const fromException = lead.stage === PENDENTE || lead.stage === DESISTENCIA;
  if (fromException && !EXCEPTION_STEPS.includes(targetStage)) return 'retomar';
  if (transition.kind === 'siopi_route') return 'siopi';
  return null;
}
