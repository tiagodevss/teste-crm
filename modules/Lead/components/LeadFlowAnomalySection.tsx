import React, { useEffect, useState } from 'react';
import { AlertTriangle, Siren } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Lead } from '../../../types';
import { getLeadAnomalyNote, isLeadAnomalyFlagged } from '../../../lib/lead-anomaly';

export interface LeadFlowAnomalySectionProps {
  lead: Lead;
  canEdit?: boolean;
  onSave: (payload: { flowAnomalyFlagged: boolean; flowAnomalyNote?: string }) => Promise<void>;
}

export function LeadFlowAnomalySection({
  lead,
  canEdit = true,
  onSave,
}: LeadFlowAnomalySectionProps) {
  const [note, setNote] = useState(getLeadAnomalyNote(lead) ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const flagged = isLeadAnomalyFlagged(lead);

  useEffect(() => {
    setNote(getLeadAnomalyNote(lead) ?? '');
  }, [lead]);

  const handleToggle = async () => {
    if (!canEdit) return;
    setIsSaving(true);
    try {
      if (flagged) {
        await onSave({ flowAnomalyFlagged: false, flowAnomalyNote: undefined });
        toast.success('Alerta de anormalidade removido.');
      } else {
        await onSave({
          flowAnomalyFlagged: true,
          flowAnomalyNote: note.trim() || undefined,
        });
        toast.success('Anormalidade sinalizada no lead.');
      }
    } catch {
      toast.error('Não foi possível atualizar a anormalidade. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNote = async () => {
    if (!canEdit || !flagged) return;
    setIsSaving(true);
    try {
      await onSave({
        flowAnomalyFlagged: true,
        flowAnomalyNote: note.trim() || undefined,
      });
      toast.success('Descrição da anormalidade atualizada.');
    } catch {
      toast.error('Não foi possível salvar a descrição. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`rounded-xl border p-4 ${
        flagged
          ? 'border-red-300 bg-red-50/80'
          : 'border-gray-200 bg-white shadow-sm'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          {flagged ? (
            <Siren size={18} className="text-red-600 shrink-0 mt-0.5" aria-hidden />
          ) : (
            <AlertTriangle size={18} className="text-gray-400 shrink-0 mt-0.5" aria-hidden />
          )}
          <div>
            <h3 className="text-sm font-bold text-gray-800">Anormalidade no fluxo</h3>
            <p className="text-xs text-gray-600 mt-0.5">
              Sinalize manualmente quando o lead estiver fora do padrão da esteira (ex.: pendências
              que exigem retrabalho).
            </p>
          </div>
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={() => void handleToggle()}
            disabled={isSaving}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors disabled:opacity-60 ${
              flagged
                ? 'border-red-300 bg-white text-red-700 hover:bg-red-100'
                : 'border-red-200 bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {flagged ? 'Remover alerta' : 'Sinalizar anormalidade'}
          </button>
        ) : null}
      </div>

      {flagged ? (
        <div className="mt-3 space-y-2">
          <label className="block text-xs font-medium text-red-800">
            Descrição da anormalidade
          </label>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            disabled={!canEdit || isSaving}
            placeholder="Ex.: Cliente com declarações anteriores inconsistentes..."
            className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm bg-white disabled:bg-red-50/50"
          />
          {canEdit ? (
            <button
              type="button"
              onClick={() => void handleSaveNote()}
              disabled={isSaving}
              className="text-xs font-semibold text-red-700 hover:text-red-900 disabled:opacity-60"
            >
              Atualizar descrição
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function LeadFlowAnomalyBadge({ lead }: { lead: Lead }) {
  if (!isLeadAnomalyFlagged(lead)) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-red-300 bg-red-100 text-red-800"
      title={getLeadAnomalyNote(lead) ?? 'Lead com anormalidade no fluxo'}
    >
      <Siren size={10} />
      Anormalidade
    </span>
  );
}
