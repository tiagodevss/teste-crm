import React from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Video,
} from 'lucide-react';
import type { LeadAppointment } from '../../../types';
import {
  APPOINTMENT_CHANNEL_LABEL,
  APPOINTMENT_STATUS_CLASS,
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_TYPE_LABEL,
} from '../constants';
import { getLeadDetailPath, getProspectDetailPath } from '../../../routes';
import {
  ACTIVITIES_FOCUS_RING,
  APPOINTMENT_TYPE_CHIP_CLASS,
  ROW_ACTION_BUTTON_CLASS,
} from '../activitiesUi';

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
  return item.lead?.name ?? item.prospect?.name ?? 'Sem vínculo';
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ChannelIcon({ channel }: { channel: string }) {
  const props = { size: 14, strokeWidth: 2, 'aria-hidden': true } as const;
  if (channel === 'phone') return <Phone {...props} />;
  if (channel === 'video_call') return <Video {...props} />;
  if (channel === 'in_person') return <MapPin {...props} />;
  if (channel === 'whatsapp') return <MessageCircle {...props} />;
  if (channel === 'email') return <Mail {...props} />;
  return null;
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
  layout?: 'list' | 'timeline';
}

interface ActivityActionsProps {
  item: LeadAppointment;
  typeLabel: string;
  onComplete?: (item: LeadAppointment) => void;
  onEdit?: (item: LeadAppointment) => void;
  onStatusChange?: (
    item: LeadAppointment,
    status: 'canceled' | 'no_show',
    label: string,
  ) => void;
  canComplete: boolean;
  isCompleting: boolean;
  isMutating: boolean;
  direction?: 'row' | 'column';
}

