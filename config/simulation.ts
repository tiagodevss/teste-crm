import { View } from '../routes';
import { constants } from './constants';

const CRITICAL_VIEWS: View[] = [
  'indicadores',
  'crm',
  'clients',
  'goals',
  'campaigns',
  'users',
  'profiles',
  'hierarchy',
  'cold-leads',
  'acessorias',
];

const criticalViewSet = new Set<View>(CRITICAL_VIEWS);

const isSimulationMode = constants.simulation.mode === 'mock';
const allowCriticalInSimulation = constants.simulation.allowCritical;

const simulationLabel = constants.simulation.mode;
const indicatorText = isSimulationMode
  ? 'Modo simulado ativo (relaxe para navegar em áreas não críticas).'
  : 'Conectado ao backend real.';

export const simulationPolicy = {
  isSimulationMode,
  allowCriticalInSimulation,
  simulationFlagName: 'simulation.mode',
  allowCriticalFlagName: 'simulation.allowCritical',
  simulationLabel,
  indicatorText,
  criticalViews: CRITICAL_VIEWS,

  isCriticalView(view: View) {
    return criticalViewSet.has(view);
  },

  shouldBlockView(view: View) {
    return this.isSimulationMode && !this.allowCriticalInSimulation && this.isCriticalView(view);
  },

  canUseMockForView(view: View) {
    if (!this.isSimulationMode) return false;
    return !this.shouldBlockView(view);
  },

  logStatus() {
    if (this.isSimulationMode) {
      console.warn(
        'Modo ativo. Jornadas não críticas usam mocks. Desative  ou defina =true para liberar todas as rotas.',
      );
    } else {
      console.info('Modo real ativo. Desative a simulação para evitar interceptações MSW.');
    }
  },
};
