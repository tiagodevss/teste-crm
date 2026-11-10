import React from 'react';

export interface ClientSectionCardProps {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    action?: React.ReactNode;
    id?: string;
    className?: string;
}

export function ClientSectionCard({
    title,
    icon: Icon,
    children,
    action,
    id,
    className = '',
}: ClientSectionCardProps) {
    return (
        <section
            id={id}
            className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}
        >
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/80 px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-2">
                    <Icon size={18} className="shrink-0 text-salesforce-blue" aria-hidden />
                    <h2 className="truncate text-sm font-semibold text-gray-800">{title}</h2>
                </div>
                {action ? <div className="shrink-0">{action}</div> : null}
            </div>
            <div className="p-5">{children}</div>
        </section>
    );
}

export interface ClientInfoItemProps {
    icon: React.ElementType;
    label: string;
    value?: string | number | null;
    href?: string;
    hrefType?: 'tel' | 'mailto' | 'external';
}

export function ClientInfoItem({
    icon: Icon,
    label,
    value,
    href,
    hrefType,
}: ClientInfoItemProps) {
    if (value === undefined || value === null || value === '') return null;

    const displayValue = String(value);
    const linkClass =
        'font-medium text-salesforce-blue hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-salesforce-blue/30 rounded';

    return (
        <div className="flex gap-3 border-b border-gray-100 py-2.5 first:pt-0 last:border-0 last:pb-0">
            <Icon size={18} className="mt-0.5 shrink-0 text-gray-400" aria-hidden />
            <div className="min-w-0 flex-1">
                <p className="mb-0.5 text-xs font-semibold text-gray-600">{label}</p>
                {href ? (
                    <a
                        href={href}
                        className={`break-words text-sm ${linkClass}`}
                        {...(hrefType === 'external'
                            ? { target: '_blank', rel: 'noopener noreferrer' }
                            : {})}
                    >
                        {displayValue}
                    </a>
                ) : (
                    <p className="break-words text-sm text-gray-800">{displayValue}</p>
                )}
            </div>
        </div>
    );
}
