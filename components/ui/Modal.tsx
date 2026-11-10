import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const MODAL_Z_INDEX = 9999;
const BACKDROP_Z_INDEX = MODAL_Z_INDEX;
const CONTENT_Z_INDEX = MODAL_Z_INDEX + 1;

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    /** Classe adicional para o container do conteúdo */
    contentClassName?: string;
    /** Se true, permite fechar clicando no backdrop */
    closeOnBackdropClick?: boolean;
}

export const ModalHeader: React.FC<{ title: string; onClose: () => void }> = ({ title, onClose }) => (
    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
        <h3 id="modal-title" className="font-bold text-gray-800 text-lg">{title}</h3>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition-colors" aria-label="Fechar">
            <X size={20} />
        </button>
    </div>
);

export const ModalFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100 flex-shrink-0">
        {children}
    </div>
);

/** Corpo padrão de modais de cadastro: padding, espaçamento e rolagem em formulários longos. */
export const ENTITY_FORM_MODAL_BODY_CLASS = 'p-6 space-y-4 max-h-[70vh] overflow-y-auto';

/** Variante com mais espaço vertical entre blocos (ex.: produto com várias seções). */
export const ENTITY_FORM_MODAL_BODY_SPACIOUS_CLASS = 'p-6 space-y-6 max-h-[70vh] overflow-y-auto';

/** Conteúdo rolável em modal `flex flex-col` com altura máxima (ex.: parceiro em duas seções). */
export const ENTITY_FORM_MODAL_BODY_FLEX_SCROLL_CLASS = 'p-6 space-y-6 overflow-y-auto flex-1 min-h-0';

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    children,
    contentClassName = '',
    closeOnBackdropClick = true
}) => {
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen || !contentRef.current) return;
        const root = contentRef.current;
        const getFocusable = (): HTMLElement[] =>
            Array.from(
                root.querySelectorAll(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
                ),
            ).filter((el): el is HTMLElement => el instanceof HTMLElement);
        const focusable = getFocusable();
        focusable[0]?.focus();

        const handleTab = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            const items = getFocusable();
            if (items.length === 0) return;
            const first = items[0];
            const last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', handleTab);
        return () => document.removeEventListener('keydown', handleTab);
    }, [isOpen]);

    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && closeOnBackdropClick) onClose();
    };

    return createPortal(
        <div
            className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto"
            style={{ zIndex: BACKDROP_Z_INDEX }}
            aria-modal
            role="dialog"
            aria-labelledby="modal-title"
        >
            <div
                className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
                style={{ zIndex: BACKDROP_Z_INDEX }}
                onClick={handleBackdropClick}
                aria-hidden
            />
            <div
                ref={contentRef}
                className={`relative bg-white rounded-xl shadow-2xl w-full overflow-hidden animate-fade-in flex flex-col flex-1 ${contentClassName ? contentClassName : 'max-w-lg'}`}
                style={{ zIndex: CONTENT_Z_INDEX }}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>,
        document.body
    );
};
