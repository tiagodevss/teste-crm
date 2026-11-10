const INVALID_REPEATED_PHONE_PATTERN = /^(\d)\1+$/;
const INVALID_SEQUENTIAL_PHONES = new Set(['0123456789','1234567890','9876543210','01234567890','12345678901','98765432109']);
function normalizeBrazilPhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) digits = digits.slice(2);
  return digits;
}
export function isPlausibleBrazilPhone(value: string): boolean {
  const digits = normalizeBrazilPhoneDigits(value);
  if (digits.length !== 10 && digits.length !== 11) return false;
  if (INVALID_REPEATED_PHONE_PATTERN.test(digits)) return false;
  if (INVALID_SEQUENTIAL_PHONES.has(digits)) return false;
  const ddd = digits.slice(0, 2);
  if (ddd[0] === '0' || ddd[1] === '0') return false;
  const localNumber = digits.slice(2);
  if (digits.length === 11 && localNumber[0] !== '9') return false;
  if (digits.length === 10 && localNumber[0] === '0') return false;
  return true;
}
