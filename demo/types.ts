import type { Lead, LeadAppointment, LeadLabel, Notification, PipeDetail } from '../types';
import type { CommercialFeedback } from '../lib/commercial-feedback';

export const SCHEMA_VERSION = 1;
export const SEED_VERSION = '2026-11-10.1';
export const STORAGE_KEY = 'teste-crm:database:v1';
export const HERO_ID = 'demo-lead-001';
export const ADMIN_ID = 'demo-presenter';
export const ACCOUNTING_ID = 'demo-accounting';
export const FINANCIAL_ID = 'demo-financial';
export const DAY_MS = 86_400_000;
export const STATUS = { lead: 'Lead', opportunity: 'Oportunidade', won: 'Cliente', lost: 'Perdido' } as const;
export interface DemoPipe extends PipeDetail { slug: string }
export interface DemoLead extends Lead {
  temperature?: 'hot' | 'warm' | 'cold';
  responseDeadline?: string | null;
  loss?: CommercialFeedback['loss'];
  closedAt?: string;
  demoRevenue?: number;
}
export interface DemoDatabase {
  schemaVersion: number;
  seedVersion: string;
  referenceDate: string;
  revision: number;
  sequence: number;
  leads: DemoLead[];
  appointments: LeadAppointment[];
  labels: LeadLabel[];
  notifications: Notification[];
}
export interface DemoResponse { status: number; body: unknown; changed?: boolean }
export interface DemoStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export class DemoError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; this.name = 'DemoError'; }
}
