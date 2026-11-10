import type { ClientsFilterValues, ClientsListMode } from './index';

export interface ActiveFilterChip {
  key: keyof ClientsFilterValues | 'search';
  label: string;
}

function formatDateLabel(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function countActiveFilters(
  filters: ClientsFilterValues,
  listMode: ClientsListMode,
  searchTerm?: string,
): number {
  let count = searchTerm?.trim() ? 1 : 0;
  if (filters.city) count++;
  if (filters.responsibleUserId) count++;
  if (filters.dateFrom || filters.dateTo) count++;
  if (filters.company) count++;
  if (filters.email) count++;
  if (filters.phone) count++;
  if (filters.createdAtFrom || filters.createdAtTo) count++;
  if (filters.cpfCnpj) count++;
  if (listMode !== 'repescagem') {
    if (filters.minDaysWithoutAction) count++;
    if (filters.withoutActionOnly) count++;
  }
  return count;
}

export function getActiveFilterChips(
  filters: ClientsFilterValues,
  listMode: ClientsListMode,
  usersById: Map<string, string>,
  searchTerm?: string,
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  if (searchTerm?.trim()) {
    chips.push({ key: 'search', label: `Busca: ${searchTerm.trim()}` });
  }
  if (filters.city) chips.push({ key: 'city', label: `Cidade: ${filters.city}` });
  if (filters.responsibleUserId) {
    const name = usersById.get(filters.responsibleUserId) ?? filters.responsibleUserId;
    chips.push({ key: 'responsibleUserId', label: `Responsável: ${name}` });
  }
  if (filters.dateFrom || filters.dateTo) {
    const from = filters.dateFrom ? formatDateLabel(filters.dateFrom) : '…';
    const to = filters.dateTo ? formatDateLabel(filters.dateTo) : '…';
    chips.push({ key: 'dateFrom', label: `Último contato: ${from} – ${to}` });
  }
  if (filters.company) chips.push({ key: 'company', label: `Empresa: ${filters.company}` });
  if (filters.email) chips.push({ key: 'email', label: `E-mail: ${filters.email}` });
  if (filters.phone) chips.push({ key: 'phone', label: `Telefone: ${filters.phone}` });
  if (filters.createdAtFrom || filters.createdAtTo) {
    const from = filters.createdAtFrom ? formatDateLabel(filters.createdAtFrom) : '…';
    const to = filters.createdAtTo ? formatDateLabel(filters.createdAtTo) : '…';
    chips.push({ key: 'createdAtFrom', label: `Cadastro: ${from} – ${to}` });
  }
  if (filters.cpfCnpj) chips.push({ key: 'cpfCnpj', label: `CPF/CNPJ: ${filters.cpfCnpj}` });
  if (listMode !== 'repescagem') {
    if (filters.minDaysWithoutAction) {
      chips.push({
        key: 'minDaysWithoutAction',
        label: `Mín. ${filters.minDaysWithoutAction} dias sem ação`,
      });
    }
    if (filters.withoutActionOnly) {
      chips.push({ key: 'withoutActionOnly', label: 'Sem ação recente' });
    }
  }

  return chips;
}
