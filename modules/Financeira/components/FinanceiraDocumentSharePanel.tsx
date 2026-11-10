import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Link2Off, Loader2, MessageCircle, RefreshCw, Send } from 'lucide-react';
import type { Lead } from '../../../types';
import { LeadDetailSection } from '../../Lead/components/LeadDetailSection';
import {
    listLeadMessages,
    resendMessage,
    revokeDocumentShare,
    type FinanceiraMessageItem,
    type OutboundMessageStatus,
} from '../../../lib/financeira-api';
import { getApiErrorMessage } from '../../../lib/api-error';

interface FinanceiraDocumentSharePanelProps {
    lead: Lead;
    kind: 'SIMULACAO' | 'BOLETO';
    canEdit: boolean;
}

const STATUS_LABEL: Record<OutboundMessageStatus, string> = {
    PENDING: 'Pendente',
    SENDING: 'Enviando…',
    ACCEPTED: 'Aceito pelo MegaZap',
    FAILED: 'Falha — reenviar',
    UNKNOWN: 'Resultado do envio não confirmado',
    CANCELLED: 'Cancelado',
};

const STATUS_STYLE: Record<OutboundMessageStatus, string> = {
    PENDING: 'bg-gray-100 text-gray-800 border-gray-200',
    SENDING: 'bg-blue-50 text-blue-800 border-blue-200',
    ACCEPTED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    FAILED: 'bg-red-50 text-red-800 border-red-200',
    UNKNOWN: 'bg-amber-50 text-amber-900 border-amber-200',
    CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
};

const KIND_COPY = {
    SIMULACAO: {
        title: 'Comunicação de documentos — Simulação',
        recipient: 'corretor/parceiro',
        preview:
            'Olá, {parceiro}! A simulação do financiamento imobiliário de {proponente} está disponível para consulta pelo link seguro: {link seguro}. Caso tenha dificuldades para acessar, fale com a equipe WMS.',
    },
    BOLETO: {
        title: 'Comunicação de documentos — Boleto de engenharia',
        recipient: 'cliente',
        preview:
            'Olá, {proponente}! O boleto de engenharia do seu financiamento imobiliário está disponível para consulta pelo link seguro: {link seguro}. Em caso de dúvidas, entre em contato com a equipe WMS.',
    },
} as const;

const SHARE_STATUS_LABEL: Record<string, string> = {
    ACTIVE: 'Link ativo',
    REVOKED: 'Link revogado',
};

