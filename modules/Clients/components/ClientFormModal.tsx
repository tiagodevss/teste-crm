import React, { useEffect, useId, useState } from 'react';
import toast from 'react-hot-toast';
import { Modal, ModalFooter, ModalHeader } from '../../../components/ui/Modal';
import { useClientsStore, type CreateClientPayload } from '../store';
import { useUserStore } from '../../Login/store/useUserStore';
import { applyPhoneMask } from '../../../utils/formatters';

export interface ClientFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-salesforce-blue/20 focus:border-salesforce-blue';

const inputErrorClass =
  'w-full px-3 py-2 border border-red-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-500';

const initialForm: CreateClientPayload = {
  name: '',
  company: '',
  cpfCnpj: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  ramo: '',
  responsibleUserId: '',
};

export const ClientFormModal: React.FC<ClientFormModalProps> = ({ open, onClose, onSaved }) => {
  const { createClient } = useClientsStore();
  const { usersList, fetchUsers, user } = useUserStore();
  const [form, setForm] = useState<CreateClientPayload>(initialForm);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const formErrorId = useId();
  const nameId = useId();
  const cityId = useId();
  const ramoId = useId();
  const responsibleId = useId();
  const companyId = useId();
  const cpfCnpjId = useId();
  const phoneId = useId();
  const emailId = useId();

  useEffect(() => {
    if (open) {
      void fetchUsers({ page: 1, limit: 200 });
      setForm({
        ...initialForm,
        responsibleUserId: user?.id ?? '',
      });
      setNameError('');
    }
  }, [open, fetchUsers, user?.id]);

  const update = (field: keyof CreateClientPayload, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'name' && value.trim()) setNameError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setNameError('Informe o nome do cliente.');
      return;
    }
    setSaving(true);
    const payload: CreateClientPayload = {
      name: form.name.trim(),
      company: form.company?.trim() || undefined,
      cpfCnpj: form.cpfCnpj?.trim() || undefined,
      phone: form.phone?.trim() || undefined,
      email: form.email?.trim() || undefined,
      address: form.address?.trim() || undefined,
      city: form.city?.trim() || undefined,
      ramo: form.ramo?.trim() || undefined,
      responsibleUserId: form.responsibleUserId || undefined,
    };
    const result = await createClient(payload);
    setSaving(false);
    if (result) {
      onSaved();
    } else {
      toast.error('Não foi possível criar o cliente. Verifique os dados e tente novamente.');
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} contentClassName="max-w-lg">
      <form onSubmit={handleSubmit} noValidate>
        <ModalHeader title="Novo cliente" onClose={onClose} />
        <div className="px-6 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label htmlFor={nameId} className="block text-sm font-medium text-gray-700 mb-1">
              Nome *
            </label>
            <input
              id={nameId}
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className={nameError ? inputErrorClass : inputClass}
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? formErrorId : undefined}
              required
            />
            {nameError && (
              <p id={formErrorId} className="mt-1 text-xs text-red-600" role="alert">
                {nameError}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={cityId} className="block text-sm font-medium text-gray-700 mb-1">
                Cidade
              </label>
              <input
                id={cityId}
                value={form.city ?? ''}
                onChange={(e) => update('city', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor={ramoId} className="block text-sm font-medium text-gray-700 mb-1">
                Ramo
              </label>
              <input
                id={ramoId}
                value={form.ramo ?? ''}
                onChange={(e) => update('ramo', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label htmlFor={responsibleId} className="block text-sm font-medium text-gray-700 mb-1">
              Responsável
            </label>
            <select
              id={responsibleId}
              value={form.responsibleUserId ?? ''}
              onChange={(e) => update('responsibleUserId', e.target.value)}
              className={inputClass}
            >
              <option value="">Sem responsável</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={companyId} className="block text-sm font-medium text-gray-700 mb-1">
              Empresa
            </label>
            <input
              id={companyId}
              value={form.company ?? ''}
              onChange={(e) => update('company', e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={cpfCnpjId} className="block text-sm font-medium text-gray-700 mb-1">
                CPF/CNPJ
              </label>
              <input
                id={cpfCnpjId}
                value={form.cpfCnpj ?? ''}
                onChange={(e) => update('cpfCnpj', e.target.value)}
                className={inputClass}
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <label htmlFor={phoneId} className="block text-sm font-medium text-gray-700 mb-1">
                Telefone
              </label>
              <input
                id={phoneId}
                value={form.phone ?? ''}
                onChange={(e) => update('phone', applyPhoneMask(e.target.value))}
                className={inputClass}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
          <div>
            <label htmlFor={emailId} className="block text-sm font-medium text-gray-700 mb-1">
              E-mail
            </label>
            <input
              id={emailId}
              type="email"
              value={form.email ?? ''}
              onChange={(e) => update('email', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${nameId}-address`} className="block text-sm font-medium text-gray-700 mb-1">
              Endereço
            </label>
            <input
              id={`${nameId}-address`}
              value={form.address ?? ''}
              onChange={(e) => update('address', e.target.value)}
              className={inputClass}
              placeholder="Endereço completo"
            />
          </div>
        </div>
        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-salesforce-blue text-white rounded-lg text-sm font-medium hover:bg-salesforce-hover disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Criar cliente'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
