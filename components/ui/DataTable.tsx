import React, { useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { SortOrder } from '../../types';
import { TableBodySkeleton } from './Skeletons';
import { EmptyState } from './EmptyState';

const DEFAULT_PINNED_WIDTH = 160;

export interface DataTableColumn<T> {
  key: string;
  label: string;
  /** Campo enviado à API para ordenação. Se omitido, usa key (quando sortable). */
  sortKey?: string;
  /** Se false, coluna não é ordenável. Default true. */
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  render?: (item: T) => React.ReactNode;
  /** Cabeçalho customizado (substitui o texto de `label` na célula th). */
  headerRender?: () => React.ReactNode;
  className?: string;
  /** Fixar coluna à esquerda ou à direita no scroll horizontal. */
  pin?: 'left' | 'right';
  /** Largura em px para colunas fixas (cálculo do offset sticky). */
  width?: number;
}

export interface DataTablePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DataTableRowSelection<T> {
  selectedKeys: ReadonlySet<string>;
  onSelectedKeysChange: (next: Set<string>) => void;
  getRowKey: (item: T) => string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  pagination: DataTablePagination;
  sortBy?: string;
  sortOrder?: SortOrder;
  onSort?: (sortBy: string, sortOrder: SortOrder) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  isLoading?: boolean;
  emptyMessage?: string;
  rowKey: (item: T) => string;
  onRowClick?: (item: T) => void;
  /** Oculta o rodapé (contagem + paginação), útil em listas sem paginação no servidor. */
  hidePaginationFooter?: boolean;
  /** Seleção por checkbox (página atual). */
  rowSelection?: DataTableRowSelection<T>;
}

function getEffectiveSortKey<T>(col: DataTableColumn<T>, onSort?: (sortBy: string, sortOrder: SortOrder) => void): string | null {
  if (!onSort || col.sortable === false) return null;
  return col.sortKey ?? col.key;
}

function getPinWidth<T>(col: DataTableColumn<T>): number {
  return col.width ?? DEFAULT_PINNED_WIDTH;
}

const HEADER_BG = '#f8fafc';
const BODY_BG = '#ffffff';

export function DataTable<T>({
  columns,
  data,
  pagination,
  sortBy,
  sortOrder,
  onSort,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  isLoading,
  emptyMessage = 'Nenhum registro encontrado.',
  rowKey,
  onRowClick,
  hidePaginationFooter = false,
  rowSelection,
}: DataTableProps<T>) {
  const handleSort = (effectiveSortKey: string) => {
    if (!onSort) return;
    const nextOrder =
      sortBy === effectiveSortKey && sortOrder === SortOrder.ASC
        ? SortOrder.DESC
        : SortOrder.ASC;
    onSort(effectiveSortKey, nextOrder);
  };

  const selectionColumn: DataTableColumn<T> | null = useMemo(() => {
    if (!rowSelection) return null;
    const rs = rowSelection;
    return {
      key: '__select__',
      label: '',
      sortable: false,
      pin: 'left',
      width: 44,
      headerRender: () => {
        const keysOnPage = data.map((item) => rs.getRowKey(item));
        const selectedOnPage = keysOnPage.filter((k) => rs.selectedKeys.has(k));
        const all = keysOnPage.length > 0 && selectedOnPage.length === keysOnPage.length;
        const some = selectedOnPage.length > 0 && !all;
        return (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-salesforce-blue focus:ring-salesforce-blue/30"
            checked={all}
            ref={(el) => {
              if (el) el.indeterminate = some;
            }}
            onChange={(e) => {
              const next = new Set(rs.selectedKeys);
              if (e.target.checked) {
                keysOnPage.forEach((k) => next.add(k));
              } else {
                keysOnPage.forEach((k) => next.delete(k));
              }
              rs.onSelectedKeysChange(next);
            }}
            aria-label="Selecionar todos na página"
          />
        );
      },
      render: (item) => {
        const id = rs.getRowKey(item);
        const checked = rs.selectedKeys.has(id);
        return (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-salesforce-blue focus:ring-salesforce-blue/30"
            checked={checked}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              const next = new Set(rs.selectedKeys);
              if (e.target.checked) next.add(id);
              else next.delete(id);
              rs.onSelectedKeysChange(next);
            }}
            aria-label="Selecionar linha"
          />
        );
      },
    };
  }, [rowSelection, data]);

  const effectiveColumns = useMemo(
    () => (selectionColumn ? [selectionColumn, ...columns] : columns),
    [selectionColumn, columns],
  );

  const { page, limit, total, totalPages } = pagination;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const { leftPinned, normal, rightPinned } = useMemo(() => {
    const left: DataTableColumn<T>[] = [];
    const mid: DataTableColumn<T>[] = [];
    const right: DataTableColumn<T>[] = [];
    effectiveColumns.forEach((col) => {
      if (col.pin === 'left') left.push(col);
      else if (col.pin === 'right') right.push(col);
      else mid.push(col);
    });
    return { leftPinned: left, normal: mid, rightPinned: right };
  }, [effectiveColumns]);

  const leftOffsets = useMemo(() => {
    let acc = 0;
    return leftPinned.map((col) => {
      const w = getPinWidth(col);
      const offset = acc;
      acc += w;
      return { key: col.key, left: offset, width: w };
    });
  }, [leftPinned]);

  const rightOffsets = useMemo(() => {
    let acc = 0;
    const result: { key: string; right: number; width: number }[] = [];
    for (let i = rightPinned.length - 1; i >= 0; i--) {
      const col = rightPinned[i];
      const w = getPinWidth(col);
      result.push({ key: col.key, right: acc, width: w });
      acc += w;
    }
    return result;
  }, [rightPinned]);

  const orderedColumns = useMemo(
    () => [...leftPinned, ...normal, ...rightPinned],
    [leftPinned, normal, rightPinned],
  );

  const colSpan = effectiveColumns.length;

  const getStickyStyle = (col: DataTableColumn<T>, isHeader: boolean): React.CSSProperties => {
    const bg = isHeader ? HEADER_BG : BODY_BG;
    if (col.pin === 'left') {
      const info = leftOffsets.find((o) => o.key === col.key);
      if (!info) return {};
      return {
        position: 'sticky',
        left: info.left,
        width: info.width,
        minWidth: info.width,
        maxWidth: info.width,
        zIndex: 2,
        backgroundColor: bg,
        boxShadow: info.left > 0 ? '4px 0 8px -4px rgba(0,0,0,0.08)' : undefined,
      };
    }
    if (col.pin === 'right') {
      const info = rightOffsets.find((o) => o.key === col.key);
      if (!info) return {};
      return {
        position: 'sticky',
        right: info.right,
        width: info.width,
        minWidth: info.width,
        maxWidth: info.width,
        zIndex: 2,
        backgroundColor: bg,
        boxShadow: info.right > 0 ? '-4px 0 8px -4px rgba(0,0,0,0.08)' : undefined,
      };
    }
    return {};
  };

  return (
    <div className="overflow-x-auto rounded-b-lg overflow-hidden">
      <table className="min-w-full border-collapse">
        <thead className="bg-[#f8fafc]">
          <tr className="border-b border-slate-200">
            {orderedColumns.map((col) => {
              const effectiveSortKey = getEffectiveSortKey(col, onSort);
              const isSortable = Boolean(effectiveSortKey);
              const isActive = sortBy === effectiveSortKey;
              return (
                <th
                  key={col.key}
                  scope="col"
                  style={getStickyStyle(col, true)}
                  aria-sort={
                    isSortable
                      ? isActive
                        ? sortOrder === SortOrder.ASC
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                      : undefined
                  }
                  tabIndex={isSortable ? 0 : undefined}
                  onKeyDown={
                    isSortable
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSort(effectiveSortKey!);
                          }
                        }
                      : undefined
                  }
                  className={`
                    px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider
                    text-slate-600
                    ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                    ${isSortable
                      ? 'cursor-pointer select-none hover:text-salesforce-blue hover:bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-salesforce-blue/30'
                      : ''}
                  `}
                  onClick={() => isSortable && handleSort(effectiveSortKey!)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.headerRender ? col.headerRender() : col.label}
                    {isSortable && isActive && (
                      <span className="text-salesforce-blue" aria-hidden>
                        {sortOrder === SortOrder.ASC ? (
                          <ChevronUp size={14} className="flex-shrink-0" />
                        ) : (
                          <ChevronDown size={14} className="flex-shrink-0" />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="bg-white">
          {isLoading ? (
            <TableBodySkeleton columns={colSpan} rows={Math.min(6, pagination.limit)} />
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="p-0 align-top">
                <EmptyState title={emptyMessage} compact />
              </td>
            </tr>
          ) : (
            data.map((item, rowIndex) => (
              <tr
                key={rowKey(item)}
                onClick={() => onRowClick?.(item)}
                className={`
                  border-b border-slate-100 last:border-b-0
                  transition-colors duration-150
                  ${onRowClick ? 'cursor-pointer' : ''}
                  hover:bg-slate-50/90
                `}
              >
                {orderedColumns.map((col) => (
                  <td
                    key={col.key}
                    style={getStickyStyle(col, false)}
                    className={`
                      px-5 py-3.5 text-sm text-slate-700
                      ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                      ${col.className ?? ''}
                    `}
                  >
                    {col.render ? col.render(item) : (item as Record<string, unknown>)[col.key] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {!hidePaginationFooter && (
        <footer
          className="flex flex-wrap justify-between items-center gap-4 px-5 py-3.5 bg-slate-50 border-t border-slate-200"
          role="region"
          aria-label="Paginação da tabela"
        >
          <p className="text-sm text-slate-600 tabular-nums">
            <span className="font-medium text-slate-700">{start}</span>
            <span className="mx-1">–</span>
            <span className="font-medium text-slate-700">{end}</span>
            <span className="ml-1">de {total} registro(s)</span>
          </p>
          <div className="flex items-center gap-2">
            {onPageSizeChange && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <span>Por página</span>
                <select
                  value={limit}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700"
                >
                  {pageSizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            )}
          {onPageChange && (
            <nav className="flex items-center gap-1" aria-label="Navegação de páginas">
              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-salesforce-blue/30 focus:border-salesforce-blue disabled:opacity-50 disabled:pointer-events-none disabled:hover:bg-white disabled:hover:border-slate-300 transition-colors"
                aria-label="Página anterior"
              >
                <ChevronLeft size={18} aria-hidden />
                Anterior
              </button>
              <span className="px-3 py-2 text-sm text-slate-600 min-w-[7rem] text-center">
                Página <span className="font-semibold text-slate-800">{page}</span> de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-salesforce-blue/30 focus:border-salesforce-blue disabled:opacity-50 disabled:pointer-events-none disabled:hover:bg-white disabled:hover:border-slate-300 transition-colors"
                aria-label="Próxima página"
              >
                Próximo
                <ChevronRight size={18} aria-hidden />
              </button>
            </nav>
          )}
          </div>
        </footer>
      )}
    </div>
  );
}
