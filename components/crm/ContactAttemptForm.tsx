import React from 'react';
import type { ContactActivityType, ContactChannel, ContactResult } from '../../types';
import { toLocalDateTimeValue } from '../../lib/contact-record';
import { Tooltip } from '../ui/Tooltip';

const NEXT_APPOINTMENT_TOOLTIP =
  'Cria ou reagenda o retorno na agenda do responsável pelo cadastro, sem alterar o prazo de resposta do cliente.';

export interface ContactAttemptFormProps {
  contactType: ContactActivityType;
  onContactTypeChange: (value: ContactActivityType) => void;
  contactChannel: ContactChannel;
  onContactChannelChange: (value: ContactChannel) => void;
  contactResult: ContactResult;
  onContactResultChange: (value: ContactResult) => void;
  contactNotes: string;
  onContactNotesChange: (value: string) => void;
  contactEffectiveAt: string;
  onContactEffectiveAtChange?: (value: string) => void;
  error?: string | null;
  canEdit?: boolean;
  followUpDate: string;
  onFollowUpDateChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  notesId?: string;
}

const selectClass =
  'mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-salesforce-blue/20 focus:border-salesforce-blue';

export function ContactAttemptForm({
  contactType,
  onContactTypeChange,
  contactChannel,
  onContactChannelChange,
  contactResult,
  onContactResultChange,
  contactNotes,
  onContactNotesChange,
  contactEffectiveAt,
  onContactEffectiveAtChange,
  error,
  canEdit = true,
  followUpDate,
  onFollowUpDateChange,
  onSubmit,
  isSubmitting,
  notesId = 'contact-notes',
}: ContactAttemptFormProps) {
  const requiresFollowUp = contactType === 'retorno_agendado' || contactResult === 'retorno_agendado';
  return (
    <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <fieldset disabled={isSubmitting || !canEdit} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 disabled:opacity-70">
      <label className="text-sm text-gray-700">
        Tipo
        <select
          className={selectClass}
          value={contactType}
          onChange={(e) => onContactTypeChange(e.target.value as ContactActivityType)}
        >
          <option value="ligacao_realizada">Ligação realizada</option>
          <option value="ligacao_nao_atendida">Ligação não atendida</option>
          <option value="whatsapp_enviado">WhatsApp enviado</option>
          <option value="instagram_enviado">Instagram enviado</option>
          <option value="email_enviado">E-mail enviado</option>
          <option value="retorno_agendado">Retorno agendado</option>
        </select>
      </label>
      <label className="text-sm text-gray-700">
        Canal
        <select
          className={selectClass}
          value={contactChannel}
          onChange={(e) => onContactChannelChange(e.target.value as ContactChannel)}
        >
          <option value="telefone">Telefone</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="instagram">Instagram</option>
          <option value="email">E-mail</option>
          <option value="outro">Outro</option>
        </select>
      </label>
      <label className="text-sm text-gray-700">
        Resultado
        <select
          className={selectClass}
          value={contactResult}
          onChange={(e) => onContactResultChange(e.target.value as ContactResult)}
        >
          <option value="sucesso">Sucesso</option>
          <option value="sem_resposta">Sem resposta</option>
          <option value="caixa_postal">Caixa postal</option>
          <option value="numero_invalido">Número inválido</option>
          <option value="interessado">Interessado</option>
          <option value="sem_interesse">Sem interesse</option>
          <option value="retorno_agendado">Retorno agendado</option>
          <option value="outro">Outro</option>
        </select>
      </label>
      <label className="text-sm text-gray-700">
        Data e hora do atendimento
        <input type="datetime-local" required className={selectClass}
          value={onContactEffectiveAtChange ? contactEffectiveAt : toLocalDateTimeValue(new Date(contactEffectiveAt))} max={toLocalDateTimeValue()} readOnly={!onContactEffectiveAtChange}
          onChange={(event) => onContactEffectiveAtChange?.(event.target.value)} />
        <span className="block mt-1 text-xs text-gray-600">{onContactEffectiveAtChange ? 'Informe quando o atendimento aconteceu, inclusive em outra data.' : 'Data registrada automaticamente.'}</span>
      </label>
      <label className="text-sm text-gray-700 md:col-span-2">
        <span className="inline-flex items-center gap-1.5">
          Próximo follow-up ({requiresFollowUp ? 'obrigatório' : 'opcional'})
          <Tooltip content={NEXT_APPOINTMENT_TOOLTIP} placement="top" />
        </span>
        <input
          type="datetime-local"
          className={selectClass}
          value={followUpDate}
          required={requiresFollowUp}
          onChange={(e) => onFollowUpDateChange(e.target.value)}
        />
      </label>
      <label className="text-sm text-gray-700 md:col-span-2 block">
        Detalhamento do atendimento
        <textarea
          id={notesId}
          value={contactNotes}
          onChange={(e) => onContactNotesChange(e.target.value)}
          placeholder="O que foi tratado, resposta do cliente e próximos passos..."
          maxLength={4000}
          aria-describedby={`${notesId}-help`}
          className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-salesforce-blue/20 focus:border-salesforce-blue outline-none resize-none h-28 text-sm placeholder:text-gray-500"
        />
        <span id={`${notesId}-help`} className="block mt-1 text-xs text-gray-600">{contactNotes.length}/4.000 caracteres. O registro guardará data, horário e autor.</span>
      </label>
      {error && <p role="alert" className="md:col-span-2 text-sm text-red-700">{error}</p>}
      {!canEdit && <p className="md:col-span-2 text-sm text-gray-600">Seu perfil tem acesso somente para consulta neste cadastro.</p>}
      <div className="md:col-span-2 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-salesforce-blue text-white rounded-lg hover:bg-salesforce-hover transition-colors font-semibold disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-salesforce-blue/30"
        >
          {isSubmitting ? 'Registrando...' : 'Registrar atendimento'}
        </button>
      </div>
      </fieldset>
    </form>
  );
}
