import React, { useState } from 'react';
import { MessageSquare, Send, Clock, PhoneCall } from 'lucide-react';
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
import { LeadDetailSection } from './LeadDetailSection';
import { UserAvatar } from '../../../components/ui/UserAvatar';

export interface LeadTimelineSectionProps {
    newComment: string;
    onCommentChange: (value: string) => void;
    onAddComment: () => void;
    contactType: ContactActivityType;
    onContactTypeChange: (value: ContactActivityType) => void;
    contactChannel: ContactChannel;
    onContactChannelChange: (value: ContactChannel) => void;
    contactResult: ContactResult;
    onContactResultChange: (value: ContactResult) => void;
    contactNotes: string;
    onContactNotesChange: (value: string) => void;
    contactEffectiveAt: string;
    onContactEffectiveAtChange: (value: string) => void;
    contactError?: string | null;
    canRegisterContact?: boolean;
    followUpDate: string;
    onFollowUpDateChange: (value: string) => void;
    onRegisterContactAttempt: () => void;
    isRegisteringContactAttempt: boolean;
    comments: LeadComment[];
    timeline: LeadTimelineEvent[];

    showCommercialContactForm?: boolean;
}

export function LeadTimelineSection({
    newComment,
    onCommentChange,
    onAddComment,
    contactType,
    onContactTypeChange,
    contactChannel,
    onContactChannelChange,
    contactResult,
    onContactResultChange,
    contactNotes,
    onContactNotesChange,
    contactEffectiveAt,
    onContactEffectiveAtChange,
    contactError,
    canRegisterContact = true,
    followUpDate,
    onFollowUpDateChange,
    onRegisterContactAttempt,
    isRegisteringContactAttempt,
    comments,
    timeline,
    showCommercialContactForm = true,
}: LeadTimelineSectionProps) {
    const [historyFilter, setHistoryFilter] = useState<'all' | 'contact'>('all');
    const operationalTimeline = timeline.filter((event) => event.type !== 'comment' && (historyFilter === 'all' || event.type === 'contact_attempt'));
    const sortedTimeline = [...operationalTimeline].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const sortedComments = [...comments].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(280px,340px)] gap-5">
            <div className="space-y-5 min-w-0">
                {showCommercialContactForm && <LeadDetailSection
                    id="lead-contact-attempt"
                    title="Atendimentos e follow-up"
                    description="Registre o que aconteceu e, se necessário, agende o próximo retorno."
                    icon={<PhoneCall size={18} />}
                >
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
                        onContactEffectiveAtChange={onContactEffectiveAtChange}
                        error={contactError}
                        canEdit={canRegisterContact}
                        followUpDate={followUpDate}
                        onFollowUpDateChange={onFollowUpDateChange}
                        onSubmit={onRegisterContactAttempt}
                        isSubmitting={isRegisteringContactAttempt}
                        notesId="lead-contact-notes"
                    />
                </LeadDetailSection>}

                <LeadDetailSection
                    title="Comentários"
                    description="Anotações internas da equipe sobre este lead."
                    icon={<MessageSquare size={18} />}
                    badge={
                        sortedComments.length > 0 ? (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                {sortedComments.length}
                            </span>
                        ) : undefined
                    }
                >
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <textarea
                                value={newComment}
                                onChange={(e) => onCommentChange(e.target.value)}
                                placeholder="Escreva uma atualização sobre este lead..."
                                rows={3}
                                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-salesforce-blue/20 focus:border-salesforce-blue outline-none resize-none text-sm bg-white"
                            />
                            <button
                                type="button"
                                onClick={onAddComment}
                                disabled={!newComment.trim()}
                                className="px-4 py-2.5 bg-salesforce-blue text-white rounded-lg hover:bg-salesforce-hover transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 sm:self-end focus:outline-none focus-visible:ring-2 focus-visible:ring-salesforce-blue/40"
                            >
                                <Send size={16} />
                                Enviar
                            </button>
                        </div>

                        {sortedComments.length > 0 ? (
                            <ul className="divide-y divide-gray-100 border-t border-gray-100 pt-2">
                                {sortedComments.map((comment) => (
                                    <li key={comment.id} className="flex gap-3 py-4 first:pt-2">
                                        <UserAvatar
                                            name={comment.userName}
                                            initials={comment.userInitials}
                                            className="w-9 h-9 text-xs shrink-0"
                                            fallbackClassName="bg-salesforce-blue"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-1">
                                                <span className="font-semibold text-gray-900 text-sm">
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
                                            <p className="text-gray-700 text-sm whitespace-pre-wrap">
                                                {comment.text}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-500 py-2">
                                Nenhum comentário ainda. Use o campo acima para registrar observações.
                            </p>
                        )}
                    </div>
                </LeadDetailSection>
            </div>

            <LeadDetailSection
                title="Linha do tempo"
                description="Mudanças de etapa, status e eventos da jornada."
                icon={<Clock size={18} />}
                badge={
                    sortedTimeline.length > 0 ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                            {sortedTimeline.length}
                        </span>
                    ) : undefined
                }
            >
                <div className="space-y-0">
                    {showCommercialContactForm && <div className="flex flex-wrap gap-2 mb-4" aria-label="Filtrar histórico">
                        {([['all', 'Todos os eventos'], ['contact', 'Atendimentos']] as const).map(([value, label]) => (
                            <button key={value} type="button" aria-pressed={historyFilter === value}
                                onClick={() => setHistoryFilter(value)}
                                className={`rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 ${historyFilter === value ? 'border-salesforce-blue bg-blue-50 text-blue-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                                {label}
                            </button>
                        ))}
                    </div>}
                    {sortedTimeline.length > 0 ? (
                        <ol className="relative">
                            {sortedTimeline.map((event, index) => (
                                <li key={event.id} className="flex gap-3 pb-5 last:pb-0">
                                    <div className="relative flex flex-col items-center">
                                        <div className="w-7 h-7 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center shrink-0 z-10">
                                            {getTimelineIcon(event.type)}
                                        </div>
                                        {index < sortedTimeline.length - 1 ? (
                                            <div
                                                className="absolute top-7 bottom-0 w-px bg-gray-200"
                                                aria-hidden
                                            />
                                        ) : null}
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                                                {getLeadTimelineTypeLabel(event.type)}
                                            </span>
                                            {getLeadTimelineSourceLabel(event) ? (
                                                <span className="text-xs text-gray-500">
                                                    {getLeadTimelineSourceLabel(event)}
                                                </span>
                                            ) : null}
                                        </div>
                                        <p className="text-sm text-gray-900 font-medium leading-snug whitespace-pre-wrap break-words">
                                            {event.description}
                                        </p>
                                        {event.type === 'contact_attempt' && typeof event.metadata?.followUpDate === 'string' && (
                                            <p className="text-xs text-blue-800 mt-2">Próximo follow-up: {new Date(event.metadata.followUpDate).toLocaleString('pt-BR')}. Data combinada neste registro; consulte a agenda para o status atual.</p>
                                        )}
                                        {event.type === 'contact_attempt' && typeof event.metadata?.recordedAt === 'string' && (
                                            <p className="text-xs text-gray-600 mt-1">Lançado no sistema em {new Date(event.metadata.recordedAt).toLocaleString('pt-BR')}.</p>
                                        )}
                                        {event.type === 'department_handoff' && event.metadata?.dueAt ? (
                                            <p className="text-xs text-indigo-700 mt-1.5">
                                                Prazo do atendimento:{' '}
                                                {formatDate(String(event.metadata.dueAt))} às{' '}
                                                {new Date(String(event.metadata.dueAt)).toLocaleTimeString(
                                                    'pt-BR',
                                                    { hour: '2-digit', minute: '2-digit' },
                                                )}
                                            </p>
                                        ) : null}
                                        {event.type === 'department_handoff' && event.metadata?.summary ? (
                                            <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">
                                                Resumo para contrato: {String(event.metadata.summary)}
                                            </p>
                                        ) : null}
                                        <p className="text-xs text-gray-500 mt-1.5">
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
                            title={historyFilter === 'contact' ? 'Nenhum atendimento registrado' : 'Nenhum evento registrado'}
                            description="Os registros aparecerão aqui com o detalhamento, a data do atendimento e seu autor."
                            compact
                        />
                    )}
                </div>
            </LeadDetailSection>
        </div>
    );
}
