import type { Pipe, PipeUnitType } from '../types';

export function getPipeUnitType(
  pipeId: string | undefined,
  pipes: Pipe[],
): PipeUnitType | undefined {
  if (!pipeId) return undefined;
  return pipes.find((pipe) => pipe.id === pipeId)?.unitType;
}

export function isFinanceUnitPipe(
  pipeId: string | undefined,
  pipes: Pipe[],
): boolean {
  return getPipeUnitType(pipeId, pipes) === 'FINANCEIRA';
}

export function isAccountingUnitPipe(
  pipeId: string | undefined,
  pipes: Pipe[],
): boolean {
  return getPipeUnitType(pipeId, pipes) === 'CONTABILIDADE';
}

/** Azul = financeiro, verde = contabilidade (padrão visual WMS). */
export function getOperationAccent(unitType?: PipeUnitType | string): {
  bar: string;
  topBorder: string;
  badge: string;
  text: string;
} {
  if (unitType === 'FINANCEIRA') {
    return {
      bar: 'bg-blue-500',
      topBorder: 'border-t-blue-500',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      text: 'text-blue-700',
    };
  }
  if (unitType === 'CONTABILIDADE') {
    return {
      bar: 'bg-emerald-500',
      topBorder: 'border-t-emerald-500',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      text: 'text-emerald-700',
    };
  }
  return {
    bar: 'bg-salesforce-blue',
    topBorder: 'border-t-salesforce-blue',
    badge: 'bg-gray-50 text-gray-700 border-gray-200',
    text: 'text-gray-700',
  };
}
