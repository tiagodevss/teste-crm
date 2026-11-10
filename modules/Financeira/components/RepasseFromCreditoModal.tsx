import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2, Search, Link2 } from 'lucide-react';
import { Modal, ModalFooter, ModalHeader } from '../../../components/ui/Modal';
import {
    createRepasseFromCredito,
    getFinanceiraErrorCode,
    getFinanceiraErrorDetails,
    listCreditosConcluidos,
    type CreditoConcluidoItem,
} from '../../../lib/financeira-api';
import { getApiErrorMessage } from '../../../lib/api-error';

interface RepasseFromCreditoModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Chamado após criar (ou ao abrir um Repasse já existente). */
    onOpenRepasse: (repasseLeadId: string) => void;
    onCreated: (repasseLeadId: string) => void;
}

const PAGE_SIZE = 10;

/**
 * Criação manual de Repasse (R01): somente a partir de um Crédito concluído, usando o mesmo serviço
 * de cópia/vinculação da automação. Não existe cadastro independente de Repasse.
 */
export function RepasseFromCreditoModal({ isOpen, onClose, onOpenRepasse, onCreated }: RepasseFromCreditoModalProps) {
    const [search, setSearch] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [items, setItems] = useState<CreditoConcluidoItem[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<CreditoConcluidoItem | null>(null);
    const [creating, setCreating] = useState(false);
    const [existingRepasseId, setExistingRepasseId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = await listCreditosConcluidos({ search: appliedSearch || undefined, page, limit: PAGE_SIZE });
            setItems(result.items);
            setTotal(result.total);
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Não foi possível carregar os créditos concluídos.'));
        } finally {
            setLoading(false);
        }
    }, [appliedSearch, page]);

    useEffect(() => {
        if (isOpen && !selected) void load();
    }, [isOpen, selected, load]);

    useEffect(() => {
        if (!isOpen) {
            setSearch('');
            setAppliedSearch('');
            setPage(1);
            setSelected(null);
            setExistingRepasseId(null);
        }
    }, [isOpen]);

    const confirm = async () => {
        if (!selected) return;
        setCreating(true);
        try {
            const result = await createRepasseFromCredito(selected.id);
            toast.success('Repasse criado e vinculado ao Crédito.');
            onCreated(result.repasseLeadId);
            onClose();
        } catch (error) {
            const code = getFinanceiraErrorCode(error);
            if (code === 'FINANCEIRA_REPASSE_JA_EXISTE') {
                const existing = getFinanceiraErrorDetails(error)?.existingRepasseId;
                setExistingRepasseId(typeof existing === 'string' ? existing : null);
                toast.error('Repasse já existente para este Crédito.');
            } else {
                toast.error(getApiErrorMessage(error, 'Não foi possível criar o Repasse.'));
            }
        } finally {
            setCreating(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <Modal isOpen={isOpen} onClose={onClose} contentClassName="max-w-2xl" closeOnBackdropClick={false}>
            <ModalHeader title="Novo card de Repasse" onClose={onClose} />
            {!selected ? (
                <div className="space-y-4 px-6 py-5">
                    <p className="text-sm text-gray-600">
                        O Repasse é sempre criado a partir de um card de <strong>Crédito concluído</strong>. Selecione a origem
                        abaixo; os dados são copiados no momento da criação.
                    </p>
                    <form
                        className="flex gap-2"
                        onSubmit={(event) => {
                            event.preventDefault();
                            setPage(1);
                            setAppliedSearch(search.trim());
                        }}
                    >
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                aria-label="Buscar crédito concluído por nome, CPF ou ID"
                                placeholder="Buscar por nome, CPF ou ID"
                                className="block w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm focus:border-salesforce-blue focus:outline-none focus:ring-2 focus:ring-salesforce-blue/20"
                            />
                        </div>
                        <button
                            type="submit"
                            className="rounded-lg bg-salesforce-blue px-4 py-2 text-sm font-semibold text-white hover:bg-salesforce-hover"
                        >
                            Buscar
                        </button>
                    </form>
                    <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200" aria-busy={loading}>
                        {loading ? (
                            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
                                <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Carregando…
                            </div>
                        ) : items.length === 0 ? (
                            <p className="py-10 text-center text-sm text-gray-500">
                                Nenhum Crédito concluído disponível (sem Repasse vinculado).
                            </p>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {items.map((item) => (
                                    <li key={item.id}>
                                        <button
                                            type="button"
                                            onClick={() => setSelected(item)}
                                            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                                        >
                                            <span>
                                                <span className="block text-sm font-semibold text-gray-900">{item.name}</span>
                                                <span className="block text-xs text-gray-500">
                                                    CPF {item.cpfMasked ?? '—'}
                                                    {item.partnerName ? ` · ${item.partnerName}` : ''}
                                                </span>
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                Concluído em {new Date(item.concludedAt).toLocaleDateString('pt-BR')}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    {total > PAGE_SIZE && (
                        <div className="flex items-center justify-between text-xs text-gray-600">
                            <button
                                type="button"
                                disabled={page <= 1 || loading}
                                onClick={() => setPage((current) => current - 1)}
                                className="rounded border border-gray-300 px-3 py-1 disabled:opacity-50"
                            >
                                Anterior
                            </button>
                            <span>
                                Página {page} de {totalPages}
                            </span>
                            <button
                                type="button"
                                disabled={page >= totalPages || loading}
                                onClick={() => setPage((current) => current + 1)}
                                className="rounded border border-gray-300 px-3 py-1 disabled:opacity-50"
                            >
                                Próxima
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4 px-6 py-5">
                    <dl className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Cliente</dt>
                            <dd className="font-semibold text-gray-900">{selected.name}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">CPF</dt>
                            <dd className="text-gray-900">{selected.cpfMasked ?? '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Parceiro</dt>
                            <dd className="text-gray-900">{selected.partnerName ?? '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Destino</dt>
                            <dd className="text-gray-900">3. REPASSE · ENGENHARIA</dd>
                        </div>
                    </dl>
                    <p className="text-xs text-gray-500">
                        Os dados do Crédito serão copiados como snapshot. Alterações posteriores em um dos cards não afetam o outro.
                    </p>
                    {existingRepasseId && (
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
                            <span>Repasse já existente para este Crédito.</span>
                            <button
                                type="button"
                                onClick={() => {
                                    onOpenRepasse(existingRepasseId);
                                    onClose();
                                }}
                                className="font-semibold underline"
                            >
                                Abrir Repasse
                            </button>
                        </div>
                    )}
                </div>
            )}
            <ModalFooter>
                {selected ? (
                    <>
                        <button
                            type="button"
                            onClick={() => {
                                setSelected(null);
                                setExistingRepasseId(null);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            <ArrowLeft size={16} aria-hidden="true" /> Escolher outro
                        </button>
                        <button
                            type="button"
                            onClick={confirm}
                            disabled={creating}
                            className="inline-flex items-center gap-2 rounded-lg bg-salesforce-blue px-5 py-2.5 text-sm font-bold text-white hover:bg-salesforce-hover disabled:opacity-60"
                        >
                            {creating ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}
                            Criar Repasse vinculado
                        </button>
                    </>
                ) : (
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Fechar
                    </button>
                )}
            </ModalFooter>
        </Modal>
    );
}
