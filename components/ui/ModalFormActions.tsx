import React from 'react';
import { Save, Loader2 } from 'lucide-react';

/** Classes compartilhadas: cancelar à esquerda, salvar à direita (justify-end no ModalFooter). */
export const modalFormCancelButtonClass =
    'px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50';

export const modalFormSubmitButtonClass =
    'px-4 py-2 text-sm font-bold text-white bg-salesforce-blue hover:bg-salesforce-hover rounded-lg inline-flex items-center gap-2 transition-colors disabled:opacity-50';

type ModalFormCancelButtonProps = {
    onClick: () => void;
    disabled?: boolean;
    /** Padrão: Cancelar. Use "Fechar" em modais somente leitura quando fizer sentido. */
    label?: string;
};

export const ModalFormCancelButton: React.FC<ModalFormCancelButtonProps> = ({
    onClick,
    disabled,
    label = 'Cancelar',
}) => (
    <button type="button" onClick={onClick} disabled={disabled} className={modalFormCancelButtonClass}>
        {label}
    </button>
);

type ModalFormSubmitButtonProps = {
    disabled?: boolean;
    loading?: boolean;
    /** Texto ao lado do ícone (padrão: Salvar). */
    children?: React.ReactNode;
};

export const ModalFormSubmitButton: React.FC<ModalFormSubmitButtonProps> = ({
    disabled,
    loading,
    children = 'Salvar',
}) => (
    <button type="submit" disabled={disabled || loading} className={modalFormSubmitButtonClass}>
        {loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Save size={16} aria-hidden />}
        {children}
    </button>
);

/** Botão primário para ações fora de `<form>` (ex.: salvar permissões em modal sem submit nativo). */
type ModalFormPrimaryButtonProps = {
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    children?: React.ReactNode;
};

export const ModalFormPrimaryButton: React.FC<ModalFormPrimaryButtonProps> = ({
    onClick,
    disabled,
    loading,
    children = 'Confirmar',
}) => (
    <button type="button" onClick={onClick} disabled={disabled || loading} className={modalFormSubmitButtonClass}>
        {loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Save size={16} aria-hidden />}
        {children}
    </button>
);
