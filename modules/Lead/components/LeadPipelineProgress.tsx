import React from 'react';
import { Check } from 'lucide-react';
import type { Lead } from '../../../types';
import { getOperationAccent } from '../../../lib/pipeDisplay';

export interface LeadPipelineProgressProps {
    lead: Lead;
    stagesOrdered: string[];
    getStageKind: (pipeId: string, stage: string) => string | undefined;
    pipeUnitType?: string;
}

export function LeadPipelineProgress({
    lead,
    stagesOrdered,
    getStageKind,
    pipeUnitType,
}: LeadPipelineProgressProps) {
    if (stagesOrdered.length === 0) return null;

    const currentIndex = stagesOrdered.findIndex((s) => s === lead.stage);
    const accent = getOperationAccent(pipeUnitType);

    return (
        <nav aria-label="Progresso no funil" className="w-full">
            <ol className="flex items-center gap-0 overflow-x-auto pb-0.5 scroll-x-subtle">
                {stagesOrdered.map((stageName, index) => {
                    const kind = getStageKind(lead.pipeId, stageName);
                    const isCurrent = stageName === lead.stage;
                    const isPast = currentIndex >= 0 && index < currentIndex;
                    const isWin = kind === 'win';
                    const isLoss = kind === 'loss';

                    let dotClass = 'bg-gray-200 border-gray-300 text-gray-500';
                    let lineClass = 'bg-gray-200';
                    let labelClass = 'text-gray-500';

                    if (isPast) {
                        dotClass = `${accent.bar} border-transparent text-white`;
                        lineClass = accent.bar;
                        labelClass = 'text-gray-700 font-medium';
                    }
                    if (isCurrent) {
                        dotClass = isWin
                            ? 'bg-emerald-600 border-emerald-600 text-white ring-2 ring-emerald-200'
                            : isLoss
                                ? 'bg-gray-600 border-gray-600 text-white ring-2 ring-gray-300'
                                : `${accent.bar} border-transparent text-white ring-2 ring-blue-200`;
                        labelClass = 'text-gray-900 font-semibold';
                    }

                    return (
                        <li
                            key={stageName}
                            className="flex items-center shrink-0"
                            aria-current={isCurrent ? 'step' : undefined}
                        >
                            <div className="flex flex-col items-center min-w-[4.5rem] max-w-[7rem]">
                                <div
                                    className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold transition-colors ${dotClass}`}
                                    title={stageName}
                                >
                                    {isPast ? (
                                        <Check size={12} strokeWidth={3} aria-hidden />
                                    ) : !isCurrent ? (
                                        <span
                                            aria-hidden
                                            className="w-2 h-2 rounded-full bg-gray-300"
                                        />
                                    ) : (
                                        <span aria-hidden className="w-2 h-2 rounded-full bg-white" />
                                    )}
                                </div>
                                <span
                                    className={`mt-1.5 text-[11px] leading-tight text-center line-clamp-2 px-0.5 ${labelClass}`}
                                    title={stageName}
                                >
                                    {stageName}
                                </span>
                            </div>
                            {index < stagesOrdered.length - 1 && (
                                <div
                                    className={`h-0.5 w-6 sm:w-10 mb-5 shrink-0 rounded-full ${lineClass}`}
                                    aria-hidden
                                />
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
