import { z } from 'zod';

/** Valida CPF ou CNPJ (apenas dígitos, 11 ou 14 caracteres). */
const cpfCnpjRegex = /^\d{11}$|^\d{14}$/;

/** Mensagens padrão para alinhar formulários cadastrais e Zod. */
export const MSG_REQUIRED = 'Campo obrigatório';
export const MSG_EMAIL_REQUIRED = 'E-mail é obrigatório';
export const MSG_EMAIL_INVALID = 'E-mail inválido';
export const MSG_DATE_REQUIRED = 'Data é obrigatória';
export const MSG_SELECT_PROFILE = 'Selecione um perfil';
export const MSG_NON_NEGATIVE = 'Valor deve ser maior ou igual a zero';
export const MSG_NAME_REQUIRED = 'Nome é obrigatório';
/** Produto: vínculo obrigatório com grupo/categoria de produto. */
export const MSG_CATEGORY_REQUIRED = 'Categoria é obrigatória';

export const requiredString = (message = MSG_REQUIRED) =>
    z.string().min(1, message);

export const optionalString = () =>
    z.string().optional().or(z.literal(''));

export const emailSchema = z
    .string()
    .min(1, MSG_EMAIL_REQUIRED)
    .email(MSG_EMAIL_INVALID);

export const cpfCnpjSchema = z
    .string()
    .min(1, 'CPF ou CNPJ é obrigatório')
    .refine((v) => cpfCnpjRegex.test(v.replace(/\D/g, '')), 'CPF deve ter 11 dígitos ou CNPJ 14 dígitos');

export const nameSchema = requiredString(MSG_NAME_REQUIRED);

export const priceSchema = z
    .number()
    .min(0, MSG_NON_NEGATIVE)
    .optional()
    .nullable();

export const positiveNumberSchema = z
    .number()
    .min(0.01, 'Valor deve ser maior que zero');

export const dateSchema = z.string().min(1, MSG_DATE_REQUIRED);
