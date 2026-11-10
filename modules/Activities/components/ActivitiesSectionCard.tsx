import React from 'react';

interface ActivitiesSectionCardProps {
  id: string;
  title: string;
  count: number;
  description?: string;
  children: React.ReactNode;
}

export function ActivitiesSectionCard({
  id,
  title,
  count,
  description,
  children,
}: ActivitiesSectionCardProps) {
  return (
    <section
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[12rem]"
      aria-labelledby={id}
    >
      <header className="px-4 py-3 border-b border-gray-100 bg-gray-50/80 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={id} className="text-sm font-semibold text-gray-900">
            {title}
          </h3>
          {description ? (
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
          ) : null}
        </div>
        <span
          className="shrink-0 inline-flex items-center justify-center min-w-[1.75rem] h-7 px-2 rounded-md bg-white border border-gray-200 text-xs font-semibold text-gray-700 tabular-nums"
          aria-label={`${count} itens`}
        >
          {count}
        </span>
      </header>
      <div className="flex-1">{children}</div>
    </section>
  );
}
