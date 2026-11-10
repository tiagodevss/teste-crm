import React from 'react';
import { Kanban, Target, ArrowRight } from 'lucide-react';
import type { Pipe, PipeId } from '../../../types';
import { getPipeIconComponent } from '../../../lib/pipeIcons';

export interface CRMPipeGridProps {
    pipes: Pipe[];
    onSelectPipe: (pipeId: PipeId) => void;
    onNavigateToCreatePipe: () => void;
    onNavigateToPipeSettings: (pipeId: PipeId) => void;
    isLoading?: boolean;
}

const PIPE_ICON_COLORS = [
    'bg-blue-500',
    'bg-indigo-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-orange-500',
    'bg-teal-500',
] as const;

export function CRMPipeGrid({
    pipes,
    onSelectPipe,
    onNavigateToCreatePipe,
    onNavigateToPipeSettings,
    isLoading = false,
}: CRMPipeGridProps) {
    return (
        <div className="max-w-6xl mx-auto py-4 md:py-8 px-0 md:px-4">
            <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-salesforce-blue rounded-lg shadow-lg">
                            <Kanban className="text-white" size={28} />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                            Fluxos de Trabalho
                        </h1>
                    </div>
                    <p className="text-gray-600 text-lg max-w-2xl leading-relaxed">
                        Três esteiras contábeis, cada uma com seu processo: conquiste clientes, abra empresas e organize o onboarding.
                    </p>
                </div>

            </header>

            {pipes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center shadow-sm">
                    <div className="mx-auto w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <Target size={40} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhuma esteira encontrada</h3>
                    <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                        Use Restaurar demo para recuperar as três esteiras de exemplo.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pipes.map((pipe, idx) => {
                        const iconColor = PIPE_ICON_COLORS[idx % PIPE_ICON_COLORS.length];
                        const PipeIconComponent = getPipeIconComponent(pipe.icon);
                        const description = pipe.description?.trim() || 'Pipeline de vendas comercial';
                        return (
                            <div
                                key={pipe.id}
                                className="group relative bg-white p-6 rounded-2xl border border-gray-200 text-left transition-all duration-300 hover:shadow-xl hover:border-salesforce-blue hover:-translate-y-1"
                            >
                                <button
                                    type="button"
                                    onClick={() => onSelectPipe(pipe.id)}
                                    className="w-full text-left focus:outline-none focus:ring-4 focus:ring-salesforce-blue/10 rounded-2xl"
                                >
                                    <div className="flex items-start mb-6">
                                        <div className={`p-3 rounded-xl ${iconColor} text-white shadow-md group-hover:scale-110 transition-transform`}>
                                            <PipeIconComponent size={24} />
                                        </div>
                                    </div>

                                    <div className="space-y-1 mb-8 flex items-center justify-between">
                                        <div className="min-w-0 flex-1 pr-3">
                                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-salesforce-blue transition-colors break-words">
                                                {pipe.name}
                                            </h3>
                                            <p className="text-sm text-gray-500 flex items-center gap-1.5 font-medium line-clamp-2">
                                                {description}
                                            </p>
                                        </div>
                                        <div className="w-10 h-10 shrink-0 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-salesforce-blue group-hover:text-white transition-all transform group-hover:translate-x-1">
                                            <ArrowRight size={20} />
                                        </div>
                                    </div>
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
