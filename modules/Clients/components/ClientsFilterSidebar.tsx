import React, { useEffect, useState } from 'react';
import { Modal, ModalHeader, ModalFooter } from '../../../components/ui/Modal';
import type { ClientsFilterValues, ClientsListMode } from '../index';
import { useUserStore } from '../../Login/store/useUserStore';

export interface ClientsFilterSidebarProps {
  open: boolean;
  onClose: () => void;
  filters: ClientsFilterValues;
  onApply: (values: ClientsFilterValues) => void;
  onClear: () => void;
  listMode: ClientsListMode;
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-salesforce-blue/20 focus:border-salesforce-blue';

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 border-0 p-0">
      <legend className="text-xs font-semibold text-gray-600">{title}</legend>
      {children}
    </fieldset>
  );
}

function validateDateRanges(values: ClientsFilterValues): string | null {
  if (values.dateFrom && values.dateTo && values.dateFrom > values.dateTo) {
    return 'Em "Último contato", a data inicial não pode ser posterior à final.';
  }
  if (values.createdAtFrom && values.createdAtTo && values.createdAtFrom > values.createdAtTo) {
    return 'Em "Data de cadastro", a data inicial não pode ser posterior à final.';
  }
  return null;
}

export const ClientsFilterSidebar: React.FC<ClientsFilterSidebarProps> = ({
  open,
  onClose,
  filters,
  onApply,
  onClear,
  listMode,
}) => {
  const [draft, setDraft] = useState<ClientsFilterValues>(filters);
  const [validationError, setValidationError] = useState('');
  const { usersList } = useUserStore();
  const hideInactivityFilters = listMode === 'repescagem';

  useEffect(() => {
    if (open) {
      setDraft(filters);
      setValidationError('');
    }
  }, [open, filters]);

  const update = (field: keyof ClientsFilterValues, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setValidationError('');
  };

  const handleApply = () => {
    const error = validateDateRanges(draft);
    if (error) {
      setValidationError(error);
      return;
    }
    onApply(draft);
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={onClose} contentClassName="max-w-md">
      <ModalHeader title="Filtros" onClose={onClose} />
      <div className="px-6 py-4 space-y-6 max-h-[70vh] overflow-y-auto">
        {validationError && (
          <p className="text-xs text-red-700 rounded-lg bg-red-50 border border-red-100 px-3 py-2" role="alert">
            {validationError}
          </p>
        )}

        {hideInactivityFilters && (
          <p className="text-xs text-amber-900 leading-relaxed rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
            A aba Repescagem já filtra clientes inativos. Use os campos abaixo para refinar por identificação ou datas.
          </p>
        )}

        <FilterSection title="Identificação">
          <div>
            <label htmlFor="filter-company" className="block text-sm font-medium text-gray-700 mb-1">
              Empresa
            </label>
            <input
              id="filter-company"
              type="text"
              value={draft.company}
              onChange={(e) => update('company', e.target.value)}
              placeholder="Buscar por empresa"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="filter-cpfCnpj" className="block text-sm font-medium text-gray-700 mb-1">
              CPF/CNPJ
            </label>
            <input
              id="filter-cpfCnpj"
              type="text"
              value={draft.cpfCnpj}
              onChange={(e) => update('cpfCnpj', e.target.value)}
              placeholder="Somente números ou formatado"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="filter-city" className="block text-sm font-medium text-gray-700 mb-1">
              Cidade
            </label>
            <input
              id="filter-city"
              type="text"
              value={draft.city}
              onChange={(e) => update('city', e.target.value)}
              placeholder="Filtrar por cidade"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="filter-responsible" className="block text-sm font-medium text-gray-700 mb-1">
              Responsável
            </label>
            <select
              id="filter-responsible"
              value={draft.responsibleUserId}
              onChange={(e) => update('responsibleUserId', e.target.value)}
              className={inputClass}
            >
              <option value="">Todos</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </FilterSection>

        <FilterSection title="Contato">
          <div>
            <label htmlFor="filter-email" className="block text-sm font-medium text-gray-700 mb-1">
              E-mail
            </label>
            <input
              id="filter-email"
              type="email"
              value={draft.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="Filtrar por e-mail"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="filter-phone" className="block text-sm font-medium text-gray-700 mb-1">
              Telefone
            </label>
            <input
              id="filter-phone"
              type="text"
              value={draft.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="Filtrar por telefone"
              className={inputClass}
            />
          </div>
          <div>
            <span id="filter-contact-dates-label" className="block text-sm font-medium text-gray-700 mb-2">
              Último contato
            </span>
            <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="filter-contact-dates-label">
              <input
                type="date"
                value={draft.dateFrom}
                onChange={(e) => update('dateFrom', e.target.value)}
                className={inputClass}
                aria-label="Contato a partir de"
              />
              <input
                type="date"
                value={draft.dateTo}
                onChange={(e) => update('dateTo', e.target.value)}
                className={inputClass}
                aria-label="Contato até"
              />
            </div>
          </div>
        </FilterSection>

        <FilterSection title="Cadastro">
          <div>
            <span id="filter-created-dates-label" className="block text-sm font-medium text-gray-700 mb-2">
              Data de cadastro
            </span>
            <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="filter-created-dates-label">
              <input
                type="date"
                value={draft.createdAtFrom}
                onChange={(e) => update('createdAtFrom', e.target.value)}
                className={inputClass}
                aria-label="Cadastro a partir de"
              />
              <input
                type="date"
                value={draft.createdAtTo}
                onChange={(e) => update('createdAtTo', e.target.value)}
                className={inputClass}
                aria-label="Cadastro até"
              />
            </div>
          </div>
        </FilterSection>

        {!hideInactivityFilters && (
          <FilterSection title="Inatividade">
            <div>
              <label htmlFor="filter-min-days" className="block text-sm font-medium text-gray-700 mb-1">
                Dias sem ação (mínimo)
              </label>
              <input
                id="filter-min-days"
                type="number"
                min={0}
                value={draft.minDaysWithoutAction}
                onChange={(e) => update('minDaysWithoutAction', e.target.value)}
                placeholder="Ex.: 30"
                className={inputClass}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                id="filter-without-action"
                type="checkbox"
                checked={draft.withoutActionOnly}
                onChange={(e) => {
                  setDraft((prev) => ({ ...prev, withoutActionOnly: e.target.checked }));
                  setValidationError('');
                }}
                className="rounded border-gray-300 text-salesforce-blue focus:ring-salesforce-blue"
              />
              Apenas sem ação recente
            </label>
            <p className="text-xs text-gray-500">
              Para a fila completa de repescagem, use a aba Repescagem na lista.
            </p>
          </FilterSection>
        )}
      </div>
      <ModalFooter>
        <button
          type="button"
          onClick={onClear}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium"
        >
          Limpar
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="px-4 py-2 bg-salesforce-blue text-white rounded-lg hover:bg-salesforce-hover text-sm font-medium"
        >
          Aplicar
        </button>
      </ModalFooter>
    </Modal>
  );
};
