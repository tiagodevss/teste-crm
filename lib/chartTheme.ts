/** Recharts tokens aligned with DESIGN.md neutral and semantic palette. */
export const CHART_AXIS_TICK = { fill: '#6b7280', fontSize: 12 } as const;
export const CHART_AXIS_TICK_SM = { fill: '#6b7280', fontSize: 11 } as const;
export const CHART_GRID_STROKE = '#e5e7eb';
export const CHART_GRID_STROKE_LIGHT = '#f0f0f0';
export const CHART_CURSOR_FILL = '#f3f4f6';

export const CHART_COLORS = {
  actionBlue: '#0176d3',
  unitFinance: '#2563eb',
  unitAccounting: '#10b981',
  statusWarning: '#d97706',
  statusError: '#dc2626',
  statusSuccess: '#059669',
  inkMuted: '#6b7280',
  inkSecondary: '#374151',
} as const;

export const CHART_PIE_FALLBACK = CHART_COLORS.inkMuted;
