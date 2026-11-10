import type { Pipe, PipeUnitType } from '../types';

export function getPipeUnitType(
  pipeId: string | undefined,
  pipes: Pipe[],
): PipeUnitType | undefined {
  if (!pipeId) return undefined;
  return pipes.find((pipe) => pipe.id === pipeId)?.unitType;
}

export function isAccountingUnitPipe(
  pipeId: string | undefined,
  pipes: Pipe[],
): boolean {
  return getPipeUnitType(pipeId, pipes) === 'CONTABILIDADE';
}

/** Consistent accents for accounting workflows. */
export function getOperationAccent(unitType?: PipeUnitType | string): {
  bar: string;
  topBorder: string;
  badge: string;
  text: string;
} {
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
