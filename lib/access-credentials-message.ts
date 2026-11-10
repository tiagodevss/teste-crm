export interface CreatedAccessCredentials {
  email: string;
  generatedPassword: string;
  platformUrl: string;
  messageForClient: string;
}

/** Texto padrão para enviar ao usuário com link, login e senha provisória. */
export function buildAccessMessageForClient(
  platformUrl: string,
  email: string,
  password: string,
): string {
  return [
    'Olá!',
    '',
    'Seu acesso à plataforma WMS CRM foi criado.',
    '',
    `Link: ${platformUrl}`,
    `E-mail de login: ${email}`,
    `Senha provisória: ${password}`,
    '',
    'Recomendamos alterar a senha após o primeiro acesso.',
  ].join('\n');
}
