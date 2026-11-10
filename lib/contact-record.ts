/** Values for datetime-local use the operator's timezone, not a truncated UTC ISO string. */
export function toLocalDateTimeValue(date = new Date()): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseLocalDateTime(value: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) && toLocalDateTimeValue(date) === value ? date : null;
}

export function prepareContactDates(input: {
    contactDate: string; followUpDate: string; notes: string;
    type?: string; result?: string;
}, now = new Date()) {
    const occurred = parseLocalDateTime(input.contactDate);
    if (!occurred || occurred.getTime() > now.getTime() + 60_000) {
        throw new Error('Informe uma data válida, não futura, para o atendimento realizado.');
    }
    const notes = input.notes.trim();
    if (notes.length > 4000) throw new Error('O detalhamento deve ter no máximo 4.000 caracteres.');
    const requiresReturn = input.type === 'retorno_agendado' || input.result === 'retorno_agendado';
    if (requiresReturn && !input.followUpDate) throw new Error('Informe a data do próximo follow-up para registrar um retorno agendado.');
    const next = input.followUpDate ? parseLocalDateTime(input.followUpDate) : null;
    if (input.followUpDate && (!next || next <= occurred || next.getTime() < now.getTime() - 60_000)) {
        throw new Error('O próximo follow-up deve ocorrer após o atendimento e não pode estar no passado.');
    }
    return { contactDate: occurred.toISOString(), followUpDate: next?.toISOString(), notes: notes || undefined };
}
