import React from 'react';
import { ArrowLeft, Edit2, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import type { Lead } from '../../../types';
import { getOperationAccent } from '../../../lib/pipeDisplay';
import { LeadPipelineProgress } from './LeadPipelineProgress';

export interface NextStageOption {
    stageName: string;
    actionLabel: string;
    actionId?: string;
    kind?: string;
    autoExecute?: boolean;
}

export interface LeadHeaderProps {
    onBack: () => void;
    onEdit: () => void;
    nextStageOptions: NextStageOption[];
    lead: Lead | null;
    pipeName?: string;
    stagesOrdered: string[];
    pipeUnitType?: string;
    getStageKind: (pipeId: string, stage: string) => string | undefined;
    onAdvanceToStage: (targetStage: string) => void | Promise<void>;
    isAdvancing: boolean;
}

export function LeadHeader({
    onBack,
    onEdit,
    nextStageOptions,
    lead,
    pipeName,
    stagesOrdered,
    pipeUnitType,
    getStageKind,
    onAdvanceToStage,
    isAdvancing,
}: LeadHeaderProps) {
    const accent = getOperationAccent(pipeUnitType);

    return (
        <header className="lead-detail-header sticky top-16 md:top-0 z-20 -mx-4 p-4 md:-mx-8 md:px-8 pb-4 bg-[#f3f4f6]/95 backdrop-blur-sm border-b border-gray-200/80 motion-reduce:backdrop-blur-none">
            <div className="space-y-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                        <button
                            type="button"
                            onClick={onBack}
                            className="group shrink-0 mt-0.5 p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-salesforce-blue hover:border-salesforce-blue transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-salesforce-blue/40"
                            aria-label="Voltar para CRM"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div className="min-w-0 flex-1">
                            {lead ? (
                                <>
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                                            {lead.name}
                                        </h1>
                                        {lead.company ? (
                                            <span className="text-sm text-gray-500 hidden sm:inline">
                                                · {lead.company}
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-sm">
                                        {pipeName ? (
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${accent.badge}`}
                                            >
                                                {pipeName}
                                            </span>
                                        ) : null}
                                        <span className="text-gray-500">
                                            Etapa atual:{' '}
                                            <span className="font-semibold text-gray-800">{lead.stage}</span>
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <h1 className="text-xl font-bold text-gray-900">Detalhes do lead</h1>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 lg:pt-1">
                        <button
                            type="button"
                            onClick={onEdit}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-salesforce-blue/40"
                        >
                            <Edit2 size={16} />
                            Editar
                        </button>
                        {nextStageOptions.length > 0 && (
                            <details className="group relative">
                                <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg bg-salesforce-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-salesforce-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-salesforce-blue/40 [&::-webkit-details-marker]:hidden">
                                    <TrendingUp size={16} aria-hidden />
                                    <span>{isAdvancing ? 'Atualizando…' : 'Ações do processo'}</span>
                                    <ChevronDown size={16} className="transition-transform group-open:rotate-180" aria-hidden />
                                </summary>
                                <div className="absolute left-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg lg:left-auto lg:right-0">
                                    <p className="px-3 pb-1 pt-2 text-xs font-semibold text-gray-500">
                                        Escolha uma ação do processo
                                    </p>
                                    <div className="max-h-72 overflow-y-auto p-1">
                                        {nextStageOptions.map((opt) => {
                                            const kind = lead ? getStageKind(lead.pipeId, opt.stageName) : undefined;
                                            const isWin = kind === 'win';
                                            const isLoss = kind === 'loss';
                                            const iconClass = isWin
                                                ? 'text-emerald-600'
                                                : isLoss
                                                  ? 'text-gray-600'
                                                  : 'text-salesforce-blue';
                                            const actionLabel = opt.actionLabel?.trim();
                                            // Rótulos genéricos (ex.: "Retomar") repetidos precisam do destino.
                                            const label = !actionLabel
                                                ? `Ir para "${opt.stageName}"`
                                                : nextStageOptions.filter((o) => o.actionLabel?.trim() === actionLabel).length > 1
                                                  ? `${actionLabel} → ${opt.stageName}`
                                                  : actionLabel;
                                            return (
                                                <button
                                                    key={opt.actionId ?? opt.stageName}
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.currentTarget.closest('details')?.removeAttribute('open');
                                                        void onAdvanceToStage(opt.stageName);
                                                    }}
                                                    disabled={isAdvancing}
                                                    className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:bg-blue-50 focus-visible:ring-2 focus-visible:ring-salesforce-blue/40 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <TrendingUp size={16} className={`shrink-0 ${iconClass}`} aria-hidden />
                                                    <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
                                                    <ChevronRight size={15} className="shrink-0 text-gray-400" aria-hidden />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </details>
                        )}
                    </div>
                </div>

                {lead && stagesOrdered.length > 0 ? (
                    <LeadPipelineProgress
                        lead={lead}
                        stagesOrdered={stagesOrdered}
                        getStageKind={getStageKind}
                        pipeUnitType={pipeUnitType}
                    />
                ) : null}
            </div>
        </header>
    );
}
