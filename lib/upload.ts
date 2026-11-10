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

export { getPrivateUploadId } from './private-upload-id';

export async function openPrivateAttachment(_uploadId: string): Promise<void> {
  throw new Error('Anexos privados não estão disponíveis na demonstração.');
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
