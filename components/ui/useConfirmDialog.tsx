import React, { useCallback, useId, useRef, useState } from 'react';
import { Modal, ModalHeader, ModalFooter } from './Modal';
import { modalFormCancelButtonClass } from './ModalFormActions';

export type ConfirmVariant = 'default' | 'danger';

export type ConfirmOptions = {
    title?: string;
    message: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ConfirmVariant;
};

type ConfirmModalViewProps = ConfirmOptions & {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

const DEFAULT_TITLE = 'Confirmar';

function ConfirmModalView({
    isOpen,
    title = DEFAULT_TITLE,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'default',
    onConfirm,
    onCancel,
}: ConfirmModalViewProps) {
    const descriptionId = useId();
    const confirmClass =
        variant === 'danger'
            ? 'inline-flex justify-center rounded-lg border border-transparent shadow-sm px-5 py-2.5 bg-red-600 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500/30 transition-colors'
            : 'inline-flex justify-center rounded-lg border border-transparent shadow-sm px-5 py-2.5 bg-salesforce-blue text-sm font-semibold text-white hover:bg-salesforce-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-salesforce-blue/30 transition-colors';

    return (
        <Modal isOpen={isOpen} onClose={onCancel} contentClassName="max-w-md">
            <ModalHeader title={title} onClose={onCancel} />
            <div id={descriptionId} className="px-6 py-4 text-sm text-gray-600 leading-relaxed">
                {message}
            </div>
            <ModalFooter>
                <button type="button" onClick={onCancel} className={modalFormCancelButtonClass}>
                    {cancelLabel}
                </button>
                <button type="button" onClick={onConfirm} className={confirmClass}>
                    {confirmLabel}
                </button>
            </ModalFooter>
        </Modal>
    );
}

export function useConfirmDialog() {
    const resolveRef = useRef<((value: boolean) => void) | null>(null);
    const [state, setState] = useState<{ open: boolean; options: ConfirmOptions }>({
        open: false,
        options: { message: '' },
    });

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        setState({ open: true, options });
        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;
        });
    }, []);

    const finish = useCallback((result: boolean) => {
        setState((s) => ({ ...s, open: false }));
        const r = resolveRef.current;
        resolveRef.current = null;
        r?.(result);
    }, []);

    const ConfirmDialog = useCallback(() => {
        const { title, message, confirmLabel, cancelLabel, variant } = state.options;
        return (
            <ConfirmModalView
                isOpen={state.open}
                title={title}
                message={message}
                confirmLabel={confirmLabel}
                cancelLabel={cancelLabel}
                variant={variant}
                onConfirm={() => finish(true)}
                onCancel={() => finish(false)}
            />
        );
    }, [state.open, state.options, finish]);

    return { confirm, ConfirmDialog };
}
