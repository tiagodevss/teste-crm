import React from 'react';
import type { CustomFieldEntry } from '../types';
import { AttachmentLink } from './AttachmentLink';

/** Exibe todos os arquivos de um campo de anexo (um ou vários). */
export function AttachmentFilesLinks({ entry }: { entry: Pick<CustomFieldEntry, 'url' | 'fileName' | 'uploadId' | 'files'> }) {
    const files = entry.files && entry.files.length > 0
        ? entry.files
        : entry.url
            ? [{ url: entry.url, fileName: entry.fileName, uploadId: entry.uploadId }]
            : [];
    if (files.length === 0) return null;
    return (
        <span className="flex flex-col gap-1">
            {files.map((file, index) => (
                <span key={`${file.url}-${index}`}>
                    <AttachmentLink
                        url={file.url}
                        uploadId={file.uploadId}
                        label={file.fileName ?? (files.length > 1 ? `Arquivo ${index + 1}` : 'Ver arquivo')}
                    />
                </span>
            ))}
        </span>
    );
}
