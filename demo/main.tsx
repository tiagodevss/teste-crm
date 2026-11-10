import { isDemo, demoRouteUrl } from '../config/demo';
import { createRepository, clearDemo } from './storage';
import { installNetworkGuard, installStreamingGuard } from './network';
import { startDemoWorker } from './handlers';
import './styles.css';
import '../modules/CRM/components/pdf-template-editor.css';

async function bootstrap() {
  if (!isDemo) throw new Error('Este arquivo exige o build exclusivo da demonstra\u00e7\u00e3o.');
  if (!window.isSecureContext || !('serviceWorker' in navigator)) throw new Error('Abra a demo em HTTPS ou localhost. N\u00e3o abra index.html diretamente.');
  installNetworkGuard();
  const before = localStorage.getItem('teste-crm:database:v1');
  const repository = createRepository(localStorage);
  if (before && before !== localStorage.getItem('teste-crm:database:v1')) {
    // Re-authenticate only on the one-time scenario migration, before stores hydrate.
    sessionStorage.removeItem('teste-crm:auth:v1');
  }
  await startDemoWorker(repository);
  installStreamingGuard();
  const { mountDemo } = await import('./DemoApp');
  mountDemo(repository);
}
bootstrap().catch(error => {
  const root = document.getElementById('root')!;
  root.replaceChildren();
  const container = document.createElement('main'); container.className = 'demo-entry';
  const section = document.createElement('section');
  const heading = document.createElement('h1'); heading.textContent = 'N\u00e3o foi poss\u00edvel abrir a demonstra\u00e7\u00e3o';
  const message = document.createElement('p'); message.textContent = error instanceof Error ? error.message : 'Tente abrir novamente.';
  const retry = document.createElement('button'); retry.className = 'demo-button'; retry.textContent = 'Tentar novamente'; retry.onclick = () => location.reload();
  const reset = document.createElement('button'); reset.className = 'demo-button'; reset.textContent = 'Restaurar cen\u00e1rio local';
  reset.onclick = () => { if (confirm('Apagar somente as altera\u00e7\u00f5es da demonstra\u00e7\u00e3o neste navegador?')) { try { clearDemo(localStorage); location.replace(demoRouteUrl('/login')); window.location.reload(); } catch { message.textContent = 'O armazenamento local est\u00e1 bloqueado. Permita o armazenamento deste site.'; } } };
  section.append(heading, message, retry, reset); container.append(section); root.append(container);
});
