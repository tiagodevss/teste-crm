import { ReactNode } from 'react';
import { Search, Plus, RefreshCw, Tags } from 'lucide-react';

export interface CRMListHeaderProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    onSearch: () => void;
    onRefresh?: () => void;
    onNewLead: () => void;
    newLeadConfig?: {
        show?: boolean;
        disabled?: boolean;
        title?: string;
        /** Rótulo do botão (padrão "Novo Lead"; Repasse usa "Novo card de repasse"). */
        label?: string;
    };
    labelsMinimized?: boolean;
    onToggleLabelsMinimized?: () => void;
    /** Slot para filtros adicionais (ex: filtro por label) */
    filterSlot?: ReactNode;
}

export function CRMListHeader({
    searchTerm,
    onSearchChange,
    onSearch,
    onRefresh,
    onNewLead,
    newLeadConfig,
    labelsMinimized = false,
    onToggleLabelsMinimized,
    filterSlot,
}: CRMListHeaderProps) {
    const showNewLeadButton = newLeadConfig?.show ?? true;
    const newLeadDisabled = newLeadConfig?.disabled ?? false;
    const newLeadTitle = newLeadConfig?.title;
    return (
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                {filterSlot}
                <div className="relative flex-1 md:w-72">
                    <input
                        type="text"
                        placeholder="Buscar lead por nome..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-salesforce-blue/20 focus:border-salesforce-blue transition-all shadow-sm"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" size={18} />
                </div>
                <button
                    type="button"
                    onClick={onSearch}
                    title="Pesquisar"
                    className="p-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-salesforce-blue transition-all focus:outline-none focus:ring-2 focus:ring-salesforce-blue/20 shrink-0"
                    aria-label="Pesquisar"
                >
                    <Search size={18} className="text-salesforce-blue" />
                </button>
            </div>
            <div className="flex items-center gap-2">
                {onRefresh && (
                    <button
                        type="button"
                        onClick={onRefresh}
                        title="Recarregar leads"
                        className="p-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-salesforce-blue/20"
                        aria-label="Recarregar leads"
                    >
                        <RefreshCw size={18} />
                    </button>
                )}
                {onToggleLabelsMinimized && (
                    <button
                        type="button"
                        onClick={onToggleLabelsMinimized}
                        title={labelsMinimized ? 'Exibir etiquetas nos cards' : 'Minimizar etiquetas nos cards'}
                        aria-label={labelsMinimized ? 'Exibir etiquetas nos cards' : 'Minimizar etiquetas nos cards'}
                        aria-pressed={labelsMinimized}
                        className={`p-2 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-salesforce-blue/20 ${labelsMinimized
                            ? 'border-salesforce-blue bg-blue-50 text-salesforce-blue'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'}`}
                    >
                        <Tags size={18} />
                    </button>
                )}
                {showNewLeadButton && (
                    <button
                        type="button"
                        onClick={onNewLead}
                        disabled={newLeadDisabled}
                        title={newLeadTitle}
                        aria-disabled={newLeadDisabled}
                        className="flex items-center space-x-2 bg-salesforce-blue text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm hover:bg-salesforce-hover disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <Plus size={18} />
                        <span>{newLeadConfig?.label ?? 'Novo Lead'}</span>
                    </button>
                )}
            </div>
        </div>
    );
}
