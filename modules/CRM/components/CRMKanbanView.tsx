import { isDemo } from '../../../config/demo';
import React, { ReactNode, useEffect, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { Lead, PipeId, Pipe } from '../../../types';
import { KanbanColumn } from './KanbanColumn';
import { CRMListHeader, type CRMListHeaderProps } from './CRMListHeader';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { StageData } from '../schemas';
import { COMMERCIAL_FLOW_STAGE_SEQUENCE } from './pipeConfigConstants';

export interface CRMKanbanViewProps {
    stages: string[];
    leadsByStageData: Record<string, StageData>;
    loadingByStage: Record<string, boolean>;
    errorsByStage?: Record<string, string>;
    searchTerm: string;
    onSearchChange: (value: string) => void;
    onSearch: () => void;
    onRefresh?: () => void;
    onNewLead: () => void;
    selectedPipeId: PipeId;
    pipes: Pipe[];
    getStageLeads: (stage: string) => Lead[];
    getLeadFromStages: (id: string) => Lead | undefined;
    getStageKind: (pipeId: PipeId, stage: string) => string | undefined;
    getNextStages: (pipeId: PipeId, stage: string) => string[];
    loadStagePage: (stage: string, page: number, append: boolean) => void;
    draggedLeadId: string | null;
    isDragging: boolean;
    dragOverStage: string | null;
    handleDragStart: (e: React.DragEvent, leadId: string) => void;
    handleDragEnd: () => void;
    handleDragOver: (e: React.DragEvent, targetStage: string) => void;
    handleDrop: (e: React.DragEvent, targetStage: string) => void | Promise<void>;
    navigate: (path: string) => void;
    getLeadDetailPath: (id: string) => string;
    settingsLoaded: boolean;
    settingsLoading: boolean;
    /** True quando o fluxo do pipe selecionado já foi carregado (GET /pipes/:id). */
    pipeFlowLoaded: boolean;
    newLeadConfig?: CRMListHeaderProps['newLeadConfig'];
    dragEnabled?: boolean;
    /** Slot para filtros adicionais exibidos na barra de busca */
    filterSlot?: ReactNode;
}

const labelsMinimizedStorageKey = (pipeId: PipeId) => `contabil:crm:kanban:labels-minimized:${pipeId}`;

function readLabelsMinimizedPreference(pipeId: PipeId): boolean {
    try {
        return window.localStorage.getItem(labelsMinimizedStorageKey(pipeId)) === 'true';
    } catch {
        return false;
    }
}

export function CRMKanbanView({
    stages,
    leadsByStageData,
    loadingByStage,
    errorsByStage = {},
    searchTerm,
    onSearchChange,
    onSearch,
    onRefresh,
    onNewLead,
    selectedPipeId,
    pipes,
    getStageLeads,
    getLeadFromStages,
    getStageKind,
    getNextStages,
    loadStagePage,
    draggedLeadId,
    isDragging,
    dragOverStage,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    navigate,
    getLeadDetailPath,
    settingsLoaded,
    settingsLoading,
    pipeFlowLoaded,
    newLeadConfig,
    dragEnabled = true,
    filterSlot,
}: CRMKanbanViewProps) {
    const [labelsMinimized, setLabelsMinimized] = useState(false);
    const selectedPipe = pipes.find((pipe) => pipe.id === selectedPipeId);
    const selectedPipeName = (selectedPipe?.name ?? '').toLowerCase();
    const isCommercialReferencePipe =
        selectedPipeName.includes('contabil') || selectedPipeName.includes('comercial');
    const missingCommercialStages = !isDemo && isCommercialReferencePipe
        ? COMMERCIAL_FLOW_STAGE_SEQUENCE.filter((stage) => !stages.includes(stage))
        : [];

    useEffect(() => {
        setLabelsMinimized(readLabelsMinimizedPreference(selectedPipeId));
    }, [selectedPipeId]);

    const toggleLabelsMinimized = () => {
        setLabelsMinimized((current) => {
            const next = !current;
            try {
                window.localStorage.setItem(labelsMinimizedStorageKey(selectedPipeId), String(next));
            } catch {
                // A indisponibilidade do armazenamento não deve impedir a preferência na sessão atual.
            }
            return next;
        });
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <CRMListHeader
                searchTerm={searchTerm}
                onSearchChange={onSearchChange}
                onSearch={onSearch}
                onRefresh={onRefresh}
                onNewLead={onNewLead}
                newLeadConfig={newLeadConfig}
                labelsMinimized={labelsMinimized}
                onToggleLabelsMinimized={toggleLabelsMinimized}
                filterSlot={filterSlot}
            />
            {isCommercialReferencePipe && missingCommercialStages.length > 0 && (
                <div className="px-4 py-2 border-b border-amber-100 bg-amber-50 text-xs text-amber-900" role="status">
                    <strong className="font-semibold">Configuração incompleta:</strong>{' '}
                    etapas ausentes neste funil — {missingCommercialStages.join(', ')}.
                </div>
            )}
            <div className="flex h-[calc(100vh-210px)] md:h-[calc(100vh-160px)] overflow-x-auto pb-4 space-x-4 p-3 md:p-4 snap-x snap-mandatory">
                {selectedPipeId && stages.length === 0 && !pipeFlowLoaded ? (
                    <div className="flex-1 flex items-center justify-center min-h-[200px] text-gray-500">
                        <div className="animate-pulse flex flex-col items-center gap-3">
                            <div className="h-8 w-48 bg-gray-200 rounded" />
                            <div className="flex gap-4">
                                <div className="h-32 w-72 bg-gray-100 rounded-lg" />
                                <div className="h-32 w-72 bg-gray-100 rounded-lg" />
                                <div className="h-32 w-72 bg-gray-100 rounded-lg" />
                            </div>
                            <span className="text-sm">Carregando pipeline...</span>
                        </div>
                    </div>
                ) : pipeFlowLoaded && selectedPipeId && stages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center min-h-[200px] bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                        <EmptyState
                            icon={LayoutGrid}
                            title="Nenhuma etapa configurada no pipeline"
                            description="Configure as etapas em Configurações para exibir o kanban."
                            compact
                        />
                    </div>
                ) : (
                    stages.map((stage) => {
                        const stageLeads = getStageLeads(stage);
                        const stageData = leadsByStageData[stage];
                        const isDragOverThis = dragOverStage === stage;
                        const draggedLead = draggedLeadId ? getLeadFromStages(draggedLeadId) : undefined;
                        const canDropHere = draggedLead
                            ? (() => {
                                  const allowed = getNextStages(draggedLead.pipeId, draggedLead.stage);
                                  return allowed.length === 0 || allowed.includes(stage);
                              })()
                            : false;

                        return (
                            <React.Fragment key={stage}>
                                <KanbanColumn
                                    stage={stage}
                                    stageLeads={stageLeads}
                                    stageData={stageData}
                                    isLoading={loadingByStage[stage] ?? false}
                                    error={errorsByStage[stage]}
                                    onRetry={() => loadStagePage(stage, stageData?.hasMore ? stageData.page + 1 : 1, Boolean(stageData?.hasMore))}
                                    onLoadMore={() => loadStagePage(stage, (stageData?.page ?? 1) + 1, true)}
                                    pipeId={selectedPipeId}
                                    pipes={pipes}
                                    getStageKind={getStageKind}
                                    draggedLeadId={draggedLeadId}
                                    isDragging={isDragging}
                                    draggedLead={draggedLead ?? null}
                                    canDropHere={canDropHere}
                                    isDragOverThis={isDragOverThis}
                                    handleDragStart={handleDragStart}
                                    handleDragEnd={handleDragEnd}
                                    handleDragOver={handleDragOver}
                                handleDrop={handleDrop}
                                navigate={navigate}
                                getLeadDetailPath={getLeadDetailPath}
                                dragEnabled={dragEnabled}
                                    labelsMinimized={labelsMinimized}
                                />
                            </React.Fragment>
                        );
                    })
                )}
            </div>
        </div>
    );
}
