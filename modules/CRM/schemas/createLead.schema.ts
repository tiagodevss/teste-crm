import { z } from 'zod';
import type { LeadFormStep1Rules } from '../../../lib/leadFormProductRules';

export function createLeadSchema(opts: { isFromPartner: boolean; isBroughtByStaff: boolean; requiresProduct?: boolean }) {
    return z.object({
        productId: opts.requiresProduct === false
            ? z.string().optional()
            : z.string().min(1, 'Serviço de interesse é obrigatório'),
        campaignId: z.string().optional(),
        name: z.string().optional(),
        partnerId: z.string().optional(),
        registeredByStaffId: z.string().optional(),
        company: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        category: z.string().optional(),
        classification: z.string().optional(),
        reviewCount: z.preprocess((v) => (v === '' || v === undefined) ? undefined : Number(v), z.number().int().min(0).optional()),
        imageUrl: z.string().url().optional().or(z.literal('')),
        socialNetworks: z.string().optional(),
        site: z.string().url().optional().or(z.literal('')),
        neighborhood: z.string().optional(),
        cep: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        locationRaw: z.string().optional(),
        cid: z.string().optional(),
        placeId: z.string().optional(),
        mapsUrl: z.string().url().optional().or(z.literal('')),
    }).superRefine((data, ctx) => {
        if (opts.isFromPartner && !data.partnerId?.trim()) {
            ctx.addIssue({ code: 'custom', path: ['partnerId'], message: 'Selecione o parceiro' });
        }
        if (opts.isBroughtByStaff && !data.registeredByStaffId?.trim()) {
            ctx.addIssue({ code: 'custom', path: ['registeredByStaffId'], message: 'Selecione o funcionário' });
        }
    }).passthrough();
}

/**
 * A entrada de um lead precisa ser rápida: somente nome, telefone e serviço de
 * interesse são obrigatórios. Regras mais rígidas do produto continuam sendo
 * aplicadas durante a qualificação, quando o lead já está no funil.
 */
export function validateLeadStep1Rules(
    data: Record<string, unknown>,
    _rules: LeadFormStep1Rules,
): Array<{ path: 'name' | 'phone' | 'email' | 'address'; message: string }> {
    const issues: Array<{ path: 'name' | 'phone' | 'email' | 'address'; message: string }> = [];
    const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

    if (!asText(data.name)) {
        issues.push({ path: 'name', message: 'Nome é obrigatório' });
    }
    if (!asText(data.phone)) {
        issues.push({ path: 'phone', message: 'Telefone é obrigatório' });
    }

    return issues;
}
