import { useState, useEffect, useMemo } from 'react';
import { Tag, Search } from 'lucide-react';
import { LeadLabel } from '../../types';
import { useLeadLabelsStore } from '../../modules/LeadLabels/store/useLeadLabelsStore';
import { LabelChip } from './LabelChip';
import { Modal, ModalHeader, ModalFooter, ENTITY_FORM_MODAL_BODY_CLASS } from './Modal';

interface LabelSelectorProps {
  pipeId: string;
  leadId: string;
  currentLabels: LeadLabel[];
  onChange?: (labels: LeadLabel[]) => void;
}

export function LabelSelector({ pipeId, leadId, currentLabels, onChange }: LabelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>(currentLabels.map((l) => l.id));

  const { fetchLabelsByPipe, labelsByPipe, setLeadLabels } = useLeadLabelsStore();
  const allLabels = labelsByPipe[pipeId] ?? [];

  useEffect(() => {
    fetchLabelsByPipe(pipeId);
  }, [pipeId, fetchLabelsByPipe]);

  useEffect(() => {
    setSelected(currentLabels.map((l) => l.id));
  }, [currentLabels]);

  const openModal = () => {
    setSearch('');
    setSelected(currentLabels.map((l) => l.id));
    setOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setOpen(false);
  };

  const toggle = (labelId: string) => {
    setSelected((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId],
    );
  };

  const filteredLabels = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allLabels;
    return allLabels.filter((label) => label.name.toLowerCase().includes(q));
  }, [allLabels, search]);

  const save = async () => {
    setSaving(true);
    try {
      await setLeadLabels(leadId, selected);
      const updated = allLabels.filter((l) => selected.includes(l.id));
      onChange?.(updated);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-dashed border-gray-300 hover:border-gray-400 transition-colors"
      >
        <Tag className="w-3 h-3" />
        Etiquetas
      </button>

      <Modal isOpen={open} onClose={closeModal} contentClassName="max-w-md">
        <ModalHeader title="Etiquetas" onClose={closeModal} />
        <div className={ENTITY_FORM_MODAL_BODY_CLASS}>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar etiqueta..."
              autoFocus
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-salesforce-blue/20 focus:border-salesforce-blue"
            />
          </div>

          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {allLabels.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-400 text-center">Nenhuma label criada para este pipe.</p>
            ) : filteredLabels.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-400 text-center">Nenhuma etiqueta encontrada para &quot;{search}&quot;.</p>
            ) : (
              filteredLabels.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => toggle(label.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left"
                >
                  <span
                    className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors"
                    style={
                      selected.includes(label.id)
                        ? { backgroundColor: label.color, borderColor: label.color }
                        : { borderColor: '#d1d5db' }
                    }
                  >
                    {selected.includes(label.id) && (
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <LabelChip label={label} />
                </button>
              ))
            )}
          </div>
          {selected.length > 0 && (
            <p className="text-xs text-gray-500">{selected.length} etiqueta{selected.length > 1 ? 's' : ''} selecionada{selected.length > 1 ? 's' : ''}</p>
          )}
        </div>
        <ModalFooter>
          <button
            type="button"
            onClick={closeModal}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || allLabels.length === 0}
            className="px-5 py-2 bg-salesforce-blue text-white rounded-lg font-semibold text-sm hover:bg-salesforce-hover disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Aplicar'}
          </button>
        </ModalFooter>
      </Modal>
    </>
  );
}
