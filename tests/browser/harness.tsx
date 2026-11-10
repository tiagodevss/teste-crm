import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LeadDetail } from '../../modules/Lead';
import { CRM } from '../../modules/CRM';
import { api } from '../../lib/axios';
import { useUserStore } from '../../modules/Login/store/useUserStore';
import { useTenantStore } from '../../modules/Login/store/useTenantStore';
import fixtures from './fixtures.json';
const { user, lead, pipe, feedback } = structuredClone(fixtures) as any;
if ((window as any).feedbackReadOnly) {
  user.role = "OPERADOR"; user.profile = { code: "OPERADOR", isAdmin: false };
  user.permissions = { navigation: { crm: true }, actions: { "crm.read": true }, pipeAccess: { "pipe-test": "read" } };
  feedback.canEditDeadline = false; feedback.canRegisterLoss = false;
}
if ((window as any).feedbackNoLossStage) feedback.lossStages = [];
const state = { calls: [] as any[], failNext: '', delayNext: 0, lead, pipe, feedback, user };
(window as any).feedbackTest = state;
const paged = (data: any[]) => ({ data, page: 1, limit: 50, total: data.length, totalPages: data.length ? 1 : 0 });
api.defaults.adapter = async config => {
 const path = new URL(config.url ?? '/', 'http://fixture.invalid').pathname;
 const method = config.method;
 const payload = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
 state.calls.push({ path, method, payload, url: config.url, params: config.params });
 if (state.delayNext) { const delay = state.delayNext; state.delayNext = 0; await new Promise(resolve => setTimeout(resolve, delay)); }
 if (state.failNext === path) { state.failNext = ''; throw Object.assign(new Error('Falha simulada. Tente novamente.'), { isAxiosError: true, config, response: { status: 503, data: { message: 'Falha simulada. Tente novamente.' } } }); }
 let data: any = [];
 if (path === '/settings') data = { slaDays: 5 };
 else if (path === '/pipes/pipe-test') data = pipe;
 else if (path === '/settings/public') data = { pipes: [pipe], branding: { appName: 'WMS Empresarial', appNameShort: 'WMS' } };
 else if (path === '/lead/lead-test') data = structuredClone(lead);
 else if (path === '/leads/lead-test/commercial-feedback') data = structuredClone(feedback);
 else if (path === '/leads/lead-test/response-deadline') { feedback.responseDeadline = payload.responseDeadline; data = structuredClone(feedback); }
 else if (path === '/leads/lead-test/loss') {
  lead.stage = 'N\u00e3o aceito'; lead.status = 'Perdido'; feedback.canRegisterLoss = false;
  feedback.loss = { category: payload.category, description: payload.description, lostAt: '2026-09-15T12:00:00Z', fromStage: 'Proposta', stage: lead.stage } as any;
  data = { id: lead.id, stage: lead.stage, status: lead.status };
 } else if (path === '/leads/lead-test' && method === 'put') {
  const attempt = payload.contactAttempt;
  if (attempt) lead.timeline.unshift({ id: 'new-attendance', type: 'contact_attempt', date: attempt.contactDate, description: 'Atendimento: ' + (attempt.notes ?? ''), actor: { id: user.id, name: user.name }, metadata: attempt });
  if (payload.stage) lead.stage = payload.stage;
  if (payload.status) lead.status = payload.status;
  lead.updatedAt = new Date().toISOString(); data = structuredClone(lead);
 } else if (path === '/leads') {
  const stage = new URL(config.url!, 'http://fixture.invalid').searchParams.get('stage');
  data = paged(!stage || stage === lead.stage ? [structuredClone(lead)] : []);
 } else if (path === '/leads/summary') data = { total: 1, totalValue: 2000, totalLeads: 1, totalClients: 0, totalLost: 0, countByStage: { Proposta: 1 } };
 else if (path === '/leads/count-by-stage') data = { Proposta: 1 };
 else if (['/products', '/campaigns', '/users', '/lead-appointments'].includes(path)) data = paged(path === '/users' ? [user] : []);
 else if (path === '/lead-labels/lead-test' || path === '/lead-labels') data = lead.labels;
 else if (path === '/labels' || path === '/labels/available') data = lead.labels;
 return { data, status: 200, statusText: 'OK', headers: {}, config };
};
useUserStore.setState({ user: user as any, accessToken: 'offline-test-token', expiresAt: null });
useTenantStore.setState({ pipes: [pipe] as any, loaded: true, isLoading: false });
const screen = (window as any).feedbackScreen ?? 'lead';
createRoot(document.getElementById('root')!).render(
 <QueryClientProvider client={new QueryClient()}>
  <MemoryRouter initialEntries={[screen === 'crm' ? '/crm/pipe-test' : '/lead/lead-test']}>
   <div className="min-h-screen bg-gray-100 px-4 pb-4 pt-16 md:px-8 md:pb-8 md:pt-0">{screen === 'crm' ? <CRM /> : <LeadDetail />}</div>
   <Toaster />
  </MemoryRouter>
 </QueryClientProvider>
);
