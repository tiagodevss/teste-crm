import React, { useEffect, useRef, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';
import { LeadDetailSection } from './LeadDetailSection';
import { deadlineState, formatCalendarDate, LOSS_CATEGORY_LABELS, prepareResponseDeadline, type CommercialFeedback } from '../../../lib/commercial-feedback';
import { fetchCommercialFeedback, saveResponseDeadline } from '../../../lib/commercial-feedback-api';
import { getApiErrorMessage } from '../../../lib/api-error';
import { formatDateTime } from '../../../utils/formatters';

interface Props { leadId: string; revision?: string; onSaved: () => void; onRegisterLoss: () => void }
export const CommercialFeedbackPanel: React.FC<Props> = ({ leadId, revision, onSaved, onRegisterLoss }) => {
  const [feedback, setFeedback] = useState<CommercialFeedback | null>(null);
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  const savingRef = useRef(false);
  useEffect(() => {
    const current = ++generation.current;
    const controller = new AbortController();
    setLoading(true); setError(null); setFeedback(null);
    fetchCommercialFeedback(leadId, controller.signal).then(data => {
      if (generation.current !== current) return;
      setFeedback(data); setDeadline(data.responseDeadline ?? '');
    }).catch(reason => {
      if (generation.current === current && !controller.signal.aborted) setError(getApiErrorMessage(reason, 'Não foi possível carregar os dados comerciais. Tente novamente.'));
    }).finally(() => { if (generation.current === current) setLoading(false); });
    return () => { generation.current += 1; controller.abort(); };
  }, [leadId, revision, attempt]);
  const save = async (value: string) => {
    if (savingRef.current || !feedback?.canEditDeadline) return;
    const current = generation.current;
    setError(null);
    let saved: CommercialFeedback;
    try {
      const next = prepareResponseDeadline(value);
      savingRef.current = true; setSaving(true);
      saved = await saveResponseDeadline(leadId, next);
    } catch (reason) {
      if (generation.current === current) setError(getApiErrorMessage(reason, 'Não foi possível salvar o prazo. Tente novamente.'));
      savingRef.current = false;
      setSaving(false);
      return;
    }
    savingRef.current = false; setSaving(false);
    if (generation.current !== current) return;
     setFeedback(saved); setDeadline(saved.responseDeadline ?? '');
    toast.success(saved.responseDeadline ? 'Prazo de resposta salvo.' : 'Prazo de resposta removido.');
    onSaved();
  };
  const state = deadlineState(feedback?.responseDeadline ?? null);
  return (
    <LeadDetailSection title="Acompanhamento comercial" icon={<CalendarClock size={18} />} description="Prazo de resposta do cliente e conclusão da negociação.">
      {loading && <p role="status" className="text-sm text-gray-600">Carregando acompanhamento...</p>}
      {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
      {!loading && !feedback && <button type="button" onClick={() => setAttempt(value => value + 1)} className="text-sm font-semibold text-salesforce-blue underline">Tentar novamente</button>}
      {feedback && <div className="space-y-5">
        <form onSubmit={event => { event.preventDefault(); void save(deadline); }}>
          <label className="block text-sm font-semibold text-gray-800" htmlFor="lead-response-deadline">Prazo de resposta do cliente</label>
          <p id="lead-response-deadline-help" className="mt-1 text-sm text-gray-600">Data limite combinada para receber uma resposta. Não altera o próximo follow-up e não encerra o negócio automaticamente.</p>
          {feedback.canEditDeadline ? <div className="mt-3 flex flex-wrap items-end gap-2">
            <input id="lead-response-deadline" aria-describedby="lead-response-deadline-help" type="date" min="1900-01-01" max="9999-12-31" value={deadline} onChange={event => setDeadline(event.target.value)} disabled={saving} className="max-w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-salesforce-blue/30" />
            <button type="submit" disabled={saving || deadline === (feedback.responseDeadline ?? '')} className="rounded-lg bg-salesforce-blue px-4 py-2 text-sm font-semibold text-white hover:bg-salesforce-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60">{saving ? 'Salvando...' : 'Salvar prazo'}</button>
            {feedback.responseDeadline && <button type="button" onClick={() => void save('')} disabled={saving} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60">Remover prazo</button>}
          </div> : <p className="mt-2 text-sm text-gray-700">{feedback.responseDeadline ? formatCalendarDate(feedback.responseDeadline) : 'Sem prazo de resposta definido.'} Acesso somente para consulta.</p>}
          {feedback.responseDeadline && <p role="status" className={`mt-2 text-sm ${state === 'overdue' ? 'font-semibold text-red-700' : 'text-gray-700'}`}>Prazo registrado: {formatCalendarDate(feedback.responseDeadline)}{state === 'overdue' ? ' — vencido' : state === 'today' ? ' — vence hoje' : ''}.</p>}
        </form>
        <div className="border-t border-gray-200 pt-4">
          {feedback.loss ? <>
            <h3 className="text-sm font-bold text-gray-900">Negócio concluído por perda — {feedback.loss.stage}</h3>
            <p className="mt-2 text-sm font-semibold text-gray-800">{feedback.loss.category ? LOSS_CATEGORY_LABELS[feedback.loss.category] ?? feedback.loss.category : 'Motivo não informado'}</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700">{feedback.loss.description}</p>
            <p className="mt-2 text-xs text-gray-600">Registrado em {formatDateTime(feedback.loss.lostAt)}{feedback.loss.fromStage ? `, a partir de ${feedback.loss.fromStage}` : ''}.</p>
          </> : feedback.canRegisterLoss ? <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-prose text-sm text-gray-600">O cliente recusou? Registre a perda diretamente, com o motivo detalhado.</p>
            <button type="button" onClick={onRegisterLoss} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">Registrar perda</button>
          </div> : <p className="text-sm text-gray-600">A conclusão por perda está disponível para negócios em andamento e perfis autorizados.</p>}
        </div>
      </div>}
    </LeadDetailSection>
  );
};
