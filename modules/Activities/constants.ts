export const APPOINTMENT_TYPE_LABEL: Record<string, string> = {
  meeting: 'Reunião',
  visit: 'Visita',
  follow_up: 'Retorno',
  external: 'Externo',
  networking: 'Networking',
};

export const APPOINTMENT_CHANNEL_LABEL: Record<string, string> = {
  in_person: 'Presencial',
  phone: 'Telefone',
  video_call: 'Vídeo',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
};

export const APPOINTMENT_STATUS_LABEL: Record<string, string> = {
  scheduled: 'Agendado',
  completed: 'Concluído',
  canceled: 'Cancelado',
  no_show: 'Não compareceu',
};

export const APPOINTMENT_STATUS_CLASS: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  canceled: 'bg-red-50 text-red-700 border-red-200',
  no_show: 'bg-amber-50 text-amber-700 border-amber-200',
};
