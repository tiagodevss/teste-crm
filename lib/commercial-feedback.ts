export const LOSS_CATEGORY_LABELS = {
  proposal: 'Proposta', price: 'Valor', competitor: 'Concorrente',
  timing: 'Momento inadequado', no_interest: 'Sem interesse', other: 'Outro motivo',
} as const;
export type LossCategory = keyof typeof LOSS_CATEGORY_LABELS;
export interface CommercialFeedback {
  responseDeadline: string | null;
  loss: { category: LossCategory | null; description: string | null; lostAt: string; fromStage: string | null; stage: string } | null;
  lossStages: { id: string; name: string }[];
  canEditDeadline: boolean;
  canRegisterLoss: boolean;
}
export interface LeadLossInput { targetStageId: string; category: LossCategory; description: string }
export function prepareLeadLoss(targetStageId: string, category: string, description: string): LeadLossInput {
  if (!targetStageId.trim()) throw new Error('Selecione a etapa de perda.');
  if (!Object.hasOwn(LOSS_CATEGORY_LABELS, category)) throw new Error('Selecione o motivo da recusa.');
  const text = description.trim();
  if (text.length < 10 || text.length > 4000) throw new Error('Descreva o motivo da recusa com 10 a 4.000 caracteres.');
  return { targetStageId, category: category as LossCategory, description: text };
}
/** A deadline is a calendar day, never a UTC instant to display in local time. */
export function prepareResponseDeadline(value: string): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Informe uma data de resposta válida.');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || value < '1900-01-01') {
    throw new Error('Informe uma data de resposta válida.');
  }
  return value;
}
export function formatCalendarDate(value: string): string {
  return value.split('-').reverse().join('/');
}
export function deadlineState(deadline: string | null, now = new Date()): 'none' | 'overdue' | 'today' | 'future' {
  if (!deadline) return 'none';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (type: string) => parts.find(part => part.type === type)?.value;
  const today = `${get('year')}-${get('month')}-${get('day')}`;
  return deadline < today ? 'overdue' : deadline === today ? 'today' : 'future';
}
