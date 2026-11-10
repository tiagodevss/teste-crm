import React from 'react';
import { ArrowLeft, Edit2, Phone, Mail, MessageSquare } from 'lucide-react';
import { formatPhone } from '../../../utils/formatters';

export interface ClientHeaderProps {
    onBack: () => void;
    onEdit: () => void;
    onRegisterContact: () => void;
    canEdit?: boolean;
    clientName?: string;
    phone?: string;
    email?: string;
}

export function ClientHeader({
    onBack,
    onEdit,
    onRegisterContact,
    canEdit = true,
    clientName,
    phone,
    email,
}: ClientHeaderProps) {
    const telHref = phone ? `tel:${phone.replace(/\D/g, '')}` : undefined;
    const mailHref = email ? `mailto:${email}` : undefined;

    return (
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-1">
                <button
                    type="button"
                    onClick={onBack}
                    className="group inline-flex items-center rounded-lg text-sm font-medium text-gray-500 transition-colors hover:text-salesforce-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-salesforce-blue/30"
                >
                    <span
                        className="mr-2 rounded-lg border border-gray-200 bg-white p-1.5 shadow-sm transition-colors group-hover:border-salesforce-blue"
                        aria-hidden
                    >
                        <ArrowLeft size={16} />
                    </span>
                    Voltar para Clientes
                </button>
                {clientName ? (
                    <p className="truncate pl-0.5 text-xs text-gray-500 lg:hidden" aria-hidden>
                        {clientName}
                    </p>
                ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {telHref ? (
                    <a
                        href={telHref}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-salesforce-blue/30"
                    >
                        <Phone size={16} aria-hidden />
                        <span className="hidden sm:inline">{formatPhone(phone!)}</span>
                        <span className="sm:hidden">Ligar</span>
                    </a>
                ) : null}
                {mailHref ? (
                    <a
                        href={mailHref}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-salesforce-blue/30"
                    >
                        <Mail size={16} aria-hidden />
                        <span className="hidden sm:inline">E-mail</span>
                        <span className="sm:hidden">E-mail</span>
                    </a>
                ) : null}
                <button
                    type="button"
                    onClick={onRegisterContact}
                    className="inline-flex items-center gap-2 rounded-lg bg-salesforce-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-salesforce-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-salesforce-blue/40"
                >
                    <MessageSquare size={16} aria-hidden />
                    Registrar contato
                </button>
                <button
                    type="button"
                    onClick={onEdit}
                    disabled={!canEdit}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-salesforce-blue/30 disabled:cursor-not-allowed disabled:opacity-50"
                    title={canEdit ? undefined : 'Sem permissão para editar cliente'}
                >
                    <Edit2 size={16} aria-hidden />
                    Editar
                </button>
            </div>
        </header>
    );
}
