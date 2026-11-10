import React from 'react';

export interface LeadDetailSectionProps {
    id?: string;
    title: string;
    description?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
    badge?: React.ReactNode;
    children: React.ReactNode;
    variant?: 'default' | 'subtle';
}

export function LeadDetailSection({
    id,
    title,
    description,
    icon,
    action,
    badge,
    children,
    variant = 'default',
}: LeadDetailSectionProps) {
    const surfaceClass =
        variant === 'subtle'
            ? 'bg-gray-50/80 border-gray-200'
            : 'bg-white border-gray-200 shadow-sm';

    return (
        <section
            id={id}
            className={`rounded-xl border ${surfaceClass} overflow-hidden`}
        >
            <header className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
                <div className="flex items-start gap-3 min-w-0">
                    {icon ? (
                        <div className="shrink-0 w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                            {icon}
                        </div>
                    ) : null}
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-bold text-gray-900">{title}</h2>
                            {badge}
                        </div>
                        {description ? (
                            <p className="text-sm text-gray-600 mt-0.5">{description}</p>
                        ) : null}
                    </div>
                </div>
                {action ? <div className="shrink-0">{action}</div> : null}
            </header>
            <div className="px-5 py-4">{children}</div>
        </section>
    );
}
