
import React from 'react';

// Primitivo Base (exportado para uso em loading states inline)
export const Skeleton = ({ className }: { className: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} role="presentation" aria-hidden />
);

/** Esqueleto de linhas de tabela (para DataTable em loading). */
export function TableBodySkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: columns }).map((_, j) => (
            <td key={j} className="px-5 py-3.5">
              <Skeleton className="h-4 w-full max-w-[12rem]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// Padrão para Páginas de Listagem (Produtos, Usuários, Campanhas, etc)
export const TablePageSkeleton = () => (
  <div className="space-y-6 p-1 animate-fade-in">
    {/* Header */}
    <div className="flex justify-between items-center bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-10 w-40" />
    </div>

    {/* Table Area */}
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-64" />
        </div>
        <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                    </div>
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                    <div className="flex gap-2">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                    </div>
                </div>
            ))}
        </div>
    </div>
  </div>
);

// Padrão para o CRM (Cards no topo + Abas + Lista/Kanban)
export const CRMSkeleton = () => (
  <div className="space-y-6 p-1 animate-fade-in">
    {/* Date Filter Bar */}
    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm h-16 w-full flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-32" />
    </div>

    {/* KPI Cards */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      ))}
    </div>

    {/* Tabs & Controls */}
    <div className="flex justify-between items-end border-b border-gray-200 pb-2">
        <div className="flex gap-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-8 w-48" />
    </div>

    {/* Main Content Area (List/Kanban Placeholder) */}
    <div className="bg-white h-96 rounded-lg border border-gray-200 shadow-sm p-4 space-y-4">
        <div className="flex justify-between items-center mb-6">
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-10 w-40" />
        </div>
        {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex justify-between py-3 border-b border-gray-50">
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-6 w-1/4" />
            </div>
        ))}
    </div>
  </div>
);

// Padrão para Dashboard (Grid diferenciado)
export const DashboardSkeleton = () => (
    <div className="h-[calc(100vh-140px)] bg-white rounded-lg border border-gray-200 shadow-sm p-8 flex flex-col items-center justify-center space-y-6 animate-fade-in">
        <Skeleton className="h-32 w-32 rounded-full" />
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-6 w-2/3" />
        <div className="w-full max-w-md space-y-4 mt-8">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
        </div>
    </div>
);

// Esqueleto para gráficos
export const FinanceSkeleton = () => (
    <div className="space-y-6 p-1 animate-fade-in">
        <Skeleton className="h-16 w-full rounded-lg" />
        
        <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-40" />
        </div>

        {/* Goals */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm h-48">
            <Skeleton className="h-6 w-48 mb-6" />
            <div className="grid grid-cols-2 gap-8">
                <Skeleton className="h-24 w-full rounded" />
                <Skeleton className="h-24 w-full rounded" />
            </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-gray-200 shadow-sm h-80">
                <Skeleton className="h-6 w-64 mb-4" />
                <Skeleton className="h-full w-full rounded-b" />
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm h-80">
                <Skeleton className="h-6 w-40 mb-4" />
                <Skeleton className="h-48 w-48 rounded-full mx-auto mt-8" />
            </div>
        </div>
    </div>
);

// Esqueleto alinhado ao layout de ClientDetail (hero + métricas + contratos + timeline 2 colunas)
export const ClientDetailSkeleton = () => (
    <div className="animate-fade-in space-y-5 pb-10 md:space-y-6" role="status" aria-label="Carregando cliente">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Skeleton className="h-9 w-44" />
            <div className="flex flex-wrap gap-2">
                <Skeleton className="h-10 w-24 rounded-lg" />
                <Skeleton className="h-10 w-24 rounded-lg" />
                <Skeleton className="h-10 w-36 rounded-lg" />
                <Skeleton className="h-10 w-20 rounded-lg" />
            </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-5 md:px-6 md:py-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                        <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
                        <div className="min-w-0 flex-1 space-y-2">
                            <Skeleton className="h-7 w-56 max-w-full" />
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="mt-2 h-6 w-28 rounded-full" />
                        </div>
                    </div>
                    <Skeleton className="h-4 w-48 lg:mt-2" />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i}><Skeleton className="h-14 rounded-lg" /></div>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 divide-y divide-gray-100 md:grid-cols-2 md:divide-x md:divide-y-0">
                <div className="space-y-3 p-5 md:p-6">
                    <Skeleton className="h-4 w-20" />
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex gap-3">
                            <Skeleton className="h-4 w-4 shrink-0 rounded" />
                            <Skeleton className="h-4 flex-1 max-w-xs" />
                        </div>
                    ))}
                </div>
                <div className="space-y-3 p-5 md:p-6">
                    <Skeleton className="h-4 w-24" />
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-3">
                            <Skeleton className="h-4 w-4 shrink-0 rounded" />
                            <Skeleton className="h-4 flex-1 max-w-xs" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-3.5">
                <Skeleton className="h-5 w-32" />
            </div>
            <div className="p-5 space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex justify-between gap-4 py-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-20" />
                    </div>
                ))}
            </div>
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px] lg:gap-6">
            <div className="space-y-5">
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-3.5">
                        <Skeleton className="h-5 w-40" />
                    </div>
                    <div className="space-y-3 p-5">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-10 w-36" />
                    </div>
                </div>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-3.5">
                        <Skeleton className="h-5 w-28" />
                    </div>
                    <div className="space-y-4 p-5">
                        {[1, 2].map((i) => (
                            <div key={i} className="flex gap-3">
                                <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:sticky lg:top-4 lg:self-start">
                <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-3.5">
                    <Skeleton className="h-5 w-24" />
                </div>
                <div className="max-h-[480px] space-y-4 overflow-hidden p-5">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex gap-3">
                            <Skeleton className="h-2 w-2 shrink-0 rounded-full mt-2" />
                            <div className="flex-1 space-y-2 border-l border-gray-100 pl-4 pb-4">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

// Padrão para páginas de detalhe (Lead, Parceiro) – header + blocos de conteúdo
export const DetailPageSkeleton = () => (
    <div className="space-y-6 p-1 animate-fade-in">
        <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-6 w-32" />
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 flex items-start gap-4">
            <Skeleton className="h-20 w-20 rounded-full shrink-0" />
            <div className="space-y-3 flex-1">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-64" />
                <div className="flex gap-4 pt-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-36" />
                </div>
            </div>
            <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-2/3" />
            </div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
                <Skeleton className="h-5 w-32" />
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-20" />
                    </div>
                ))}
            </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <Skeleton className="h-5 w-28 mb-4" />
            <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex gap-3">
                        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                        <div className="space-y-1 flex-1">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// Padrão para Configurações – abas + formulários
export const SettingsSkeleton = () => (
    <div className="space-y-6 p-1 animate-fade-in">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="flex gap-2 border-b border-gray-200 pb-2 mb-6">
                <Skeleton className="h-9 w-28 rounded" />
                <Skeleton className="h-9 w-28 rounded" />
            </div>
            <div className="space-y-6">
                <Skeleton className="h-5 w-36" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-24 w-full rounded" />
            </div>
        </div>
    </div>
);
