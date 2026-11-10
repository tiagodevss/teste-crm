import React, { Suspense, lazy, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import toast, { Toaster } from 'react-hot-toast';
import { LayoutDashboard, Kanban, CalendarDays, Users, RotateCcw, ArrowRight, LogOut, BookOpen } from 'lucide-react';
import { useUserStore } from '../modules/Login/store/useUserStore';
import { useTenantStore } from '../modules/Login/store/useTenantStore';
import { Modal, ModalHeader, ModalFooter } from '../components/ui/Modal';
import { DEMO_AUTH_KEY, demoRouteUrl } from '../config/demo';
import { ADMIN_ID, HERO_ID, STORAGE_KEY } from './types';
import { DEMO_LOGIN, DEMO_PASSWORD } from './model';
import { clearDemo } from './storage';
import type { DemoRepository } from './handlers';
import logoWhite from '../assets/logo-branco.png';
import logoDark from '../assets/logo-preto.png';

const IndicatorLeads = lazy(() => import('./IndicatorLeads'));
const Indicadores = lazy(() => import('../modules/Indicadores').then(m => ({ default: m.Indicadores })));
const CRM = lazy(() => import('../modules/CRM').then(m => ({ default: m.CRM })));
const LeadDetail = lazy(() => import('../modules/Lead').then(m => ({ default: m.LeadDetail })));
const ClientDetail = lazy(() => import('../modules/Client').then(m => ({ default: m.ClientDetail })));
const Clients = lazy(() => import('../modules/Clients').then(m => ({ default: m.Clients })));
const Activities = lazy(() => import('../modules/Activities').then(m => ({ default: m.Activities })));
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, refetchOnWindowFocus: false } } });

class DemoBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  declare props: { children: React.ReactNode };
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error('[demo] render', error); }
  render() {
    return this.state.failed ? <section className="demo-error" role="alert">
      <h1 className="text-lg font-semibold">Esta tela não pôde ser exibida</h1>
      <p className="my-3">Nenhuma operação externa foi executada. Atualize a página ou restaure o cenário pelo menu.</p>
      <button className="demo-button" onClick={() => location.reload()}>Atualizar página</button>
    </section> : this.props.children;
  }
}
function Unavailable() {
  return <section className="bg-white rounded-lg border border-gray-200 p-8">
    <h1 className="text-xl font-bold">Esta área não faz parte da demonstração</h1>
    <p className="my-4 text-gray-600">O roteiro inclui indicadores, funil, atendimentos, atividades e clientes. Integrações e configurações de produção permanecem desativadas.</p>
    <NavLink to="/indicadores/geral" className="demo-button">Voltar aos indicadores</NavLink>
  </section>;
}
function Demo({ repository }: { repository: DemoRepository }) {
  const { user, login, logout, isLoading, loginError } = useUserStore();
  const fetchPublicSettings = useTenantStore(s => s.fetchPublicSettings);
  const location = useLocation(); const navigate = useNavigate();
  const [resetOpen, setResetOpen] = useState(false); const [guideOpen, setGuideOpen] = useState(false);
  const [otherTab, setOtherTab] = useState(false); const [resetting, setResetting] = useState(false);
  const [reference] = useState(() => new Date(repository.snapshot().referenceDate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
  useEffect(() => { void fetchPublicSettings(); }, [fetchPublicSettings]);
  useEffect(() => {
    const blocked = () => toast('Ação externa bloqueada. A demo não envia mensagens nem realiza chamadas.', { id: 'demo-network', duration: 5000 });
    const changed = () => { void queryClient.invalidateQueries(); };
    const storage = (event: StorageEvent) => { if (event.key === STORAGE_KEY) setOtherTab(true); };
    window.addEventListener('demo:external-blocked', blocked); window.addEventListener('demo:changed', changed); window.addEventListener('storage', storage);
    return () => { window.removeEventListener('demo:external-blocked', blocked); window.removeEventListener('demo:changed', changed); window.removeEventListener('storage', storage); };
  }, []);
  const reset = async () => {
    setResetting(true);
    try { await queryClient.cancelQueries(); clearDemo(localStorage); sessionStorage.removeItem(DEMO_AUTH_KEY); window.location.replace(demoRouteUrl('/login')); window.location.reload(); }
    catch { toast.error('Não foi possível restaurar o armazenamento local.'); setResetting(false); }
  };
  const authenticated = user?.id === ADMIN_ID;
  const enter = async () => { await login(DEMO_LOGIN, DEMO_PASSWORD); if (useUserStore.getState().user?.id === ADMIN_ID) navigate('/indicadores/geral', { replace: true }); };
  if (!authenticated) return <main className="demo-entry"><section>
    <img src={logoDark} alt="WMS Empresarial" style={{ width: 180, height: 'auto' }} />
    <h1>Uma operação completa.<br />Um ambiente para explorar.</h1>
    <p>Conheça os indicadores, acompanhe oportunidades no funil e organize os próximos atendimentos usando as telas do CRM.</p>
    <p><strong>Todos os dados são fictícios.</strong> As alterações ficam somente neste navegador. Nenhum contato ou envio externo será realizado.</p>
    {loginError && <div role="alert" className="demo-error">{loginError}</div>}
    <button type="button" className="demo-button demo-primary" disabled={isLoading} onClick={enter}>{isLoading ? 'Abrindo demonstração...' : 'Entrar na demonstração'}<ArrowRight size={18} aria-hidden /></button>
    <p className="demo-note">Cenário de referência: {reference}. Não informe dados reais de clientes.</p>
  </section><Toaster position="top-right" /></main>;
  return <div className="demo-layout">
    <aside className="demo-sidebar"><img src={logoWhite} alt="WMS Empresarial" /><nav aria-label="Navegação principal">
      <NavLink to="/indicadores"><LayoutDashboard size={20} aria-hidden />Indicadores</NavLink>
      <NavLink to="/crm"><Kanban size={20} aria-hidden />CRM / Funil</NavLink>
      <NavLink to="/atividades"><CalendarDays size={20} aria-hidden />Atividades</NavLink>
      <NavLink to="/clientes"><Users size={20} aria-hidden />Clientes</NavLink>
    </nav><footer className="mt-auto text-sm leading-relaxed text-slate-300">Ambiente demonstrativo<br />Dados fictícios e locais<br /><span className="text-xs">Referência: {reference}</span></footer></aside>
    <div className="demo-main"><header className="demo-toolbar"><div><strong className="text-sm">Demonstração WMS</strong><p className="demo-note">Sem conexão com a operação real</p></div><div className="flex flex-wrap gap-2">
      <button className="demo-button" onClick={() => navigate(`/lead/${HERO_ID}`)}><ArrowRight size={16} aria-hidden />Oportunidade do roteiro</button>
      <button className="demo-button" onClick={() => setGuideOpen(true)}><BookOpen size={16} aria-hidden />Roteiro</button>
      <button className="demo-button" onClick={() => setResetOpen(true)}><RotateCcw size={16} aria-hidden />Restaurar demo</button>
      <button className="demo-button" aria-label="Sair da demonstração" onClick={() => { void logout().then(() => navigate('/login')); }}><LogOut size={16} aria-hidden /></button>
    </div></header>
    <main className="demo-content" id="demo-main">
      {otherTab && <div role="alert" className="demo-error mb-4">O cenário foi alterado em outra aba. <button className="demo-button ml-3" onClick={() => window.location.reload()}>Atualizar esta aba</button></div>}
      {location.pathname.startsWith('/indicadores') && <details className="mb-5 text-sm text-slate-600"><summary className="cursor-pointer">Como interpretar os números demonstrativos</summary><p className="mt-2 max-w-4xl leading-relaxed">Filtros selecionam oportunidades pela data de criação. Conversão considera os negócios ganhos dessa base. Receita soma mensalidades contábeis e comissão financeira ilustrativa de 2%; crédito liberado é exibido separadamente. Os dados são fictícios, não resultados da WMS. O comparativo de período retorna 0 quando não existe base anterior.</p></details>}
      <DemoBoundary key={location.pathname}><Suspense fallback={<p role="status" className="p-10 text-center">Carregando tela demonstrativa...</p>}><Routes>
        <Route path="/" element={<Navigate to="/indicadores/geral" replace />} />
        <Route path="/login" element={<Navigate to="/indicadores/geral" replace />} />
        <Route path="/indicadores" element={<Navigate to="/indicadores/geral" replace />} />
        <Route path="/indicadores/geral" element={<Indicadores />} />
        <Route path="/indicadores/contabilidade" element={<Indicadores />} />
        <Route path="/indicadores/financeira" element={<Indicadores />} />
        <Route path="/demo/oportunidades" element={<IndicatorLeads />} />
        <Route path="/crm" element={<CRM />} /><Route path="/crm/:pipeSlug" element={<CRM />} />
        <Route path="/lead/:id" element={<LeadDetail />} /><Route path="/cliente/:id" element={<ClientDetail />} />
        <Route path="/clientes" element={<Clients />} /><Route path="/atividades" element={<Activities />} /><Route path="/atividades/agenda" element={<Activities />} /><Route path="/atividades/equipe" element={<Activities />} />
        <Route path="*" element={<Unavailable />} />
      </Routes></Suspense></DemoBoundary>
    </main></div>
    <Modal isOpen={resetOpen} onClose={() => !resetting && setResetOpen(false)} title="Restaurar demonstração"><ModalHeader title="Restaurar demonstração" onClose={() => setResetOpen(false)} /><div className="p-6 max-w-xl"><p>Isso apaga somente as alterações da demo neste navegador, recria os dados fictícios com datas atuais e volta à tela de entrada.</p><p className="mt-3 text-gray-600">Não afeta o sistema real. Feche outras abas da demonstração antes de continuar.</p></div><ModalFooter><button className="demo-button" disabled={resetting} onClick={() => setResetOpen(false)}>Cancelar</button><button className="demo-button demo-primary" disabled={resetting} onClick={reset}>Restaurar cenário</button></ModalFooter></Modal>
    <Modal isOpen={guideOpen} onClose={() => setGuideOpen(false)} title="Roteiro de apresentação"><ModalHeader title="Roteiro de apresentação" onClose={() => setGuideOpen(false)} /><div className="p-6 max-w-2xl overflow-auto max-h-[65vh] leading-relaxed"><ol className="list-decimal pl-5 space-y-3"><li>Abra os indicadores e altere o período ou responsável. Explore Contabilidade e Financeira.</li><li>Abra CRM / Funil e selecione Contabilidade. Pesquise Aurora.</li><li>Na oportunidade do roteiro, registre o atendimento e agende um retorno para hoje ou para um dia futuro.</li><li>Abra Atividades e mostre o retorno. Conclua a atividade.</li><li>Volte à Aurora e use Concluir negócio. Informe uma observação para confirmar a conversão.</li><li>Encontre a Aurora em Clientes. Retorne aos indicadores para mostrar o resultado.</li></ol><p className="mt-5 text-gray-600">Configurações avançadas, automações, Crédito/Repasse especializados e integrações estão fora desta versão. WhatsApp, e-mail e chamadas são bloqueados. Use uma aba principal; dados não são compartilhados entre dispositivos.</p></div><ModalFooter><button className="demo-button demo-primary" onClick={() => { setGuideOpen(false); navigate(`/lead/${HERO_ID}`); }}>Abrir oportunidade do roteiro</button></ModalFooter></Modal>
    <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
  </div>;
}
export function mountDemo(repository: DemoRepository) {
  const root = document.getElementById('root'); if (!root) throw new Error('Elemento raiz indisponível.');
  ReactDOM.createRoot(root).render(<QueryClientProvider client={queryClient}><HashRouter><Demo repository={repository} /></HashRouter></QueryClientProvider>);
}
