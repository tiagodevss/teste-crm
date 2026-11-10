/** A response may only update the query and page request that created it. */
export function createLatestRequestTracker() {
  let scope = '';
  let sequence = 0;
  const requests = new Map<string, number>();
  return {
    setScope(next: string) {
      if (scope !== next) { scope = next; requests.clear(); }
    },
    begin(expectedScope: string, key: string): () => boolean {
      if (expectedScope !== scope) return () => false;
      const id = ++sequence;
      requests.set(key, id);
      return () => scope === expectedScope && requests.get(key) === id;
    },
    invalidate() { requests.clear(); },
  };
}
