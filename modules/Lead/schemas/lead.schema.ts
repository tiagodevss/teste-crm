import { z } from 'zod';
import { cpfCnpjSchema } from '../../../lib/validation';

export const editLeadSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    company: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional(),
    productId: z.string().optional(),
    campaignId: z.string().optional(),
    partnerId: z.string().optional(),
    ownerUserId: z.string().optional(),
});

export const conversionSchema = z.object({
    cpfCnpj: cpfCnpjSchema,
    address: z.string().optional(),
    kanbanObservation: z
        .string()
        .trim()
        .min(1, 'Observação é obrigatória para mover no Kanban'),
});

export type EditLeadFormData = z.infer<typeof editLeadSchema>;
export type ConversionFormData = z.infer<typeof conversionSchema>;
