import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Modal, ENTITY_FORM_MODAL_BODY_CLASS, ModalFooter, ModalHeader } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';
import { ModalFormCancelButton, ModalFormSubmitButton } from '../../../components/ui/ModalFormActions';
import { useActivitiesStore } from '../store';
import { useUserStore } from '../../Login/store/useUserStore';
import { api } from '../../../lib/axios';
import { LeadAppointment } from '../../../types';
import { APPOINTMENT_CHANNEL_LABEL, APPOINTMENT_TYPE_LABEL } from '../constants';
import { LeadSearchCombobox } from './LeadSearchCombobox';
import { useConfirmDialog } from '../../../components/ui/useConfirmDialog';
import { isPastDateTimeLocal } from '../activitiesHelpers';
import { ACTIVITIES_INPUT_CLASS } from '../activitiesUi';

export interface AppointmentFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  defaultOwnerUserId?: string;
  defaultLeadId?: string;
  defaultLeadName?: string;
  defaultScheduledAt?: string;
  appointment?: LeadAppointment | null;
}

interface FormErrors {
  scheduledAt?: string;
  ownerUserId?: string;
  leadId?: string;
}

const TYPE_OPTIONS = Object.entries(APPOINTMENT_TYPE_LABEL).map(([value, label]) => ({ value, label }));
const CHANNEL_OPTIONS = Object.entries(APPOINTMENT_CHANNEL_LABEL).map(([value, label]) => ({ value, label }));

const datetimeInputClass = (hasError: boolean) =>
  `block w-full py-2.5 px-3 ${ACTIVITIES_INPUT_CLASS}
  ${hasError
    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
    : ''
  }`;

const notesInputClass =
  `block w-full py-2.5 px-3 resize-y min-h-[88px] ${ACTIVITIES_INPUT_CLASS}`;

