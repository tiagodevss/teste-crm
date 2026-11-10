import React, { useMemo } from 'react';
import {
    Building,
    Phone,
    Mail,
    MapPin,
    Calendar,
    FileText,
    User,
    AlertTriangle,
    Clock,
    UserCheck,
} from 'lucide-react';
import { formatDate, formatCurrency, formatPhone } from '../../../utils/formatters';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { ClientInfoItem } from './ClientSectionCard';

const DEFAULT_INACTIVE_DAYS = 30;

export interface ClientInfoCardProps {
    client: {
        id: string;
        name: string;
        company?: string;
        phone?: string;
        email?: string;
        address?: string;
        city?: string;
        ramo?: string;
        cpfCnpj?: string;
        createdAt?: string;
        lastContactDate?: string;
        lastActionAt?: string;
        lastActionDescription?: string;
        daysWithoutAction?: number | null;
        daysOpen?: number;
        responsibleUser?: { name: string; avatarInitials?: string; avatarUrl?: string | null };
        value?: number;
        productName?: string;
    };
}

function MetricCell({
    label,
    value,
    tone = 'neutral',
}: {
    label: string;
    value: React.ReactNode;
    tone?: 'neutral' | 'warning' | 'success';
}) {
    const toneClass =
        tone === 'warning'
            ? 'border-amber-200 bg-amber-50/60'
            : tone === 'success'
              ? 'border-emerald-200 bg-emerald-50/60'
              : 'border-gray-200 bg-gray-50/80';

    return (
        <div className={`rounded-lg border px-3 py-2.5 ${toneClass}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">{value}</p>
        </div>
    );
}

export function ClientInfoCard({ client }: ClientInfoCardProps) {
    const lastActionDate = client.lastActionAt ?? client.lastContactDate;
    const daysWithoutAction = client.daysWithoutAction;
    const needsFollowUp =
        daysWithoutAction != null && daysWithoutAction >= DEFAULT_INACTIVE_DAYS;

    const clientStatusLabel = useMemo(() => {
        if (needsFollowUp) return 'Repescagem';
        return 'Cliente ativo';
    }, [needsFollowUp]);

    const statusTone = needsFollowUp
        ? 'bg-amber-50 text-amber-800 border-amber-200'
        : 'bg-emerald-50 text-emerald-800 border-emerald-200';

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-5 md:px-6 md:py-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                        {client.responsibleUser ? (
                            <UserAvatar
                                name={client.responsibleUser.name}
                                initials={client.responsibleUser.avatarInitials}
                                avatarUrl={client.responsibleUser.avatarUrl}
                                size="md"
                                className="h-14 w-14 shrink-0"
                            />
                        ) : (
                            <div
                                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-base font-semibold text-gray-600"
                                aria-hidden
                            >
                                {client.name.substring(0, 2).toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <h1 className="text-xl font-bold tracking-tight text-gray-900 md:text-2xl">
                                {client.name}
                            </h1>
                            {client.company ? (
                                <p className="mt-1 truncate text-sm text-gray-600">{client.company}</p>
                            ) : null}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span
                                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold ${statusTone}`}
                                >
                                    <UserCheck size={12} aria-hidden />
                                    {clientStatusLabel}
                                </span>
                                {needsFollowUp ? (
                                    <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                                        <AlertTriangle size={12} aria-hidden />
                                        {daysWithoutAction}d sem ação
                                    </span>
                                ) : null}
                                {client.responsibleUser ? (
                                    <span className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800">
                                        Resp.: {client.responsibleUser.name}
                                    </span>
                                ) : null}
                                {client.productName ? (
                                    <span className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                                        {client.productName}
                                    </span>
                                ) : null}
                            </div>
                            {client.lastActionDescription ? (
                                <p className="mt-2 text-sm text-gray-600">
                                    <span className="font-medium text-gray-700">Última ação:</span>{' '}
                                    {client.lastActionDescription}
                                </p>
                            ) : null}
                        </div>
                    </div>

                    {client.value !== undefined && client.value > 0 ? (
                        <div className="shrink-0 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 lg:min-w-[160px]">
                            <p className="text-xs font-semibold text-gray-500">Valor registrado</p>
                            <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
                                {formatCurrency(client.value)}
                            </p>
                        </div>
                    ) : null}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <MetricCell
                        label="Última ação"
                        value={lastActionDate ? formatDate(lastActionDate) : '—'}
                        tone={needsFollowUp ? 'warning' : 'neutral'}
                    />
                    <MetricCell
                        label="Dias s/ ação"
                        value={daysWithoutAction != null ? `${daysWithoutAction}d` : '—'}
                        tone={needsFollowUp ? 'warning' : 'neutral'}
                    />
                    <MetricCell
                        label="Cliente desde"
                        value={client.createdAt ? formatDate(client.createdAt) : '—'}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 divide-y divide-gray-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                <div className="px-5 py-5 md:px-6">
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <Phone size={16} className="text-salesforce-blue" aria-hidden />
                        Contato
                    </h2>
                    <ClientInfoItem
                        icon={Phone}
                        label="Telefone"
                        value={client.phone ? formatPhone(client.phone) : undefined}
                        href={client.phone ? `tel:${client.phone.replace(/\D/g, '')}` : undefined}
                    />
                    <ClientInfoItem
                        icon={Mail}
                        label="E-mail"
                        value={client.email}
                        href={client.email ? `mailto:${client.email}` : undefined}
                    />
                    <ClientInfoItem icon={MapPin} label="Cidade" value={client.city} />
                    <ClientInfoItem icon={MapPin} label="Endereço" value={client.address} />
                </div>

                <div className="px-5 py-5 md:px-6">
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <Building size={16} className="text-salesforce-blue" aria-hidden />
                        Cadastro
                    </h2>
                    <ClientInfoItem icon={User} label="Responsável" value={client.responsibleUser?.name} />
                    <ClientInfoItem icon={Building} label="Empresa" value={client.company} />
                    <ClientInfoItem icon={Building} label="Ramo" value={client.ramo} />
                    <ClientInfoItem icon={FileText} label="CPF/CNPJ" value={client.cpfCnpj} />
                    <ClientInfoItem
                        icon={Calendar}
                        label="Cliente desde"
                        value={client.createdAt ? formatDate(client.createdAt) : undefined}
                    />
                    {client.daysOpen != null ? (
                        <ClientInfoItem
                            icon={Clock}
                            label="Tempo de carteira"
                            value={`${client.daysOpen} dias`}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
}
