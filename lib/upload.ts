import { api, API_BASE_URL } from './axios';

export interface UploadResponse {
  id: string;
  url: string;
  originalName: string;
}

export async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<UploadResponse>('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
}

export interface FinanceiraUploadResponse extends UploadResponse {
  uploadId: string;
}

/** Upload de anexo financeiro (Crédito/Repasse): armazenamento privado, sem URL estática pública. */
export async function uploadFinanceiraFile(
  file: File,
  context: { pipeId: string; leadId?: string; fieldKey?: string },
): Promise<FinanceiraUploadResponse> {
  const formData = new FormData();
  formData.append('pipeId', context.pipeId);
  if (context.leadId) formData.append('leadId', context.leadId);
  if (context.fieldKey) formData.append('fieldKey', context.fieldKey);
  formData.append('file', file);
  const { data } = await api.post<FinanceiraUploadResponse>('/financeira/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export { getPrivateUploadId } from './private-upload-id';

/** Abre um anexo privado numa nova aba via requisição autenticada (blob temporário revogado em seguida). */
export async function openPrivateAttachment(uploadId: string): Promise<void> {
  const response = await api.get<Blob>(`/financeira/uploads/${encodeURIComponent(uploadId)}/conteudo`, {
    responseType: 'blob',
  });
  const objectUrl = URL.createObjectURL(response.data);
  window.open(objectUrl, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

/** Retorna URL absoluta para download do arquivo. */
export function getAttachmentDownloadUrl(urlOrPath: string): string {
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
    return urlOrPath;
  }
  const base = new URL(API_BASE_URL).origin;
  const path = urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`;
  return `${base}${path}`;
}

/** Normaliza a URL pública de avatar retornada pela API. */
export function getAvatarUrl(avatarUrl?: string | null): string | undefined {
  if (!avatarUrl) return undefined;
  return getAttachmentDownloadUrl(avatarUrl);
}
