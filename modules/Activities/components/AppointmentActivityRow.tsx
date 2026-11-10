import React from 'react';
import { CheckCircle2, ExternalLink, Pencil } from 'lucide-react';
import { LeadAppointment } from '../../../types';
import {
  APPOINTMENT_STATUS_CLASS,
  APPOINTMENT_STATUS_LABEL,
} from '../constants';
import { getLeadDetailPath, getProspectDetailPath } from '../../../routes';
import {
  APPOINTMENT_CHANNEL_LABEL,
  APPOINTMENT_TYPE_LABEL,
} from '../constants';
import { ACTIVITIES_FOCUS_RING, APPOINTMENT_TYPE_CHIP_CLASS, ROW_ACTION_BUTTON_CLASS } from '../activitiesUi';

export function getAppointmentNavigationTarget(
  item: LeadAppointment,
): { path: string; label: string } | null {
  if (item.lead?.id) {
    return {
      path: getLeadDetailPath(item.lead.id),
      label: `Abrir lead ${item.lead.name}`,
    };
  }
  if (item.prospect?.id) {
    return {
      path: getProspectDetailPath(item.prospect.id),
      label: `Abrir prospecção ${item.prospect.name}`,
    };
  }
  return null;
}

function getActivityTitle(item: LeadAppointment) {
  const entityName = item.lead?.name ?? item.prospect?.name;
  return entityName ?? 'Sem vínculo';
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface AppointmentActivityRowProps {
  item: LeadAppointment;
  onNavigate: (path: string) => void;
  onComplete?: (item: LeadAppointment) => void;
  onEdit?: (item: LeadAppointment) => void;
  onStatusChange?: (
    item: LeadAppointment,
    status: 'canceled' | 'no_show',
    label: string,
  ) => void;
  canComplete?: boolean;
  isCompleting?: boolean;
  isMutating?: boolean;
  showTime?: boolean;
  showFullDateTime?: boolean;
  formatDateTime: (value: string) => string;
  highlightUrgent?: boolean;
}

export const AppointmentActivityRow: React.FC<AppointmentActivityRowProps> = ({
  item,
  onNavigate,
  onComplete,
  onEdit,
  onStatusChange,
  canComplete = false,
  isCompleting = false,
  isMutating = false,
  showTime = false,
  showFullDateTime = false,
  formatDateTime,
  highlightUrgent = false,
}) => {
  const target = getAppointmentNavigationTarget(item);
  const isClickable = Boolean(target);
  const isScheduled = item.status === 'scheduled';
  const rowBusy = isCompleting || isMutating;
  const showComplete = canComplete && isScheduled && onComplete;
  const showActions = isScheduled && (onEdit || onStatusChange);
  const typeLabel = APPOINTMENT_TYPE_LABEL[item.type] ?? item.type;
  const channelLabel = APPOINTMENT_CHANNEL_LABEL[item.channel] ?? item.channel;
  const typeChipClass =
    APPOINTMENT_TYPE_CHIP_CLASS[item.type] ?? 'bg-gray-50 text-gray-700 border-gray-200';


  return (
    <li
      className={`group flex items-stretch transition-colors ${
        highlightUrgent ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-gray-50/80'
      }`}
    >
      {showTime ? (
        <div className="w-[4.5rem] shrink-0 flex items-center justify-center border-r border-gray-100 bg-gray-50/50 py-3">
          <time
            dateTime={item.scheduledAt}
            className={`text-sm font-semibold tabular-nums ${
              highlightUrgent ? 'text-amber-900' : 'text-salesforce-blue'
            }`}
          >
            {formatTime(item.scheduledAt)}
          </time>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => target && onNavigate(target.path)}
        disabled={!isClickable}
        aria-label={target?.label ?? `${typeLabel}: ${getActivityTitle(item)}`}
        className={`flex-1 min-w-0 px-4 py-3 flex items-start gap-3 text-left ${ACTIVITIES_FOCUS_RING} ${
          isClickable ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md border ${typeChipClass}`}
            >
              {typeLabel}
            </span>
            {channelLabel ? (
              <span className="text-xs text-gray-500">{channelLabel}</span>
            ) : null}
            <span
              className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md border ml-auto sm:ml-0 ${
                APPOINTMENT_STATUS_CLASS[item.status] ?? 'bg-gray-50 text-gray-600 border-gray-200'
              }`}
            >
              {APPOINTMENT_STATUS_LABEL[item.status] ?? item.status}
            </span>
          </div>

          <p className="font-medium text-gray-900 truncate">{getActivityTitle(item)}</p>

          {showFullDateTime ? (
            <p className="text-sm text-gray-500 tabular-nums">{formatDateTime(item.scheduledAt)}</p>
          ) : null}

          {item.notes ? (
            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{item.notes}</p>
          ) : null}

          {!isClickable ? (
            <p className="text-xs text-gray-400">Atividade sem vínculo com lead ou prospecção</p>
          ) : null}
        </div>

        {isClickable ? (
          <ExternalLink
            size={16}
            className="shrink-0 mt-0.5 text-gray-300 group-hover:text-salesforce-blue transition-colors"
            aria-hidden
          />
        ) : null}
      </button>

      {showActions || showComplete ? (
        <div className="shrink-0 flex flex-col justify-center gap-1.5 px-2 py-2 border-l border-gray-100 min-w-[6.5rem] sm:min-w-[7.5rem]">
          {onEdit ? (
            <button
              type="button"
              onClick={() => onEdit(item)}
              disabled={rowBusy}
              className={`${ROW_ACTION_BUTTON_CLASS} text-gray-700 bg-white border-gray-200 hover:bg-gray-50`}
            >
              <Pencil size={14} aria-hidden />
              Reagendar
            </button>
          ) : null}
          {showComplete ? (
            <button
              type="button"
              onClick={() => onComplete(item)}
              disabled={isCompleting || rowBusy}
              aria-label={`Marcar atividade ${typeLabel} · ${getActivityTitle(item)} como concluída`}
              aria-busy={isCompleting}
              className={`${ROW_ACTION_BUTTON_CLASS} text-emerald-800 bg-emerald-50 border-emerald-100 hover:bg-emerald-100`}
            >
              <CheckCircle2 size={14} aria-hidden />
              Concluir
            </button>
          ) : null}
          {onStatusChange ? (
            <>
              <details className="sm:hidden">
                <summary
                  className={`list-none cursor-pointer text-xs font-semibold text-gray-600 text-center px-2 py-1 rounded-md border border-gray-200 ${ACTIVITIES_FOCUS_RING}`}
                >
                  Mais
                </summary>
                <div className="mt-1 flex flex-col gap-1">
                  <button
                    type="button"
                    disabled={rowBusy}
                    onClick={() => onStatusChange(item, 'no_show', 'Não compareceu')}
                    className={`${ROW_ACTION_BUTTON_CLASS} text-amber-900 bg-amber-50 border-amber-100 hover:bg-amber-100`}
                  >
                    Não veio
                  </button>
                  <button
                    type="button"
                    disabled={rowBusy}
                    onClick={() => onStatusChange(item, 'canceled', 'Cancelar atividade')}
                    className={`${ROW_ACTION_BUTTON_CLASS} text-red-800 bg-red-50 border-red-100 hover:bg-red-100`}
                  >
                    Cancelar
                  </button>
                </div>
              </details>
              <div className="hidden sm:flex sm:flex-col gap-1">
                <button
                  type="button"
                  disabled={rowBusy}
                  onClick={() => onStatusChange(item, 'no_show', 'Não compareceu')}
                  className={`${ROW_ACTION_BUTTON_CLASS} text-amber-900 bg-amber-50 border-amber-100 hover:bg-amber-100`}
                >
                  Não veio
                </button>
                <button
                  type="button"
                  disabled={rowBusy}
                  onClick={() => onStatusChange(item, 'canceled', 'Cancelar atividade')}
                  className={`${ROW_ACTION_BUTTON_CLASS} text-red-800 bg-red-50 border-red-100 hover:bg-red-100`}
                >
                  Cancelar
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </li>
  );
};
