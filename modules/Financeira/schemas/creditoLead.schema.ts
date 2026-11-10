import { z } from 'zod';
import { isPlausibleBrazilPhone } from '../../../utils/phoneValidation';
import { isValidCpf } from '../../../utils/cpf';

/** Cadastro único de Crédito (C01/C02): validação espelhada do backend (`assertCreditoCadastroRules`). */
export const creditoLeadSchema = z
    .object({
        name: z.string().trim().min(1, 'Nome é obrigatório'),
        phone: z
            .string()
            .trim()
            .min(1, 'Telefone é obrigatório')
            .refine((v) => isPlausibleBrazilPhone(v), 'Telefone inválido. Informe um número real com DDD.'),
        email: z.string().trim().email('E-mail inválido').optional().or(z.literal('')),
        cpf1: z
            .string()
            .min(1, 'CPF do primeiro proponente é obrigatório')
            .refine((v) => isValidCpf(v), 'CPF inválido'),
        nascimento1: z.string().min(1, 'Data de nascimento é obrigatória'),
        possuiSegundo: z.enum(['SIM', 'NÃO']),
        segundoNome: z.string().optional(),
        cpf2: z.string().optional(),
        nascimento2: z.string().optional(),
        localizacao: z.string().min(1, 'Selecione o município do imóvel na lista'),
        agencia: z
            .string()
            .regex(/^\d{4}$/, 'A agência deve ter 4 dígitos')
            .optional()
            .or(z.literal('')),
        partnerId: z.string().optional(),
    })
    .superRefine((data, ctx) => {
        if (data.possuiSegundo !== 'SIM') return;
        if (!data.segundoNome?.trim()) {
            ctx.addIssue({ code: 'custom', path: ['segundoNome'], message: 'Nome do segundo proponente é obrigatório' });
        }
        if (!data.cpf2?.trim()) {
            ctx.addIssue({ code: 'custom', path: ['cpf2'], message: 'CPF do segundo proponente é obrigatório' });
        } else if (!isValidCpf(data.cpf2)) {
            ctx.addIssue({ code: 'custom', path: ['cpf2'], message: 'CPF inválido' });
        } else if (data.cpf2.replace(/\D/g, '') === data.cpf1.replace(/\D/g, '')) {
            ctx.addIssue({ code: 'custom', path: ['cpf2'], message: 'O CPF do segundo proponente não pode ser igual ao do primeiro' });
        }
        if (!data.nascimento2?.trim()) {
            ctx.addIssue({ code: 'custom', path: ['nascimento2'], message: 'Data de nascimento do segundo proponente é obrigatória' });
        }
    });

export type CreditoLeadFormData = z.infer<typeof creditoLeadSchema>;
