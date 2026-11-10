import React, { useState } from 'react';
import { ChevronDown, ChevronUp, History } from 'lucide-react';
import type { CustomFieldEntry } from '../../../types';
import { LeadDetailSection } from '../../Lead/components/LeadDetailSection';
import { AttachmentFilesLinks } from '../../../components/AttachmentFilesLinks';
import { formatCurrency } from '../../../utils/formatters';

interface FinanceiraLegacyDataSectionProps {
    entries: CustomFieldEntry[];
}

function renderValue(entry: CustomFieldEntry): React.ReactNode {
    if (entry.type === 'attachment') {
        return entry.url ? <AttachmentFilesLinks entry={entry} /> : '—';
    }
    const value = entry.value;
    if (value === null || value === undefined || value === '') return '—';
    if (Array.isArray(value)) return value.join(', ') || '—';
    if (entry.type === 'currency') {
        const number = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(number) ? formatCurrency(number) : String(value);
    }
    if (entry.type === 'checkbox') return value ? 'Sim' : 'Não';
    return String(value);
}

/**
 * "Dados anteriores (somente leitura)": valores históricos de campos aposentados (`isActive=false`).
 * Nunca são apagados nem editáveis; ficam recolhidos para não poluir o formulário da fase.
 */
export function FinanceiraLegacyDataSection({ entries }: FinanceiraLegacyDataSectionProps) {
    const [open, setOpen] = useState(false);
    const filled = entries.filter((entry) => {
        if (entry.type === 'attachment') return Boolean(entry.url);
        const value = entry.value;
        return !(value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0));
    });
    if (filled.length === 0) return null;

    return (
        <LeadDetailSection
            id="financeira-dados-anteriores"
            title="Dados anteriores (somente leitura)"
            description="Campos que não fazem mais parte do formulário, preservados para consulta."
            icon={<History size={18} />}
            variant="subtle"
            action={
                <button
                    type="button"
                    onClick={() => setOpen((current) => !current)}
                    aria-expanded={open}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                    {open ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                    {open ? 'Recolher' : `Mostrar (${filled.length})`}
                </button>
            }
        >
            {open ? (
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filled.map((entry) => (
                        <div key={`${entry.stage}-${entry.key}`} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{entry.label}</dt>
                            <dd className="mt-0.5 break-words text-sm font-medium text-gray-900">{renderValue(entry)}</dd>
                            {entry.stage ? <p className="mt-0.5 text-[11px] text-gray-400">Etapa: {entry.stage}</p> : null}
                        </div>
                    ))}
                </dl>
            ) : (
                <p className="text-sm text-gray-500">{filled.length} valor(es) histórico(s) de campos aposentados.</p>
            )}
        </LeadDetailSection>
    );
}
