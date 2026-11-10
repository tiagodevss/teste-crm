import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Modal, ModalHeader, ModalFooter } from '../ui/Modal';
import { LOSS_CATEGORY_LABELS, prepareLeadLoss, type CommercialFeedback } from '../../lib/commercial-feedback';
import { fetchCommercialFeedback, registerLeadLoss } from '../../lib/commercial-feedback-api';
import { getApiErrorMessage } from '../../lib/api-error';

interface Props {
  lead: { id: string; name: string; stage: string };
  targetStage?: string;
  onClose: () => void;
  onSaved: () => void;
}
const fieldClass = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-salesforce-blue/30 focus:border-salesforce-blue';

export const LeadLossDialog: React.FC<Props> = ({ lead, targetStage, onClose, onSaved }) => {
  const [feedback, setFeedback] = useState<CommercialFeedback | null>(null);
  const [selectedStageId, setSelectedStageId] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const operation = useRef(0);
  const savingRef = useRef(false);
  useEffect(() => {
    const previous = document.activeElement;
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  useEffect(() => {
    const current = ++operation.current;
    const controller = new AbortController();
    setLoading(true); setError(null); setFeedback(null); setSelectedStageId('');
    fetchCommercialFeedback(lead.id, controller.signal).then(data => {
      if (operation.current !== current) return;
      setFeedback(data);
      const chosen = data.lossStages.find(stage => stage.name === targetStage) ?? (data.lossStages.length === 1 ? data.lossStages[0] : undefined);
      setSelectedStageId(chosen?.id ?? '');
    }).catch(reason => {
      if (operation.current === current && !controller.signal.aborted) setError(getApiErrorMessage(reason, 'Não foi possível consultar as etapas de perda. Tente novamente.'));
    }).finally(() => { if (operation.current === current) setLoading(false); });
    return () => { operation.current += 1; controller.abort(); };
  }, [lead.id, targetStage, attempt]);
  const close = () => { if (!savingRef.current) onClose(); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (savingRef.current || !feedback?.canRegisterLoss) return;
    const current = operation.current;
    setError(null);
    let warnings: string[] | undefined;
    try {
      const input = prepareLeadLoss(selectedStageId, category, description);
      if (!feedback.lossStages.some(stage => stage.id === input.targetStageId)) throw new Error('A etapa selecionada não está disponível. Atualize e tente novamente.');
      savingRef.current = true; setSaving(true);
      ({ warnings } = await registerLeadLoss(lead.id, input));
    } catch (reason) {
      if (operation.current === current) setError(getApiErrorMessage(reason, 'Não foi possível registrar a perda. Seus dados foram mantidos.'));
      savingRef.current = false;
      if (operation.current === current) setSaving(false);
      return;
    }
    savingRef.current = false;
    if (operation.current !== current) return;
    // Persistence has succeeded. A refresh must never be reported as a failed write.
    toast.success('Perda registrada com motivo e histórico preservados.');
    if (warnings?.length) toast.error(warnings.join(' '), { duration: 10000 });
    onSaved(); onClose();
  };
  return (
    <Modal isOpen onClose={close} closeOnBackdropClick={false} contentClassName="max-w-xl max-h-[90vh]">
      <ModalHeader title="Registrar perda" onClose={close} />
      <form onSubmit={submit} className="flex min-h-0 flex-col">
        <div className="space-y-4 overflow-y-auto p-6">
          <p className="text-sm text-gray-700 break-words"><strong>{lead.name}</strong> está em {lead.stage}. Registre a recusa para concluir o negócio diretamente, sem passar pelas etapas intermediárias.</p>
          {loading && <p role="status" className="text-sm text-gray-600">Consultando etapas e permissões...</p>}
          {!loading && !feedback && <button type="button" className="text-sm font-semibold text-salesforce-blue underline" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button>}
          {feedback && !feedback.canRegisterLoss && <p role="status" className="text-sm text-gray-700">Este negócio já foi concluído ou seu perfil não permite registrar perdas.</p>}
          {feedback?.canRegisterLoss && feedback.lossStages.length === 0 && <p role="status" className="text-sm text-gray-700">Nenhuma etapa de perda está disponível neste funil. Solicite ao administrador a configuração de uma etapa do tipo perda.</p>}
          {feedback?.canRegisterLoss && feedback.lossStages.length > 0 && <fieldset disabled={saving} className="space-y-4 disabled:opacity-70">
            <label className="block text-sm font-medium text-gray-800">Mover para
              <select required className={fieldClass} value={selectedStageId} onChange={event => setSelectedStageId(event.target.value)}>
                <option value="">Selecione a etapa</option>
                {feedback.lossStages.map(stage => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-800">Motivo da recusa
              <select required className={fieldClass} value={category} onChange={event => setCategory(event.target.value)}>
                <option value="">Selecione o motivo</option>
                {Object.entries(LOSS_CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-800">Detalhamento da recusa
              <textarea required minLength={10} maxLength={4000} rows={5} className={`${fieldClass} resize-y placeholder:text-gray-500`} value={description} onChange={event => setDescription(event.target.value)} aria-describedby="loss-description-help" placeholder="Explique o que o cliente recusou e por quê..." />
              <span id="loss-description-help" className="mt-1 block text-xs font-normal text-gray-600">{description.length}/4.000 caracteres. Mínimo de 10 caracteres, sem contar espaços nas extremidades.</span>
            </label>
            <p className="text-sm text-gray-600">A etapa de origem, a data e o autor ficarão no histórico. Os follow-ups pendentes serão cancelados; reuniões de outros tipos serão preservadas.</p>
          </fieldset>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </div>
        <ModalFooter>
          <button type="button" disabled={saving} onClick={close} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60">Cancelar</button>
          <button type="submit" disabled={loading || saving || !feedback?.canRegisterLoss || !feedback?.lossStages.length} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-60">{saving ? 'Registrando...' : 'Confirmar perda'}</button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
