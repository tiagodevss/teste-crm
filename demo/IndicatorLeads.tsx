import React, { useState } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search } from 'lucide-react';
import { api } from '../lib/axios';
import { DataTable } from '../components/ui/DataTable';
import { formatCurrency, formatDate } from '../utils/formatters';
import type { Lead, PaginatedResponse, UserProfile } from '../types';
import { SortOrder } from '../types';
import { getLeadDetailPath } from '../routes';

/** Demo adapter: rows still come from the same API and canonical state. */
export default function IndicatorLeads() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') || '');
  const query = new URLSearchParams(params);
  query.set('page', params.get('page') || '1');
  query.set('limit', '20');
  const result = useQuery({ queryKey: ['demo-indicator-leads', query.toString()], queryFn: async () => (await api.get<PaginatedResponse<Lead>>(`/leads?${query}`)).data });
  const users = useQuery({ queryKey: ['demo-indicator-users'], queryFn: async () => (await api.get<PaginatedResponse<UserProfile>>('/users?limit=200')).data.data });
  const operation = params.get('operation');
  const label = operation === 'accounting' ? 'Contabilidade' : operation === 'financial' ? 'Financeira' : 'Geral';
  const owner = users.data?.find(u => u.id === params.get('ownerUserId'))?.name;
  const update = (values: Record<string, string>) => { const next = new URLSearchParams(params); Object.entries(values).forEach(([k, v]) => v ? next.set(k, v) : next.delete(k)); setParams(next); };
  return <section className="space-y-5">
    <NavLink to={`/indicadores/${operation === 'accounting' ? 'contabilidade' : operation === 'financial' ? 'financeira' : 'geral'}`} className="inline-flex items-center gap-2 text-sm text-salesforce-blue font-semibold"><ArrowLeft size={16} aria-hidden />Voltar aos indicadores</NavLink>
    <div><h1 className="text-2xl font-bold">Registros do indicador</h1><p className="text-sm text-gray-600 mt-2">{label} - Mesma base utilizada no painel. Clique em um nome para abrir o atendimento.</p></div>
    <div className="text-sm text-gray-700 leading-relaxed" aria-label="Filtros do indicador">
      Período de criação: {params.get('dateFrom') ? formatDate(params.get('dateFrom')!) : 'Início'} a {params.get('dateTo') ? formatDate(params.get('dateTo')!) : 'Hoje'}.
      {owner && ` Responsável: ${owner}.`} {params.get('status') && ` Status: ${params.get('status')}.`} {params.get('stage') && ` Etapa: ${params.get('stage')}.`} {params.get('slaStatus') && ' Prazo de atendimento vencido.'}
    </div>
    <form className="flex gap-2 flex-wrap" onSubmit={e => { e.preventDefault(); update({ search: search.trim(), page: '1' }); }}><label className="sr-only" htmlFor="demo-indicator-search">Pesquisar registros</label><input id="demo-indicator-search" className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-80 max-w-full" value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar nome ou empresa" /><button className="demo-button" type="submit"><Search size={16} aria-hidden />Pesquisar</button></form>
    {result.isError ? <div role="alert" className="demo-error">Não foi possível consultar os registros. <button className="demo-button" onClick={() => void result.refetch()}>Tentar novamente</button></div> : <DataTable<Lead>
      data={result.data?.data || []} rowKey={lead => lead.id}
      pagination={result.data || { page: 1, limit: 20, total: 0, totalPages: 1 }} isLoading={result.isLoading}
      onPageChange={page => update({ page: String(page) })}
      sortBy={params.get('sortBy') || 'createdAt'} sortOrder={params.get('sortOrder') === 'asc' ? SortOrder.ASC : SortOrder.DESC}
      onSort={(sortBy, sortOrder) => update({ sortBy, sortOrder, page: '1' })}
      columns={[
        { key: 'name', label: 'Nome / empresa', render: lead => <NavLink className="text-salesforce-blue font-semibold underline underline-offset-2" to={getLeadDetailPath(lead.id)}>{lead.name}</NavLink> },
        { key: 'stage', label: 'Etapa' }, { key: 'status', label: 'Status' },
        { key: 'value', label: 'Valor da oportunidade', align: 'right', render: lead => formatCurrency(lead.value) },
        { key: 'createdAt', label: 'Criado em', render: lead => formatDate(lead.createdAt || '') },
      ]} emptyMessage="Nenhum registro corresponde a esses filtros." />}
  </section>;
}
