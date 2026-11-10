import axios from 'axios';

/** Corpo típico de erro NestJS (HttpException / ValidationPipe). */
export type ApiErrorBody = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  code?: string;
  issues?: Array<{ code?: string; path?: string; message?: string }>;
  /** Quando o backend nega por `PermissionsGuard` (403). */
  requiredPermissions?: string[];
};

export type GetApiErrorMessageOptions = {
  /** Quando o body não traz `message` utilizável. */
  statusWhenNoMessage?: Partial<Record<number, string>>;
  /** Para status HTTP >= 500 quando não há mensagem no body. */
  serverError?: string;
};

function messageFromBody(data: ApiErrorBody | undefined): string | null {
  if (
    data?.code === 'PIPE_CONFIG_INVALID' &&
    Array.isArray(data.issues) &&
    data.issues.length > 0
  ) {
    const fromIssues = data.issues
      .map((i) => i.message)
      .filter((m): m is string => typeof m === 'string' && m.trim().length > 0);
    if (fromIssues.length > 0) {
      return fromIssues.join(' | ');
    }
  }
  if (Array.isArray(data?.message) && data.message.length > 0) {
    return data.message.join(' | ');
  }
  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }
  if (
    Array.isArray(data?.requiredPermissions) &&
    data.requiredPermissions.length > 0
  ) {
    return `Permissão necessária: ${data.requiredPermissions.join(', ')}`;
  }
  return null;
}

export function getApiErrorMessage(
  error: unknown,
  fallback: string,
  options?: GetApiErrorMessageOptions,
): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as ApiErrorBody | undefined;
    const fromBody = messageFromBody(data);
    if (fromBody) {
      return fromBody;
    }
    if (status === 502 || status === 503) {
      return 'Serviço temporariamente indisponível. Tente novamente em instantes.';
    }
    if (status === 504) {
      return 'Tempo esgotado ao comunicar com o servidor. Verifique a conexão e tente de novo.';
    }
    if (status != null && options?.statusWhenNoMessage?.[status]) {
      return options.statusWhenNoMessage[status]!;
    }
    if (status != null && status >= 500 && options?.serverError) {
      return options.serverError;
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}
