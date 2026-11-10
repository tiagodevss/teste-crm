import React from 'react';
import { HelpCircle } from 'lucide-react';

export interface ClientsHelpPanelProps {
  variant: 'list' | 'detail';
}

export function ClientsHelpPanel({ variant }: ClientsHelpPanelProps) {
  return (
    <details className="rounded-lg border border-gray-200 bg-white shadow-sm group">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-salesforce-blue/30">
        <HelpCircle size={16} className="text-salesforce-blue shrink-0" aria-hidden />
        Como usar {variant === 'list' ? 'a lista de clientes' : 'a ficha do cliente'}
        <span className="ml-auto text-xs text-gray-400 group-open:hidden">Expandir</span>
      </summary>
      <div className="border-t border-gray-100 px-4 py-3 text-sm text-gray-600 space-y-2 leading-relaxed">
        {variant === 'list' ? (
          <>
            <p>
              <strong>Ativos</strong> mostra clientes em acompanhamento. <strong>Repescagem</strong> lista quem está há 30+ dias sem contato registrado.
            </p>
            <p>
              <strong>Última ação</strong> é a data do último contato ou evento comercial. <strong>Dias s/ ação</strong> conta quantos dias se passaram desde então — valores em destaque entram na repescagem.
            </p>
            <p>Use <strong>Filtros</strong> para refinar e remova chips ativos sem reabrir o painel. Pressione <kbd className="rounded border border-gray-300 bg-gray-50 px-1">/</kbd> para focar a busca.</p>
          </>
        ) : (
          <>
            <p>
              <strong>Registrar contato</strong> grava uma anotação comercial e atualiza a última ação do cliente, retirando-o da repescagem quando aplicável.
            </p>
            <p>
              A <strong>linha do tempo</strong> à direita registra eventos automáticos do sistema; comentários ficam à esquerda para não misturar conversa interna com histórico operacional.
            </p>
            <p>Contratos refletem produtos vendidos. Suspender ou cancelar exige confirmação e pode ser revertido com Reativar quando suspenso.</p>
          </>
        )}
      </div>
    </details>
  );
}
