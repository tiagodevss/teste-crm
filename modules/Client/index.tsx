import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserX, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { LeadComment, ContactActivityType, ContactChannel, ContactResult } from '../../types';
import { useUserStore, useCRMStore } from './store';
import { ClientDetailSkeleton } from '../../components/ui/Skeletons';
import { AppPath } from '../../routes';
import { useClientDetail, useClientDetailForms } from './hooks';
import { useAuthorization } from '../../hooks/useAuthorization';
import { PermissionFeedback } from '../../components/authorization/PermissionFeedback';
import { CadastralListFetchError } from '../../components/cadastral';
import { ClientsHelpPanel } from '../Clients/components/ClientsHelpPanel';
import {
    ClientHeader,
    ClientInfoCard,
    ClientTimelineSection,
    EditClientModal,
} from './components';

export const ClientDetail: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useUserStore();
    const { updateLead } = useCRMStore();
    const { hasActionPermission } = useAuthorization();
    const canEditClient = hasActionPermission('clients.manage') || hasActionPermission('crm.manage');

    const {
        clientDetail,
        isDetailLoading,
        detailError,
        clientId,
        fetchClientById,
    } = useClientDetail();

    const [newComment, setNewComment] = useState('');
    const [isCommentSaving, setIsCommentSaving] = useState(false);
    const [contactType, setContactType] = useState<ContactActivityType>('ligacao_realizada');
    const [contactChannel, setContactChannel] = useState<ContactChannel>('telefone');
    const [contactResult, setContactResult] = useState<ContactResult>('sucesso');
    const [contactNotes, setContactNotes] = useState('');
    const [followUpDate, setFollowUpDate] = useState('');
    const [contactEffectiveAt] = useState(() => new Date().toISOString());
    const [isRegisteringContactAttempt, setIsRegisteringContactAttempt] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const forms = useClientDetailForms({
        clientDetail,
        fetchClientById,
        isEditModalOpen,
        onEditModalClose: () => setIsEditModalOpen(false),
    });

    const scrollToContactForm = useCallback(() => {
        document.getElementById('client-contact-attempt')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
        window.setTimeout(() => {
            document.getElementById('client-contact-notes')?.focus();
        }, 350);
    }, []);

    const handleRegisterContactAttempt = async () => {
        if (!clientDetail || !user || isRegisteringContactAttempt) return;
        setIsRegisteringContactAttempt(true);
        try {
            await updateLead(clientDetail.id, {
                contactAttempt: {
                    type: contactType,
                    channel: contactChannel,
                    result: contactResult,
                    notes: contactNotes.trim() || undefined,
                    contactDate: contactEffectiveAt,
                    followUpDate: followUpDate ? new Date(followUpDate).toISOString() : undefined,
                    userId: user.id,
                    userName: user.name,
                },
            });
            await fetchClientById(clientDetail.id);
            setContactNotes('');
            setFollowUpDate('');
            toast.success('Contato registrado com sucesso.');
        } catch {
            toast.error('Não foi possível registrar o contato. Tente novamente.');
        } finally {
            setIsRegisteringContactAttempt(false);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !clientDetail || !user || isCommentSaving) return;
        setIsCommentSaving(true);
        try {
            const comment: LeadComment = {
                id: `comment-${Date.now()}`,
                text: newComment,
                date: new Date().toISOString(),
                userId: user.id,
                userName: user.name,
                userInitials: user.avatarInitials,
            };
            await updateLead(clientDetail.id, {
                comments: [...(clientDetail.comments || []), comment],
            });
            await fetchClientById(clientDetail.id);
            setNewComment('');
            toast.success('Comentário adicionado.');
        } catch {
            toast.error('Não foi possível salvar o comentário. Tente novamente.');
        } finally {
            setIsCommentSaving(false);
        }
    };

    if (isDetailLoading && !clientDetail && !detailError) return <ClientDetailSkeleton />;

    if (detailError) {
        return (
            <div className="space-y-6">
                <CadastralListFetchError
                    title="Não foi possível carregar o cliente"
                    message={detailError}
                    onRetry={() => clientId && void fetchClientById(clientId)}
                />
            </div>
        );
    }

    if (!clientDetail) {
        return (
            <div
                className="flex items-center justify-center min-h-[70vh] px-4"
                role="status"
                aria-live="polite"
                aria-label="Cliente não encontrado"
            >
                <div className="w-full max-w-md text-center">
                    <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm">
                        <div
                            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400"
                            aria-hidden
                        >
                            <UserX size={40} strokeWidth={1.5} />
                        </div>
                        <h1 className="text-xl font-semibold text-gray-900">
                            Cliente não encontrado
                        </h1>
                        <p className="mt-2 text-sm leading-relaxed text-gray-500">
                            O cliente solicitado não existe ou você não tem permissão para acessá-lo.
                            Verifique o ID na URL ou retorne à lista de clientes.
                        </p>
                        <button
                            type="button"
                            onClick={() => navigate(AppPath.CLIENTS)}
                            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-salesforce-blue px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-salesforce-hover focus:outline-none focus:ring-2 focus:ring-salesforce-blue/30 focus:ring-offset-2"
                        >
                            <ArrowLeft size={18} />
                            Voltar para Clientes
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-5 pb-10 md:space-y-6">
            <ClientHeader
                onBack={() => navigate(AppPath.CLIENTS)}
                onEdit={() => setIsEditModalOpen(true)}
                onRegisterContact={scrollToContactForm}
                canEdit={canEditClient}
                clientName={clientDetail.name}
                phone={clientDetail.phone}
                email={clientDetail.email}
            />
            {!canEditClient && (
                <PermissionFeedback message="Você não tem permissão para editar dados deste cliente. Solicite acesso ao administrador." />
            )}
            <ClientInfoCard client={clientDetail} />
            <ClientsHelpPanel variant="detail" />
            <ClientTimelineSection
                contactType={contactType}
                onContactTypeChange={setContactType}
                contactChannel={contactChannel}
                onContactChannelChange={setContactChannel}
                contactResult={contactResult}
                onContactResultChange={setContactResult}
                contactNotes={contactNotes}
                onContactNotesChange={setContactNotes}
                contactEffectiveAt={contactEffectiveAt}
                followUpDate={followUpDate}
                onFollowUpDateChange={setFollowUpDate}
                onRegisterContactAttempt={handleRegisterContactAttempt}
                isRegisteringContactAttempt={isRegisteringContactAttempt}
                newComment={newComment}
                onCommentChange={setNewComment}
                onAddComment={handleAddComment}
                isCommentSaving={isCommentSaving}
                comments={clientDetail.comments ?? []}
                timeline={clientDetail.timeline ?? []}
            />
            <EditClientModal
                isOpen={isEditModalOpen && canEditClient}
                onClose={() => setIsEditModalOpen(false)}
                onSubmit={forms.editForm.handleSubmit(forms.editForm.handleSaveEdit)}
                register={forms.editForm.register}
                control={forms.editForm.control}
                errors={forms.editForm.errors}
                isSubmitting={forms.editForm.formState.isSubmitting}
            />
        </div>
    );
};
