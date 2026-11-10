/** Corrige nomes UTF-8 que chegaram ao navegador como Latin-1 (mojibake). */
export function displayFileName(value: string): string {
  if (!/[\u00c2\u00c3\u00e2][\u0080-\u00bf]/.test(value)) return value;

  try {
    if ([...value].some((character) => character.codePointAt(0)! > 0xff)) return value;
    const bytes = Uint8Array.from(value, (character) => character.charCodeAt(0));
    const normalized = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const originalBytes = new TextEncoder().encode(normalized);
    return originalBytes.length === bytes.length && originalBytes.every((byte, index) => byte === bytes[index])
      ? normalized
      : value;
  } catch {
    return value;
  }
}
