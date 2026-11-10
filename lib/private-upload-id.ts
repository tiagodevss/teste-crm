const PRIVATE_UPLOAD_PATH = /\/documents\/uploads\/([^/]+)\/conteudo/;

/** Id do upload privado extraído da URL de conteúdo (ou null para anexos públicos legados). */
export function getPrivateUploadId(urlOrPath: string | undefined | null): string | null {
  if (!urlOrPath) return null;
  const match = PRIVATE_UPLOAD_PATH.exec(urlOrPath);
  return match ? decodeURIComponent(match[1]) : null;
}
