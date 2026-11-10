import { useState } from 'react';
import toast from 'react-hot-toast';
import { LeadAppointment } from '../../../types';
import { useConfirmDialog } from '../../../components/ui/useConfirmDialog';
import { useActivitiesStore } from '../store';
import { announceActivities } from '../activitiesAnnounce';
import { getAppointmentEntityLabel } from '../activitiesHelpers';

interface UseAppointmentMutationsOptions {
  onSuccess: () => void;
}

export function useAppointmentMutations({ onSuccess }: UseAppointmentMutationsOptions) {
  const updateAppointment = useActivitiesStore((s) => s.updateAppointment);
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [mutatingId, setMutatingId] = useState<string | null>(null);

  const handleComplete = async (item: LeadAppointment) => {
    if (completingId) return;
    const entity = getAppointmentEntityLabel(item);
    const accepted = await confirm({
      title: 'Concluir atividade',
      message: (
        <>
          Marcar <strong className="text-gray-900">{entity}</strong> como concluída? O status será
          atualizado no histórico de compromissos.
        </>
      ),
      confirmLabel: 'Concluir',
    });
    if (!accepted) return;

    setCompletingId(item.id);
    const result = await updateAppointment(item.id, { status: 'completed' });
    setCompletingId(null);
    if (result) {
      const itemId = item.id;
      toast.success((t) => (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>Atividade concluída.</span>
          <button
            type="button"
            className="font-semibold text-salesforce-blue hover:underline"
            onClick={() => {
              void updateAppointment(itemId, { status: 'scheduled' }).then((reverted) => {
                if (reverted) {
                  announceActivities('Conclusão desfeita.');
                  onSuccess();
                  toast.success('Conclusão desfeita.');
                }
              });
              toast.dismiss(t.id);
            }}
          >
            Desfazer
          </button>
        </div>
      ));
      announceActivities(`Atividade concluída: ${entity}.`);
      onSuccess();
    } else {
      const storeError = useActivitiesStore.getState().error;
      toast.error(storeError ?? 'Não foi possível concluir a atividade. Tente novamente.');
    }
  };

  const handleStatusChange = async (
    item: LeadAppointment,
    status: 'canceled' | 'no_show',
    label: string,
  ) => {
    const accepted = await confirm({
      title: label,
      message: (
        <>
          Confirmar <strong className="text-gray-900">{label.toLowerCase()}</strong> para{' '}
          {getAppointmentEntityLabel(item)}?
        </>
      ),
      confirmLabel: 'Confirmar',
      variant: status === 'canceled' ? 'danger' : 'default',
    });
    if (!accepted) return;

    setMutatingId(item.id);
    const result = await updateAppointment(item.id, { status });
    setMutatingId(null);
    if (result) {
      toast.success('Status atualizado.');
      announceActivities(`${label} registrado para ${getAppointmentEntityLabel(item)}.`);
      onSuccess();
    } else {
      const storeError = useActivitiesStore.getState().error;
      toast.error(storeError ?? 'Não foi possível atualizar a atividade.');
    }
  };

  return {
    completingId,
    mutatingId,
    handleComplete,
    handleStatusChange,
    ConfirmDialog,
  };
}
