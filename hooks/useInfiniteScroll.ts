import { useEffect, useRef } from 'react';

/**
 * Hook para infinite scroll usando IntersectionObserver.
 * Ao cruzar o elemento sentinela (no final do container), chama o callback.
 * @param callback - Função chamada ao chegar ao fim do scroll
 * @param hasMore - Se há mais itens para carregar
 * @param isLoading - Se está carregando (evita chamadas duplicadas)
 */
export function useInfiniteScroll(
  callback: () => void,
  hasMore: boolean,
  isLoading: boolean
) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting && hasMore && !isLoading) {
          callbackRef.current();
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading]);

  return sentinelRef;
}