function defaultDateTimeLocal(isoDate?: string) {
  if (!isoDate) return '';
  const d = new Date(`${isoDate}T09:00:00`);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isoToDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const AppointmentFormModal: React.FC<AppointmentFormModalProps> = ({
  open,
  onClose,
  onSaved,
  defaultOwnerUserId,
  defaultLeadId,
  defaultLeadName,
  defaultScheduledAt,
  appointment = null,
}) => {
  const { createAppointment, updateAppointment, error: activitiesError } = useActivitiesStore();
  const { usersList, fetchUsers } = useUserStore();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const [type, setType] = useState('follow_up');
  const [channel, setChannel] = useState('phone');
  const [scheduledAt, setScheduledAt] = useState('');
  const [ownerUserId, setOwnerUserId] = useState(defaultOwnerUserId ?? '');
  const [leadId, setLeadId] = useState(defaultLeadId ?? '');
  const [leadDisplayName, setLeadDisplayName] = useState(defaultLeadName ?? '');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [leadLoading, setLeadLoading] = useState(false);
  const [dirty, setDirty] = useState(false);

  const isEditing = Boolean(appointment);
  const hasFixedLead = Boolean(defaultLeadId) || Boolean(appointment?.leadId);

  const resetForm = useCallback(() => {
    setType('follow_up');
    setChannel('phone');
    setScheduledAt(defaultDateTimeLocal(defaultScheduledAt));
    setOwnerUserId(defaultOwnerUserId ?? '');
    setLeadId(defaultLeadId ?? '');
    setLeadDisplayName(defaultLeadName ?? '');
    setNotes('');
    setErrors({});
    setLeadLoading(false);
    setDirty(false);
  }, [defaultOwnerUserId, defaultLeadId, defaultLeadName, defaultScheduledAt]);

  useEffect(() => {
    if (open) void fetchUsers({ page: 1, limit: 200 });
    if (!open) resetForm();
  }, [open, fetchUsers, resetForm]);

  useEffect(() => {
    if (!open) return;
    if (appointment) {
      setType(appointment.type);
      setChannel(appointment.channel);
      setScheduledAt(isoToDatetimeLocal(appointment.scheduledAt));
      setOwnerUserId(appointment.ownerUserId);
      setLeadId(appointment.leadId ?? appointment.lead?.id ?? '');
      const leadName = appointment.lead?.name ?? appointment.prospect?.name ?? '';
      const leadCompany = appointment.lead?.company;
      setLeadDisplayName(
        leadCompany && leadName ? `${leadName} · ${leadCompany}` : leadName,
      );
      setNotes(appointment.notes ?? '');
      setErrors({});
      setDirty(false);
      return;
    }
    if (defaultOwnerUserId) setOwnerUserId(defaultOwnerUserId);
    if (defaultLeadId) setLeadId(defaultLeadId);
    if (defaultLeadName) setLeadDisplayName(defaultLeadName);
    if (defaultScheduledAt) setScheduledAt(defaultDateTimeLocal(defaultScheduledAt));
  }, [defaultOwnerUserId, defaultLeadId, defaultLeadName, defaultScheduledAt, appointment, open]);

  useEffect(() => {
    if (!open || !defaultLeadId || defaultLeadName) return;
    setLeadLoading(true);
    const query = new URLSearchParams({ id: defaultLeadId, limit: '1' });
    void api
      .get<Array<{ id: string; name: string; company?: string }>>(
        `/lead-appointments/leads/search?${query.toString()}`,
      )
      .then((res) => {
        const match = res.data.find((l) => l.id === defaultLeadId);
        if (match) {
          setLeadDisplayName(match.company ? `${match.name} · ${match.company}` : match.name);
        }
      })
      .catch(() => undefined)
      .finally(() => setLeadLoading(false));
  }, [open, defaultLeadId, defaultLeadName]);

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!scheduledAt) next.scheduledAt = 'Informe data e hora.';
    else if (
      !isEditing &&
      isPastDateTimeLocal(scheduledAt)
    ) {
      next.scheduledAt = 'A data e hora devem ser futuras.';
    } else if (
      isEditing &&
      appointment &&
      scheduledAt !== isoToDatetimeLocal(appointment.scheduledAt) &&
      isPastDateTimeLocal(scheduledAt)
    ) {
      next.scheduledAt = 'Informe uma data e hora futuras para reagendar.';
    }
    if (!ownerUserId) next.ownerUserId = 'Selecione o responsável.';
    if (type === 'follow_up' && !leadId) {
      next.leadId = 'Vincule um lead para registrar o retorno no histórico.';
    }
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSaving(true);
    const payload = {
      ownerUserId,
      type,
      channel,
      scheduledAt: new Date(scheduledAt).toISOString(),
      leadId: leadId || undefined,
      notes: notes || undefined,
    };

    const result = isEditing && appointment
      ? await updateAppointment(appointment.id, payload)
      : await createAppointment(payload);
    setSaving(false);

    if (result) {
      onSaved();
    } else {
      toast.error(
        activitiesError ??
          (isEditing
            ? 'Não foi possível atualizar a atividade.'
            : 'Não foi possível criar a atividade. Verifique os dados e tente novamente.'),
      );
    }
  };

  const requestClose = async () => {
    if (dirty && !saving) {
      const accepted = await confirm({
        title: 'Descartar alterações?',
        message: 'As informações não salvas serão perdidas.',
        confirmLabel: 'Descartar',
        variant: 'danger',
      });
      if (!accepted) return;
    }
    onClose();
  };

  const ownerOptions = usersList.map((u) => ({ label: u.name, value: u.id }));

  return (
    <Modal isOpen={open} onClose={() => void requestClose()} contentClassName="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0">
        <ModalHeader title={isEditing ? 'Reagendar atividade' : 'Nova atividade'} onClose={() => void requestClose()} />

        <div className={ENTITY_FORM_MODAL_BODY_CLASS}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              id="appt-type"
              label="Tipo"
              value={type}
              onChange={(v) => {
                setType(String(v));
                setDirty(true);
              }}
              options={TYPE_OPTIONS}
            />
            <Select
              id="appt-channel"
              label="Canal"
              value={channel}
              onChange={(v) => {
                setChannel(String(v));
                setDirty(true);
              }}
              options={CHANNEL_OPTIONS}
            />
          </div>

          <div>
            <label htmlFor="appt-scheduled-at" className="mb-1.5 block text-sm font-semibold text-gray-700">
              Data e hora <span className="text-red-500">*</span>
            </label>
            <input
              id="appt-scheduled-at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => {
                setScheduledAt(e.target.value);
                setDirty(true);
                if (errors.scheduledAt) setErrors((prev) => ({ ...prev, scheduledAt: undefined }));
              }}
              className={datetimeInputClass(Boolean(errors.scheduledAt))}
              aria-invalid={Boolean(errors.scheduledAt)}
              aria-describedby={errors.scheduledAt ? 'appt-scheduled-at-error' : undefined}
            />
            {errors.scheduledAt ? (
              <p id="appt-scheduled-at-error" className="mt-1 text-xs text-red-600" role="alert">
                {errors.scheduledAt}
              </p>
            ) : null}
          </div>

          <Select
            id="appt-owner"
            label="Responsável"
            required
            value={ownerUserId}
            onChange={(v) => {
              setOwnerUserId(String(v));
              setDirty(true);
              if (errors.ownerUserId) setErrors((prev) => ({ ...prev, ownerUserId: undefined }));
            }}
            options={ownerOptions}
            placeholder="Selecione o responsável"
            error={errors.ownerUserId}
          />

          <LeadSearchCombobox
            id="appt-lead"
            value={leadId}
            displayLabel={leadDisplayName}
            onChange={(id, label) => {
              setLeadId(id);
              setLeadDisplayName(label);
              setDirty(true);
              if (errors.leadId) setErrors((prev) => ({ ...prev, leadId: undefined }));
            }}
            locked={hasFixedLead}
            loading={leadLoading}
            error={errors.leadId}
            required={type === 'follow_up'}
            hint={
              hasFixedLead
                ? 'Lead definido pelo contexto atual e não pode ser alterado.'
                : 'Vincule um lead para registrar o retorno no histórico comercial.'
            }
          />

          <div>
            <label htmlFor="appt-notes" className="mb-1.5 block text-sm font-semibold text-gray-700">
              Observações
            </label>
            <textarea
              id="appt-notes"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setDirty(true);
              }}
              className={notesInputClass}
              rows={3}
              placeholder="Pauta, contexto ou lembrete para o retorno…"
            />
          </div>
        </div>

        <ModalFooter>
          <ModalFormCancelButton onClick={() => void requestClose()} disabled={saving} />
          <ModalFormSubmitButton loading={saving}>
            {saving ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Salvar atividade'}
          </ModalFormSubmitButton>
        </ModalFooter>
      </form>
      <ConfirmDialog />
    </Modal>
  );
};