function ActivityActions({
  item,
  typeLabel,
  onComplete,
  onEdit,
  onStatusChange,
  canComplete,
  isCompleting,
  isMutating,
  direction = 'row',
}: ActivityActionsProps) {
  const isScheduled = item.status === 'scheduled';
  if (!isScheduled) return null;
  const rowBusy = isCompleting || isMutating;
  const showComplete = canComplete && onComplete;
  const showActions = onEdit || onStatusChange;
  if (!showComplete && !showActions) return null;

  return (
    <div
      className={
        direction === 'column'
          ? 'flex shrink-0 flex-col justify-center gap-1.5'
          : 'flex flex-wrap items-center gap-2'
      }
    >
      {onEdit ? (
        <button
          type="button"
          onClick={() => onEdit(item)}
          disabled={rowBusy}
          className={`${ROW_ACTION_BUTTON_CLASS} text-slate-700 bg-white border-slate-200 hover:bg-slate-50`}
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
          className={`${ROW_ACTION_BUTTON_CLASS} text-emerald-800 bg-emerald-50 border-emerald-200 hover:bg-emerald-100`}
        >
          <CheckCircle2 size={14} aria-hidden />
          Concluir
        </button>
      ) : null}
      {onStatusChange ? (
        <>
          <button
            type="button"
            disabled={rowBusy}
            onClick={() => onStatusChange(item, 'no_show', 'Não compareceu')}
            className={`${ROW_ACTION_BUTTON_CLASS} text-amber-900 bg-amber-50 border-amber-200 hover:bg-amber-100`}
          >
            Não veio
          </button>
          <button
            type="button"
            disabled={rowBusy}
            onClick={() => onStatusChange(item, 'canceled', 'Cancelar atividade')}
            className={`${ROW_ACTION_BUTTON_CLASS} text-rose-800 bg-rose-50 border-rose-200 hover:bg-rose-100`}
          >
            Cancelar
          </button>
        </>
      ) : null}
    </div>
  );
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
  layout = 'list',
}) => {
  const target = getAppointmentNavigationTarget(item);
  const isClickable = Boolean(target);
  const typeLabel = APPOINTMENT_TYPE_LABEL[item.type] ?? item.type;
  const channelLabel = APPOINTMENT_CHANNEL_LABEL[item.channel] ?? item.channel;
  const typeChipClass =
    APPOINTMENT_TYPE_CHIP_CLASS[item.type] ?? 'bg-gray-50 text-gray-700 border-gray-200';
  const statusClass =
    APPOINTMENT_STATUS_CLASS[item.status] ?? 'bg-gray-50 text-gray-600 border-gray-200';

  const activityContent = (
    <button
      type="button"
      onClick={() => target && onNavigate(target.path)}
      disabled={!isClickable}
      aria-label={target?.label ?? `${typeLabel}: ${getActivityTitle(item)}`}
      className={`group/target min-w-0 flex-1 text-left ${ACTIVITIES_FOCUS_RING} rounded-lg ${
        isClickable ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md border ${typeChipClass}`}
            >
              {typeLabel}
            </span>
            {channelLabel ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                <ChannelIcon channel={item.channel} />
                {channelLabel}
              </span>
            ) : null}
            <span
              className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md border ${statusClass}`}
            >
              {APPOINTMENT_STATUS_LABEL[item.status] ?? item.status}
            </span>
          </div>

          <p className="truncate text-[15px] font-semibold text-slate-950">
            {getActivityTitle(item)}
          </p>

          {showFullDateTime ? (
            <p className="text-sm text-slate-500 tabular-nums">{formatDateTime(item.scheduledAt)}</p>
          ) : null}

          {item.notes ? (
            <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">{item.notes}</p>
          ) : null}

          {!isClickable ? (
            <p className="text-xs text-slate-400">Atividade sem vínculo com lead ou prospecção</p>
          ) : null}
        </div>

        {isClickable ? (
          <ExternalLink
            size={16}
            className="mt-0.5 shrink-0 text-slate-300 transition-colors group-hover/target:text-salesforce-blue"
            aria-hidden
          />
        ) : null}
      </div>
    </button>
  );

  if (layout === 'timeline') {
    return (
      <li className="relative grid grid-cols-[4rem_minmax(0,1fr)] gap-3 sm:grid-cols-[4.75rem_minmax(0,1fr)] sm:gap-4">
        <div className="relative flex justify-center pt-4">
          <span
            className="absolute bottom-[-1.25rem] top-7 left-1/2 w-px -translate-x-1/2 bg-slate-200"
            aria-hidden
          />
          <span
            className={`absolute left-1/2 top-[1.35rem] z-10 h-2.5 w-2.5 -translate-x-1/2 rounded-full ring-4 ring-white ${
              highlightUrgent ? 'bg-rose-500' : 'bg-blue-500'
            }`}
            aria-hidden
          />
          {showTime ? (
            <time
              dateTime={item.scheduledAt}
              className={`relative z-20 mt-6 rounded-md px-2 py-1 text-xs font-bold tabular-nums ring-1 ring-inset ${
                highlightUrgent
                  ? 'bg-rose-50 text-rose-700 ring-rose-100'
                  : 'bg-blue-50 text-blue-700 ring-blue-100'
              }`}
            >
              {formatTime(item.scheduledAt)}
            </time>
          ) : null}
        </div>

        <article
          className={`rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5 ${
            highlightUrgent ? 'border-rose-200' : 'border-slate-200'
          }`}
        >
          {activityContent}
          {item.status === 'scheduled' && (onEdit || onStatusChange || (canComplete && onComplete)) ? (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <ActivityActions
                item={item}
                typeLabel={typeLabel}
                onComplete={onComplete}
                onEdit={onEdit}
                onStatusChange={onStatusChange}
                canComplete={canComplete}
                isCompleting={isCompleting}
                isMutating={isMutating}
              />
            </div>
          ) : null}
        </article>
      </li>
    );
  }

  return (
    <li
      className={`group flex items-stretch transition-colors ${
        highlightUrgent ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-slate-50/80'
      }`}
    >
      {showTime ? (
        <div className="flex w-[4.5rem] shrink-0 items-center justify-center border-r border-slate-100 bg-slate-50/50 py-3">
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

      <div className="flex min-w-0 flex-1 px-4 py-3">{activityContent}</div>

      {item.status === 'scheduled' && (onEdit || onStatusChange || (canComplete && onComplete)) ? (
        <div className="flex shrink-0 items-center border-l border-slate-100 px-2 py-2">
          <ActivityActions
            item={item}
            typeLabel={typeLabel}
            onComplete={onComplete}
            onEdit={onEdit}
            onStatusChange={onStatusChange}
            canComplete={canComplete}
            isCompleting={isCompleting}
            isMutating={isMutating}
            direction="column"
          />
        </div>
      ) : null}
    </li>
  );
};