function formatDateTimeBr(value: string | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

/**
 * Status das mensagens de WhatsApp (MegaZap QR Code) com link seguro. `Aceito pelo MegaZap` é
 * apenas o aceite técnico da API — não significa entregue nem lido.
 */
export function FinanceiraDocumentSharePanel({ lead, kind, canEdit }: FinanceiraDocumentSharePanelProps) {
    const [messages, setMessages] = useState<FinanceiraMessageItem[]>([]);
    const [whatsappConfigured, setWhatsappConfigured] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const copy = KIND_COPY[kind];

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await listLeadMessages(lead.id);
            setMessages(result.messages.filter((message) => message.kind === kind));
            setWhatsappConfigured(result.whatsappConfigured);
        } catch (err) {
            setError(getApiErrorMessage(err, 'Não foi possível carregar o status das mensagens.'));
        } finally {
            setLoading(false);
        }
    }, [lead.id, kind]);

    useEffect(() => {
        void load();
    }, [load, lead.updatedAt]);

    // Atualiza enquanto houver envio em andamento (o worker processa após o commit do card).
    useEffect(() => {
        const inFlight = messages.some((message) => message.status === 'PENDING' || message.status === 'SENDING');
        if (!inFlight) return;
        const timer = window.setTimeout(() => void load(), 4000);
        return () => window.clearTimeout(timer);
    }, [messages, load]);

    const resend = async (message: FinanceiraMessageItem) => {
        const confirmPossibleDuplicate = Boolean(message.requiresDuplicateConfirmation);
        if (confirmPossibleDuplicate && confirmingId !== message.id) {
            // Primeiro clique só pede a confirmação explícita do risco de duplicidade.
            setConfirmingId(message.id);
            return;
        }
        setConfirmingId(null);
        setBusyId(message.id);
        try {
            await resendMessage(lead.id, message.id, confirmPossibleDuplicate);
            toast.success('Reenvio solicitado.');
            await load();
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Não foi possível reenviar a mensagem.'));
        } finally {
            setBusyId(null);
        }
    };

    const revoke = async (message: FinanceiraMessageItem) => {
        if (!message.shareId) return;
        setBusyId(message.id);
        try {
            await revokeDocumentShare(message.shareId);
            toast.success('Link revogado.');
            await load();
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Não foi possível revogar o link.'));
        } finally {
            setBusyId(null);
        }
    };

    return (
        <LeadDetailSection
            id="financeira-comunicacao"
            title={copy.title}
            description={`Mensagem de WhatsApp para o ${copy.recipient}, com link seguro de visualização.`}
            icon={<MessageCircle size={18} />}
            action={
                <button
                    type="button"
                    onClick={() => void load()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                    <RefreshCw size={14} aria-hidden="true" /> Atualizar
                </button>
            }
        >
            <div className="space-y-4">
                {!whatsappConfigured && (
                    <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                        WhatsApp não configurado. O card é salvo normalmente, mas nenhuma mensagem será enviada até a integração MegaZap ser habilitada.
                    </p>
                )}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Prévia da mensagem</p>
                    <p className="mt-1 text-sm text-gray-700">{copy.preview}</p>
                </div>
                {error && (
                    <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                        {error}
                    </p>
                )}
                {loading && messages.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Carregando…
                    </div>
                ) : messages.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhuma mensagem solicitada para este card.</p>
                ) : (
                    <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                        {messages.map((message) => (
                            <li key={message.id} className="space-y-2 px-4 py-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span
                                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[message.status]}`}
                                    >
                                        {STATUS_LABEL[message.status]}
                                    </span>
                                    {message.shareStatus && (
                                        <span className="text-xs text-gray-600">{SHARE_STATUS_LABEL[message.shareStatus]}</span>
                                    )}
                                </div>
                                <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-xs text-gray-600 sm:grid-cols-2">
                                    <div>
                                        <dt className="inline font-semibold">Destino: </dt>
                                        <dd className="inline">
                                            {message.recipientName ? `${message.recipientName} · ` : ''}
                                            {message.recipientMasked ?? '—'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="inline font-semibold">Arquivo: </dt>
                                        <dd className="inline">{message.fileName ?? '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="inline font-semibold">Solicitado em: </dt>
                                        <dd className="inline">{formatDateTimeBr(message.requestedAt)}</dd>
                                    </div>
                                </dl>
                                {message.status === 'UNKNOWN' && (
                                    <p className="text-xs text-amber-800">
                                        Resultado do envio não confirmado; confirme no MegaZap antes de reenviar.
                                    </p>
                                )}
                                {message.status === 'ACCEPTED' && (
                                    <p className="text-xs text-gray-500">
                                        “Aceito” indica apenas que o MegaZap recebeu a solicitação — não garante entrega nem leitura.
                                    </p>
                                )}
                                {message.lastErrorCode && message.status === 'FAILED' && (
                                    <p className="text-xs text-red-700">Erro: {message.lastErrorCode}</p>
                                )}
                                {confirmingId === message.id && (
                                    <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                        Reenviar pode duplicar a mensagem se o envio anterior chegou ao destinatário. Confirme no MegaZap e clique em
                                        “Reenviar mesmo assim”.
                                    </p>
                                )}
                                {canEdit && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {message.canResend && (
                                            <button
                                                type="button"
                                                disabled={busyId === message.id}
                                                onClick={() => void resend(message)}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-salesforce-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-salesforce-hover disabled:opacity-60"
                                            >
                                                <Send size={13} aria-hidden="true" />{' '}
                                                {confirmingId === message.id ? 'Reenviar mesmo assim' : 'Reenviar'}
                                            </button>
                                        )}
                                        {message.shareStatus === 'ACTIVE' && message.shareId && (
                                            <button
                                                type="button"
                                                disabled={busyId === message.id}
                                                onClick={() => void revoke(message)}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                            >
                                                <Link2Off size={13} aria-hidden="true" /> Revogar link
                                            </button>
                                        )}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </LeadDetailSection>
    );
}
