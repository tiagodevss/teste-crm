import { z } from 'zod';

export const editClientSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    company: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    ramo: z.string().optional(),
    cpfCnpj: z.string().optional(),
    responsibleUserId: z.string().optional(),
});

export type EditClientFormData = z.infer<typeof editClientSchema>;
