import React, { useId } from 'react';
import { MessageSquare, Send, Clock, Loader2 } from 'lucide-react';
import {
    LeadTimelineEvent,
    LeadComment,
    ContactActivityType,
    ContactChannel,
    ContactResult,
} from '../../../types';
import { formatDate } from '../../../utils/formatters';
import { getTimelineIcon } from '../../../utils/timelineIcons';
import { getLeadTimelineSourceLabel, getLeadTimelineTypeLabel } from '../../../utils/leadTimelineLabels';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ContactAttemptForm } from '../../../components/crm/ContactAttemptForm';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { ClientSectionCard } from './ClientSectionCard';

export interface ClientTimelineSectionProps {
    contactType: ContactActivityType;
    onContactTypeChange: (value: ContactActivityType) => void;
    contactChannel: ContactChannel;
    onContactChannelChange: (value: ContactChannel) => void;
    contactResult: ContactResult;
    onContactResultChange: (value: ContactResult) => void;
    contactNotes: string;
    onContactNotesChange: (value: string) => void;
    contactEffectiveAt: string;
    followUpDate: string;
    onFollowUpDateChange: (value: string) => void;
    onRegisterContactAttempt: () => void;
    isRegisteringContactAttempt: boolean;
    newComment: string;
    onCommentChange: (value: string) => void;
    onAddComment: () => void;
    isCommentSaving?: boolean;
    comments: LeadComment[];
    timeline: LeadTimelineEvent[];
}

export function ClientTimelineSection({
    contactType,
    onContactTypeChange,
    contactChannel,
    onContactChannelChange,
    contactResult,
    onContactResultChange,
    contactNotes,
    onContactNotesChange,
    contactEffectiveAt,
    followUpDate,
    onFollowUpDateChange,
    onRegisterContactAttempt,
    isRegisteringContactAttempt,
    newComment,
    onCommentChange,
    onAddComment,
    isCommentSaving = false,
    comments,
    timeline,
}: ClientTimelineSectionProps) {
    const commentFieldId = useId();
    const operationalTimeline = timeline.filter((e) => e.type !== 'comment');
    const sortedTimeline = [...operationalTimeline].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const sortedComments = [...comments].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
                <ClientSectionCard
                    id="client-contact-attempt"
                    title="Registrar tentativa de contato"
                    icon={MessageSquare}
                >
                    <p className="mb-4 text-sm text-gray-600">
                        Registre ligações, mensagens ou visitas. A última ação do cliente é atualizada
                        automaticamente.
                    </p>
                    <ContactAttemptForm
                        contactType={contactType}
                        onContactTypeChange={onContactTypeChange}
                        contactChannel={contactChannel}
                        onContactChannelChange={onContactChannelChange}
                        contactResult={contactResult}
                        onContactResultChange={onContactResultChange}
                        contactNotes={contactNotes}
                        onContactNotesChange={onContactNotesChange}
                        contactEffectiveAt={contactEffectiveAt}
                        followUpDate={followUpDate}
                        onFollowUpDateChange={onFollowUpDateChange}
                        onSubmit={onRegisterContactAttempt}
                        isSubmitting={isRegisteringContactAttempt}
                        notesId="client-contact-notes"
                    />
                </ClientSectionCard>

                <ClientSectionCard title="Observação interna" icon={MessageSquare}>
                    <label htmlFor={`${commentFieldId}-input`} className="sr-only">
                        Observação interna
                    </label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <textarea
                            id={`${commentFieldId}-input`}
                            value={newComment}
                            onChange={(e) => onCommentChange(e.target.value)}
                            placeholder="Comentário interno sobre o cliente (não substitui o registro de contato)..."
                            className="h-24 flex-1 resize-none rounded-lg border border-gray-300 p-3 text-sm outline-none placeholder:text-gray-500 focus:border-salesforce-blue focus:ring-2 focus:ring-salesforce-blue/20"
                        />
                        <button
                            type="button"
                            onClick={onAddComment}
                            disabled={!newComment.trim() || isCommentSaving}
                            className="inline-flex h-fit items-center gap-2 self-end rounded-lg bg-salesforce-blue px-4 py-2 font-semibold text-white transition-colors hover:bg-salesforce-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-salesforce-blue/40 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
                        >
                            {isCommentSaving ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" aria-hidden />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Send size={16} aria-hidden />
                                    Enviar
                                </>
                            )}
                        </button>
                    </div>
                </ClientSectionCard>

                {sortedComments.length > 0 ? (
                    <ClientSectionCard
                        title={`Comentários (${sortedComments.length})`}
                        icon={MessageSquare}
                    >
                        <ul className="space-y-4">
                            {sortedComments.map((comment) => (
                                <li
                                    key={comment.id}
                                    className="flex gap-3 border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                                >
                                    <UserAvatar
                                        name={comment.userName}
                                        initials={comment.userInitials}
                                        size="sm"
                                        className="h-9 w-9 shrink-0"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1 flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-semibold text-gray-900">
                                                {comment.userName}
                                            </span>
                                            <time
                                                className="text-xs text-gray-500"
                                                dateTime={comment.date}
                                            >
                                                {formatDate(comment.date)} às{' '}
                                                {new Date(comment.date).toLocaleTimeString('pt-BR', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </time>
                                        </div>
                                        <p className="whitespace-pre-wrap text-sm text-gray-700">
                                            {comment.text}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </ClientSectionCard>
                ) : null}
            </div>

            <ClientSectionCard
                title="Linha do tempo"
                icon={Clock}
                className="xl:sticky xl:top-4 xl:self-start"
            >
                <p className="mb-4 text-xs leading-relaxed text-gray-500">
                    Eventos automáticos da jornada comercial. Comentários ficam separados para não
                    misturar conversa interna com histórico operacional.
                </p>
                {sortedTimeline.length > 0 ? (
                    <ol className="max-h-[min(70vh,640px)] space-y-4 overflow-y-auto pr-1">
                        {sortedTimeline.map((event, index) => (
                            <li key={event.id} className="relative flex gap-3">
                                {index !== sortedTimeline.length - 1 ? (
                                    <span
                                        className="absolute left-[11px] top-6 h-full w-0.5 bg-gray-200"
                                        aria-hidden
                                    />
                                ) : null}
                                <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-white">
                                    {getTimelineIcon(event.type)}
                                </div>
                                <div className="min-w-0 flex-1 pb-1">
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                            {getLeadTimelineTypeLabel(event.type)}
                                        </span>
                                        {getLeadTimelineSourceLabel(event) ? (
                                            <span className="text-[10px] text-gray-500">
                                                {getLeadTimelineSourceLabel(event)}
                                            </span>
                                        ) : null}
                                    </div>
                                    <p className="text-sm font-medium text-gray-900">
                                        {event.description}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500">
                                        <time dateTime={event.date}>
                                            {formatDate(event.date)} às{' '}
                                            {new Date(event.date).toLocaleTimeString('pt-BR', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </time>
                                        {event.userName ? (
                                            <span className="text-gray-400"> · {event.userName}</span>
                                        ) : null}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ol>
                ) : (
                    <EmptyState
                        icon={Clock}
                        title="Nenhuma atividade registrada"
                        description="O histórico de interações aparecerá aqui."
                        compact
                    />
                )}
            </ClientSectionCard>
        </div>
    );
}
