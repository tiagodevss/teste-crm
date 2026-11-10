import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Paperclip } from 'lucide-react';
import { getAttachmentDownloadUrl, openPrivateAttachment } from '../lib/upload';
import { getPrivateUploadId } from '../lib/private-upload-id';
import { displayFileName } from '../lib/filename-encoding';

interface AttachmentLinkProps {
    url: string;
    uploadId?: string;
    label?: string;
    className?: string;
    showIcon?: boolean;
}

const DEFAULT_CLASS = 'text-salesforce-blue hover:underline inline-flex items-center gap-1';

/**
 * Link de anexo. Anexos financeiros (armazenamento privado) são abertos por requisição autenticada
 * (blob temporário); anexos legados continuam usando a URL pública original.
 */
export function AttachmentLink({ url, uploadId, label = 'Ver arquivo', className, showIcon = true }: AttachmentLinkProps) {
    const [opening, setOpening] = useState(false);
    const privateId = uploadId || getPrivateUploadId(url);
    const displayedLabel = displayFileName(label);

    if (!privateId) {
        return (
            <a
                href={getAttachmentDownloadUrl(url)}
                target="_blank"
                rel="noopener noreferrer"
                className={className ?? DEFAULT_CLASS}
            >
                {showIcon && <Paperclip size={14} aria-hidden="true" />}
                {displayedLabel}
            </a>
        );
    }

    return (
        <button
            type="button"
            disabled={opening}
            onClick={async () => {
                setOpening(true);
                try {
                    await openPrivateAttachment(privateId);
                } catch {
                    toast.error('Não foi possível abrir o arquivo. Verifique suas permissões.');
                } finally {
                    setOpening(false);
                }
            }}
            className={className ?? `${DEFAULT_CLASS} disabled:opacity-60`}
        >
            {showIcon && <Paperclip size={14} aria-hidden="true" />}
            {opening ? 'Abrindo…' : displayedLabel}
        </button>
    );
}
