import type { Lead } from '../../../types';

export type LocationConversionState = {
    openConversionLeadId?: string;
    conversionTargetStage?: string;
};

export type StageData = {
    leads: Lead[];
    page: number;
    total: number;
    hasMore: boolean;
};

export { createLeadSchema, validateLeadStep1Rules } from './createLead.schema';
export { conversionSchema, type ConversionFormData } from '../../Lead/schemas/lead.schema';
export { buildDynamicSchema } from './dynamic.schema';
