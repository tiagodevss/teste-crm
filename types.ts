import { View } from './routes';

// Global Enums
export enum LeadStatus {
    LEAD = 'Lead',
    OPORTUNIDADE = 'Oportunidade',
    CLIENTE = 'Cliente',
    PERDIDO = 'Perdido'
  }
  
  export enum ProductType {
    SERVICE = 'Serviço',
    PRODUCT = 'Produto'
  }

export type CampaignCommissionType = 'fixed' | 'variable' | 'none';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'finished';

export enum PipeUnitType {
  GERAL = 'GERAL',
  CONTABILIDADE = 'CONTABILIDADE',
}

export enum DashboardUnitView {
  CONTABILIDADE = 'CONTABILIDADE',
}

export enum UserRole {
  ADMIN = 'ADMIN',
  OPERADOR = 'OPERADOR', // Colaborador
  IMOBILIARIA = 'IMOBILIARIA' // Parceiro Externo
}

export type PermissionOperation = 'read' | 'create' | 'edit' | 'delete' | 'export' | 'configure' | 'admin' | 'manage';

export const PERMISSION_OPERATIONS: PermissionOperation[] = [
  'read',
  'create',
  'edit',
  'delete',
  'export',
  'configure',
  'admin',
  'manage',
];

export type ViewPermissionAction = `${View}.${PermissionOperation}`;

export type DomainPermissionAction =
  | 'lead-appointments.read'
  | 'lead-appointments.create'
  | 'lead-appointments.edit'
  | 'lead-appointments.delete'
  | 'lead-appointments.manage'
  | 'department-tasks.read'
  | 'department-tasks.create'
  | 'department-tasks.edit'
  | 'department-tasks.delete'
  | 'department-tasks.manage'
  | 'activity-reports.read'
  | 'activity-reports.export'
  | 'activity-reports.manage'
  | 'lead-stage-move.execute'
  | 'proposals.create'
  | 'proposals.edit'
  | 'proposals.manage';

export type PermissionAction = ViewPermissionAction | DomainPermissionAction;

/** Nível de acesso ao funil no CRM (persistido em `Profile.permissions.pipeAccess`). */
export type PipeAccessLevel = 'none' | 'read' | 'edit';

export interface PermissionMatrix {
  navigation: Record<View, boolean>;
  actions: Record<PermissionAction, boolean>;
  /**
   * Ausente: todos os pipes permitidos pela navegação CRM.
   * Presente: apenas pipes com `read` ou `edit` são acessíveis (whitelist).
   */
  pipeAccess?: Record<string, PipeAccessLevel>;
}

  /** Id do pipe (unidade de negócio/funil). */
  export type PipeId = string;

  /** Pipe listado (lista de pipes para dropdowns e cards). */
  export interface Pipe {
    id: string;
    name: string;
    unitType?: PipeUnitType;
    /** Slug para URL (ex.: /crm/meu-pipe). Se ausente, usa id na URL. */
    slug?: string | null;
    /** Descrição exibida no card do funil (ex.: tela de seleção do CRM). */
    description?: string | null;
    /** Nome do ícone Lucide (ex.: BarChart3, Target, Kanban). */
    icon?: string | null;
    sortOrder: number;
    leadCount?: number;
  }

  /**
   * Tipo de resultado da etapa: define estilo no Kanban e nos botões da tela de detalhes do lead.
   * - default: etapa intermediária (sem marcação especial)
   * - win: resultado positivo (cliente fechado) — coluna/botão em destaque de ganho
   * - loss: resultado negativo (não fechado) — coluna/botão em destaque de perda
   */
  export type PipelineStageKind = 'default' | 'win' | 'loss';
  export type LeadSlaStatus = 'disabled' | 'on_time' | 'warning' | 'overdue';

  /**
   * Nó do fluxo (fase do Kanban). Persistido em pipelineFlow na API /settings.
   * id: identificador estável (ex: stage_FINANCEIRA_0_Triagem); name: exibido e usado em lead.stage.
   */
  export interface PipelineNodeData {
    id: string;
    name: string;
    position: { x: number; y: number };
    /** Marca a etapa como resultado de ganho (cliente) ou perda; usado para customizar Kanban e botões. */
    stageKind?: PipelineStageKind;
    /** Habilita a ação de retorno para a etapa anterior no detalhe do lead. */
    allowReturnAction?: boolean;
    /** false = etapa descontinuada (preserva histórico; some do Kanban quando vazia). */
    isActive?: boolean;
  }

  /**
   * Aresta do fluxo: define para qual fase um lead pode avançar (source -> target).
   * source/target são node.id. label = texto do botão de ação no Kanban (ex: "Enviar proposta").
   */
  export interface WorkflowPermissionRule {
    effect?: 'allow' | 'deny';
    type?: 'profile' | 'user' | 'owner' | 'admin' | 'staff' | 'partner' | 'permission';
    profileCode?: string;
    userId?: string;
    permissionAction?: PermissionAction;
    role?: string;
  }

  export type TransitionPermissionRule = WorkflowPermissionRule;

  export interface RequiredFieldsTransitionValidator {
    type: 'required_fields';
    fieldKeys: string[];
    message?: string;
  }

  export interface RequireAnyFieldTransitionValidator {
    type: 'require_any_field';
    fieldKeys: string[];
    message?: string;
  }

  export type StageTransitionValidator =
    | RequiredFieldsTransitionValidator
    | RequireAnyFieldTransitionValidator;

  export interface PipelineEdgeData {
    id: string;
    source: string;
    target: string;
    /** Nome da ação exibido no botão para avançar para a fase de destino. */
    label?: string;
    kind?: 'manual' | 'automatic' | string;
    conditions?: string;
    validators?: string;
    autoExecute?: boolean;
    permissionRules?: string;
  }

  /**
   * Fluxo do pipeline: nós (fases) + arestas (transições permitidas).
   * Ordem no Kanban = nodes ordenados por position.x. Usado em GET/PUT /settings (pipelineFlow).
   */
  export interface PipelineFlow {
    nodes: PipelineNodeData[];
    edges: PipelineEdgeData[];
  }

  /** pipelineFlow por pipe (chave = pipeId). Preenchido por GET /pipes/:id. */
  export type PipelineFlowByUnit = Record<string, PipelineFlow>;

  /** Resposta de GET /pipes/:id — pipe com steps, actions e fields. */
  export interface PipeStepDto {
    id: string;
    name: string;
    positionX: number;
    positionY: number;
    stageKind?: string;
    allowReturnAction?: boolean;
    sortOrder: number;
    /** JSON: AssignmentRule — regra de atribuição automática ao entrar na etapa. */
    assignmentRule?: string;
    permissionRules?: string;
    slaHours?: number;
    warningHours?: number;
    /** false = etapa descontinuada (some do fluxo de novos cards; histórico preservado). */
    isActive?: boolean;
    fields: { id: string; key: string; label: string; type: string; required?: boolean; placeholder?: string; options?: string; helpText?: string; section?: string; validation?: string; metadata?: string; displayRules?: string; editRules?: string; requiredRules?: string; permissionRules?: string; isActive?: boolean; sortOrder: number }[];
    fromActions: { id: string; toStepId: string; toStep: { id: string; name: string }; label?: string; kind?: string; conditions?: string; validators?: string; autoExecute?: boolean; permissionRules?: string }[];
    toActions: { id: string; fromStepId: string; fromStep: { id: string; name: string }; label?: string; kind?: string; conditions?: string; validators?: string; autoExecute?: boolean; permissionRules?: string }[];
  }
  export interface PipeFieldDto {
    id: string;
    key: string;
    label: string;
    type: string;
    required?: boolean;
    placeholder?: string;
    options?: string;
    helpText?: string;
    section?: string;
    validation?: string; // JSON: { minLength?, maxLength?, min?, max?, pattern? }
    metadata?: string;   // JSON: { defaultValue?, multiple?, format?, sourceConfig?, uiConfig? }
    displayRules?: string;
    editRules?: string;
    requiredRules?: string;
    permissionRules?: string;
    /** false = campo aposentado (sai do formulário; valor histórico preservado). */
    isActive?: boolean;
    sortOrder: number;
  }
  export interface PipeDetail {
    id: string;
    name: string;
    unitType?: PipeUnitType;
    description?: string | null;
    icon?: string | null;
    /** Se true, ao ganhar o negócio (etapa de ganho), cria/atualiza o cadastro em Clientes. */
    createClientOnFinalStage?: boolean;
    sortOrder: number;
    steps: PipeStepDto[];
    actions: { id: string; fromStepId: string; toStepId: string; label?: string; kind?: string; conditions?: string; validators?: string; autoExecute?: boolean; permissionRules?: string }[];
    fields: PipeFieldDto[];
  }

  /** Tipos de trigger para automações (estilo Pipefy/Salesforce). */
  export enum AutomationTriggerKind {
    LEAD_CREATED = 'lead_created',
    LEAD_ENTERS_STAGE = 'lead_enters_stage',
    LEAD_FIELD_UPDATED = 'lead_field_updated',
    LEAD_MOVED = 'lead_moved',
    DEADLINE_REACHED = 'deadline_reached',
    LABEL_ADDED = 'label_added',
    FIELD_CHANGED_TO = 'field_changed_to',
  }

  /** Tipos de ação para automações. */
  export enum AutomationActionKind {
    SEND_EMAIL = 'send_email',
    SEND_MESSAGE = 'send_message',
    CREATE_LEAD_IN_PIPE = 'create_lead_in_pipe',
    CREATE_NOTIFICATION = 'create_notification',
    MOVE_LEAD = 'move_lead',
    UPDATE_FIELD = 'update_field',
    ADD_LABEL = 'add_label',
    REMOVE_LABEL = 'remove_label',
    ASSIGN_USER = 'assign_user',
    ASSIGN_BY_PROFILE = 'assign_by_profile',
    ASSIGN_ROUND_ROBIN = 'assign_round_robin',
    WEBHOOK = 'webhook',
    DELAY = 'delay',
    CREATE_TASK = 'create_task',
  }

  export type AutomationConditionOperator =
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_contains'
    | 'in'
    | 'not_in'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'is_empty'
    | 'not_empty';

  export interface AutomationCondition {
    source?: 'lead' | 'trigger';
    field: string;
    operator: AutomationConditionOperator;
    value?: unknown;
  }

  export interface AutomationActionDefinition {
    kind: AutomationActionKind;
    config: Record<string, unknown>;
  }

  export type EmailTemplateVersionStrategy = 'published' | 'pinned';

  export interface SendEmailAutomationRecipientConfig {
    type: 'lead' | 'assignee' | 'users' | 'fixed' | 'dynamicField';
    userIds?: string[];
    email?: string;
    fieldKey?: string;
  }

  export interface SendEmailAutomationConfig {
    mode: 'template';
    templateId: string;
    versionStrategy?: EmailTemplateVersionStrategy;
    versionId?: string;
    to: SendEmailAutomationRecipientConfig;
    cc?: string[];
    bcc?: string[];
    replyTo?: string;
    failIfMissingEmail?: boolean;
    failIfTemplateInvalid?: boolean;
  }

  export type EmailTemplateStatus = 'draft' | 'pending_approval' | 'published' | 'archived';
  export type EmailTemplateScopeType = 'global' | 'pipe' | 'unit';

  export interface EmailTemplateVersion {
    id: string;
    versionNumber: number;
    subjectTemplate: string;
    previewText?: string;
    contentSchemaJson: string;
    changeSummary?: string;
    createdAt: string;
  }

  export interface EmailTemplate {
    id: string;
    name: string;
    slug: string;
    description?: string;
    status: EmailTemplateStatus;
    scopeType: EmailTemplateScopeType;
    scopeId?: string;
    category?: string;
    subjectTemplate: string;
    previewText?: string;
    contentSchemaJson: string;
    compiledHtml?: string;
    compiledText?: string;
    themeId?: string;
    publishedAt?: string;
    archivedAt?: string;
    createdAt: string;
    updatedAt: string;
    versions?: EmailTemplateVersion[];
  }

  export interface EmailTheme {
    id: string;
    name: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    footerHtml?: string;
    socialLinksJson: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface AutomationExecutionPolicy {
    continueOnError?: boolean;
    retryOnFailure?: boolean;
    maxRetries?: number;
    retryDelaySeconds?: number;
  }

  export interface AutomationExecutionLog {
    id: string;
    executionId: string;
    status: string;
    actionKind?: string;
    actionIndex?: number;
    message?: string;
    error?: string;
    createdAt: string;
    startedAt?: string;
    finishedAt?: string;
  }

  export interface Automation {
    id: string;
    pipeId: string;
    name: string;
    active: boolean;
    triggerKind: AutomationTriggerKind;
    triggerConfig: string;
    conditions: string;
    actions: string;
    executionPolicy: string;
    cooldownSeconds: number;
    lastRunAt?: string;
    recentLogs?: AutomationExecutionLog[];
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
  }

  /** Perfil dinâmico (backend: profiles). */
export interface Profile {
  id: string;
  name: string;
  code: string;
  isStaff: boolean;
  isAdmin: boolean;
  sortOrder?: number;
  permissions?: PermissionMatrix;
}

  // Interfaces
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  active?: boolean;
  /** Código do perfil (ex: ADMIN, ASSISTENTE). Usado para permissões e exibição. */
  role: string;
  roleLabel: string;
  /** Perfil dinâmico; usado para permissões (isAdmin, isStaff). */
  profile?: Profile;
  profileId?: string;
  avatarInitials: string;
  avatarUrl?: string;
  /** ID do parceiro associado (para role IMOBILIARIA). */
  partnerId?: string;
  /** Unidades de atendimento vinculadas (quando retornadas pela API). */
  serviceUnitIds?: string[];
  serviceUnits?: { id: string; name: string; area?: string }[];
  permissions: PermissionMatrix;
}

  /** Tipo de notificação para estilo e filtros no painel. */
  export enum NotificationKind {
    INFO = 'info',
    WARNING = 'warning',
    SLA = 'sla',
    LEAD = 'lead',
    SYSTEM = 'system',
  }

  export interface Notification {
    id: string;
    title: string;
    message: string;
    read: boolean;
    readAt?: string;
    createdAt: string;
    kind?: NotificationKind;
    /** Link opcional (ex: leadId, contractId) para navegação ao clicar. */
    link?: string;
  }

  export interface Product {
    id: string;
    name: string;
    groupId: string;
    subgroupId?: string;
    price: number;
    businessUnit?: string;
    commissionRate?: number; // Percentage
    commissionFixed?: number;
    serviceDurationMinutes?: number;
    /** Id do pipe do produto (define pipeline do lead ao cadastrar). */
    pipeId?: PipeId;
    /** Perguntas/campos específicos ao cadastrar lead para este produto. */
    leadFormFields?: FieldConfig[];
    /** Etapas do kanban pelas quais o produto passa (com flag de obrigatoriedade). */
    pipelineSteps?: ProductPipelineStepConfig[];
    /** Payload da API — etapas obrigatórias vs opcionais no kanban. */
    kanbanStagesConfig?: ProductKanbanStageConfig[];
  }

  export interface ProductPipelineStepConfig {
    stepId: string;
    stepName: string;
    required: boolean;
    included?: boolean;
  }

  /** Formulário de admin de produto — etapa do kanban selecionável. */
  export type ProductPipelineStepForm = ProductPipelineStepConfig;

  export interface ProductKanbanStageConfig {
    pipeStepId?: string;
    stepId?: string;
    required: boolean;
  }
  
  export interface ProductGroup {
    id: string;
    name: string;
    subgroups: { id: string; name: string }[];
  }

  export interface LeadLabel {
    id: string;
    pipeId: string;
    name: string;
    color: string;
    sortOrder: number;
    isActive?: boolean;
    inactivatedAt?: string;
  }

  export type LeadAppointmentType = 'meeting' | 'visit' | 'follow_up' | 'external' | 'networking' | string;
  export type LeadAppointmentChannel = 'in_person' | 'phone' | 'video_call' | 'whatsapp' | 'email' | string;
  export type LeadAppointmentStatus = 'scheduled' | 'completed' | 'canceled' | 'no_show' | string;

  export interface LeadAppointment {
    id: string;
    leadId?: string;
    prospectId?: string;
    lead?: { id: string; name: string; company?: string };
    prospect?: { id: string; name: string };
    ownerUserId: string;
    type: LeadAppointmentType;
    channel: LeadAppointmentChannel;
    scheduledAt: string;
    endsAt?: string;
    status: LeadAppointmentStatus;
    meetUrl?: string;
    location?: string;
    notes?: string;
    createdBy: string;
    canceledAt?: string;
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
    ownerUser?: { id: string; name: string; avatarInitials: string; avatarUrl?: string };
    createdByUser?: { id: string; name: string; avatarInitials: string; avatarUrl?: string };
  }

  export interface LeadLatestProposal {
    id: string;
    status: string;
    valueOffered?: number;
    sentAt?: string;
    acceptedAt?: string;
    rejectedReason?: string;
    updatedAt: string;
    isInactive?: boolean;
  }

  export interface Lead {
    id: string;
    name: string; // Autocomplete title
    company?: string;
    businessUnit?: string;
    status: LeadStatus;
    stage: string; // Pipeline Stage
    pipeId?: PipeId;
    value?: number;
    campaignId?: string;
    campaignName?: string;
    campaignStatus?: string;
    partnerId?: string;
    registeredByStaffId?: string; // Funcionário que trouxe/cadastrou (quando admin cadastra em nome de outro)
    lastContactDate?: string;
    importDate?: string; // For cold leads
    createdAt?: string;
    updatedAt?: string;
    enteredStageAt?: string;
    dueAt?: string;
    slaStatus?: LeadSlaStatus;
    slaPausedAt?: string;
    /** Produto pelo qual o lead entrou no funil (obrigatório; não confundir com contratos ao virar cliente) */
    productId?: string;
    productName?: string;
    // Client specific fields
    cpfCnpj?: string;
    address?: string;
    phone?: string;
    email?: string;
    /** Cliente — ramo de atividade (campo local, não Acessórias). */
    ramo?: string;
    /** Cliente — responsável comercial local. */
    responsibleUserId?: string;
    responsibleUser?: { id: string; name: string; avatarInitials?: string; avatarUrl?: string };
    /** Cliente — última ação registrada localmente. */
    lastActionAt?: string;
    lastActionDescription?: string;
    /** Dias sem ação (calculado no backend ou derivado de lastActionAt). */
    daysWithoutAction?: number;
    /** Dias desde a criação do cliente. */
    daysOpen?: number;
    // Máquina-de-Leads / prospecção
    category?: string;
    classification?: string;
    reviewCount?: number;
    imageUrl?: string;
    socialNetworks?: string;
    site?: string;
    neighborhood?: string;
    cep?: string;
    city?: string;
    state?: string;
    country?: string;
    locationRaw?: string;
    cid?: string;
    placeId?: string;
    mapsUrl?: string;
    /** Campos dinâmicos por etapa (formato array). */
    customFields?: CustomFieldEntry[];
    // Timeline
    timeline?: LeadTimelineEvent[];
    comments?: LeadComment[];
    /** Observação enviada ao mover etapa no Kanban (campo transitório para PUT /leads/:id). */
    kanbanObservation?: string;
    /** Payload transitório para registrar tentativa de contato no lead. */
    contactAttempt?: ContactAttemptPayload;
    /** ID do lead que originou este (quando criado por automação). */
    sourceLeadId?: string;
    /** Lead que originou este (quando criado por automação). */
    sourceLead?: LinkedLeadInfo;
    /** Leads criados por automação a partir deste. */
    linkedLeads?: LinkedLeadInfo[];
    /** Labels (etiquetas) vinculadas ao lead. */
    labels?: LeadLabel[];
    /** ID do usuário responsável operacional pelo lead. */
    ownerUserId?: string;
    /** Snapshot do responsável (para exibição sem lookup adicional). */
    owner?: { id: string; name: string; avatarInitials: string; avatarUrl?: string };
    /** Histórico de permanência por etapa. */
    stageHistory?: { id: string; stageName: string; enteredAt: string; exitedAt?: string; dueAt?: string; slaStatus: LeadSlaStatus }[];
    /** Origem comercial do prospect relacionado. */
    origin?: string;
    sourceType?: string;
    sourceSubtype?: string;
    nextAppointmentAt?: string;
    nextAppointmentType?: string;
    nextAppointmentStatus?: string;
    /** Agenda de reuniões/visitas/retornos vinculada ao lead. */
    appointments?: LeadAppointment[];
    /** Resumo da proposta mais recente (listagens CRM). */
    latestProposal?: LeadLatestProposal;
    /** Lead sinalizado manualmente como fora do fluxo padrão (API). */
    anomalyFlag?: boolean;
    anomalyDescription?: string;
    /** Aliases legados no cliente. */
    flowAnomalyFlagged?: boolean;
    flowAnomalyNote?: string;
    flowAnomalyFlaggedAt?: string;
    /** Transições liberadas pelo backend para o contexto atual do usuário/lead. */
    availableTransitions?: {
      id: string;
      toStepId: string;
      stageName: string;
      actionLabel: string;
      kind: string;
      autoExecute: boolean;
      conditions?: string;
      validators?: string;
      permissionRules?: string;
    }[];
  }

  /** Resposta de `GET /leads/dashboard` — KPIs alinhados à listagem do CRM. */
  export type LeadsDashboardView = 'admin' | 'operator';

  export interface FetchLeadsDashboardParams {
    view: LeadsDashboardView;
    dateFrom?: string;
    dateTo?: string;
    pipeId?: string;
    unitPipeId?: string;
    funnelPipeId?: string;
    unitView?: DashboardUnitView;
    businessUnit?: string;
    ownerUserId?: string;
    /** `global` = todos os pipes; `unit` = filtra por unidade (padrão). */
    dashboardScope?: 'global' | 'unit';
    /** Unidade de atendimento (ex.: SUMARÉ) — alinhado a `pipe.unitType`. */
    serviceUnit?: string;
    /** Filtra KPIs por produto principal do lead. */
    productId?: string;
  }

  export interface LeadsDashboardSnapshot {
    view: LeadsDashboardView;
    definitions: Record<string, string>;
    period: {
      dateField: 'createdAt' | 'lastContactDate' | 'importDate';
      dateFrom: string | null;
      dateTo: string | null;
    };
    kpis: {
      totalLeads: number;
      clientsCount: number;
      conversionRatePercent: number;
      totalContractedValue: number;
      activeLeads?: number;
      pipelineValue?: number;
      forecastValue?: number;
      pendingValue?: number;
    };
    byPipe: { pipeId: string; name: string; count: number }[];
    funnelByStage: { name: string; value: number }[];
    recentClients: {
      id: string;
      name: string;
      value: number;
      pipeId: string;
      productName: string | null;
    }[];
    recentLeads?: {
      id: string;
      name: string;
      stage: string;
      status: string;
      createdAt: string;
    }[];
  }

  export interface LinkedLeadInfo {
    id: string;
    name: string;
    pipeId: string;
    pipeName?: string;
    stage: string;
  }

  /** Status do prospect na fila de prospecção. */
  export type ProspectStatus = 'pendente' | 'contatado' | 'convertido' | 'nao_no_momento';

  export interface ProspectComment {
    id: string;
    text: string;
    date: string;
    userId: string;
    userName: string;
    userInitials: string;
  }

export type ProspectActivityType =
  | 'contact_registered'
  | 'ligacao_realizada'
  | 'ligacao_nao_atendida'
  | 'whatsapp_enviado'
  | 'instagram_enviado'
  | 'email_enviado'
  | 'retorno_agendado'
  | 'declined'
  | 'converted_to_lead'
  | 'reactivated'
  | 'communication_whatsapp'
  | 'communication_email'
  | 'communication_phone'
  | 'public_survey_submitted';

export type ContactActivityType =
  | 'ligacao_realizada'
  | 'ligacao_nao_atendida'
  | 'whatsapp_enviado'
  | 'instagram_enviado'
  | 'email_enviado'
  | 'retorno_agendado';

export type ContactChannel =
  | 'telefone'
  | 'whatsapp'
  | 'instagram'
  | 'email'
  | 'outro';

export type ContactResult =
  | 'sucesso'
  | 'sem_resposta'
  | 'caixa_postal'
  | 'numero_invalido'
  | 'interessado'
  | 'sem_interesse'
  | 'retorno_agendado'
  | 'outro';

export interface ContactAttemptPayload {
  type: ContactActivityType;
  channel?: ContactChannel;
  result?: ContactResult;
  notes?: string;
  contactDate?: string;
  followUpDate?: string;
  userId?: string;
  userName?: string;
}

  export interface ProspectActivityEntry {
    id: string;
    type: ProspectActivityType;
    description: string;
    date: string;
    userId?: string;
    userName?: string;
    metadata?: Record<string, unknown>;
  }

export interface Prospect {
    id: string;
    name: string;
    company?: string;
    phone?: string;
    email?: string;
    address?: string;
    category?: string;
    classification?: string;
    reviewCount?: number;
    imageUrl?: string;
    socialNetworks?: string;
    site?: string;
    neighborhood?: string;
    cep?: string;
    city?: string;
    state?: string;
    country?: string;
    locationRaw?: string;
    cid?: string;
    placeId?: string;
    mapsUrl?: string;
    cpfCnpj?: string;
    groupName?: string;
    importDate?: string;
    origin?: 'manual' | 'import' | 'public';
    sourceType?: 'manual' | 'import' | 'public' | 'campaign' | 'partner';
    sourceSubtype?: string;
    campaignId?: string;
    partnerId?: string;
    surveyAnswers?: Record<string, unknown> | unknown[];
    customFields?: Record<string, unknown> | CustomFieldEntry[];
    submittedAt?: string;
    submittedByIp?: string;
    submittedUserAgent?: string;
    submittedReferrer?: string;
    status: ProspectStatus;
    contactDate?: string;
    lastContactResult?: ContactResult;
    lastContactType?: ContactActivityType;
    /** Data em que marcou "não no momento" (para recuperação futura). */
    declinedAt?: string;
    createdAt: string;
    updatedAt: string;
    /** Comentários de usuário. */
    comments?: ProspectComment[];
    /** Registro de ações do sistema (contato registrado, recusa, conversão). */
    activityLog?: ProspectActivityEntry[];
    publicSurvey?: {
      key?: string;
      version?: string;
      answers?: Record<string, unknown>;
    };
    /** Lead criado ao converter (demonstrou interesse). */
    lead?: { id: string; name: string; stage: string; pipeId: string };
    phones?: string[];
    emails?: string[];
    assignedUserId?: string | null;
    assignedUser?: { id: string; name: string };
    contactInvalid?: boolean;
  }

  /** Origem do registro na linha do tempo (auditoria). */
  export type LeadTimelineSource = 'user' | 'system' | 'rule' | 'import';

  export type LeadTimelineEventType =
  | 'response_deadline_changed'
    | 'stage_change'
    | 'status_change'
    | 'contact_attempt'
    | 'created'
    /** Legado: comentários devem ficar só em `comments`; ignorar na UI da timeline. */
    | 'comment'
    | 'value_change'
    | 'owner_assigned'
    | 'conversion'
    | 'converted_from_prospect'
    | 'loss'
    | 'client_record_synced'
    | 'commercial_origin_updated'
    | 'proposal_created'
    | 'proposal_sent'
    | 'proposal_accepted'
    | 'proposal_rejected'
    | 'department_handoff'
    | 'department_task_status_changed'
    | 'department_task_completed'
    | 'appointment_scheduled'
    | 'appointment_updated'
    | 'appointment_status_changed'
    | 'appointment_removed';

  export interface LeadTimelineEvent {
    id: string;
    type: LeadTimelineEventType;
    description: string;
    date: string;
    userId?: string;
    userName?: string;
    source?: LeadTimelineSource;
    metadata?: Record<string, unknown>;
  }

  export interface LeadComment {
    id: string;
    text: string;
    date: string;
    userId: string;
    userName: string;
    userInitials: string;
  }

  export type FieldConfigType =
    | 'text' | 'number' | 'select' | 'currency' | 'checkbox' | 'attachment'
    | 'date' | 'datetime' | 'email' | 'phone' | 'cpf_cnpj' | 'multi_select'
    | 'user' | 'label' | 'url' | 'textarea' | 'formula'
    | 'info' | 'string_list';

  /** Stored custom field entry with metadata (key, label, type, stage, value or url/fileName for attachment). */
  export interface CustomFieldEntry {
    key: string;
    label: string;
    type: FieldConfigType;
    stage: string;
    value?: string | number | boolean | string[] | null;
    url?: string;
    fileName?: string;
    /** Id do upload privado (anexos privados). */
    uploadId?: string;
    /** Anexos múltiplos: lista completa; o primeiro espelha url/fileName/uploadId. */
    files?: Array<{ url: string; fileName?: string; uploadId?: string }>;
    /** Origem de um snapshot somente leitura (ex.: CREDITO). */
    origin?: string;
  }

  export interface FieldValidation {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string; // regex em string
  }

  // --- Regras condicionais de campos ---

  export type FieldRuleOperator =
    | 'eq' | 'neq' | 'in' | 'nin'
    | 'gt' | 'gte' | 'lt' | 'lte'
    | 'empty' | 'not_empty';

  export interface FieldRuleCondition {
    field: string;
    op: FieldRuleOperator;
    value?: string | number | boolean | string[];
  }

  export interface StageRuleCondition {
    stage: string;
    op: 'eq' | 'neq' | 'in' | 'nin';
    value?: string | string[];
  }

  export interface FieldRuleGroup {
    conditions: (FieldRuleCondition | StageRuleCondition)[];
  }

  export type PermissionRuleCondition = WorkflowPermissionRule;

  export interface FieldRules {
    displayRules?: FieldRuleGroup[];
    editRules?: FieldRuleGroup[];
    requiredRules?: FieldRuleGroup[];
    permissionRules?: PermissionRuleCondition[];
  }

  // --- Fim regras condicionais ---

  export interface FieldConfig {
    key: string;
    label: string;
    type: FieldConfigType;
    options?: string[]; // For select/multi_select type
    required?: boolean;
    placeholder?: string;
    helpText?: string;
    section?: string;
    validation?: FieldValidation;
    defaultValue?: string | boolean | number;
    multiple?: boolean;         // multi_select
    format?: string;            // date/datetime display format (ex: 'DD/MM/YYYY')
    sourceConfig?: Record<string, unknown>; // user: { endpoint, labelKey }
    uiConfig?: Record<string, unknown>;     // textarea: { rows }
    displayRules?: FieldRuleGroup[];
    editRules?: FieldRuleGroup[];
    requiredRules?: FieldRuleGroup[];
    permissionRules?: PermissionRuleCondition[];
    /** 'exit' = exigido somente ao sair da etapa (validado pelo backend); 'entry' = ao entrar/criar. */
    validationTiming?: 'entry' | 'exit';
    /** multi_select com checklist: exige todas as opções marcadas para sair da etapa. */
    requireAllOptions?: boolean;
    /** Obrigatório na saída da etapa mesmo com `required=false` (campos de saída). */
    requiredOnExit?: boolean;
  }

  /** Campos solicitados ao entrar em cada fase. [unitId][stageName] = FieldConfig[]. API /settings (stageFields). */
  export type StageFieldsConfig = Record<string, Record<string, FieldConfig[]>>;
  
  export interface Campaign {
    id: string;
    name: string;
    type?: string;
    theme?: string;
    description?: string;
    startDate: string;
    endDate: string;
    budget: number;
    cost?: number;
    commissionType?: CampaignCommissionType;
    commissionValue?: number;
    status?: CampaignStatus;
    /** Status efetivo considerando período ativo + status salvo. */
    computedStatus?: CampaignStatus;
    serviceScope?: string;
    productIds?: string[];
    assignedStaffIds: string[];
    leadsCount: number;
    revenue: number;
    /** Meta de leads (para cálculo de % atingida). Opcional; se ausente, não exibir progresso. */
    targetLeads?: number;
  }
  
  export interface Imobiliaria {
    id: string;
    name: string;
    contactFlag: boolean; // If true, the office talks to the client directly
    /** Se false, o parceiro está inativo: some das seleções de novos vínculos, mas mantém o histórico. Ausente é tratado como ativo. */
    active?: boolean;
    activeDeals: number;
    clientCount: number;
    /** CNPJ do parceiro (opcional). */
    cnpj?: string;
    /** Ano ou data desde quando é parceiro (ex: "2022" ou "2022-03"). */
    since?: string;
    /** Quantidade de conversões (clientes) nos últimos 30 dias. */
    conversionsLast30Days?: number;
    /** Email de contato. */
    email?: string;
    /** Telefone. */
    phone?: string;
    /** Endereço completo. */
    address?: string;
    /** Taxa de comissão em %. */
    commissionRate?: number;
    /** Ciclo de pagamento (ex: "Mensal (Dia 5)"). */
    paymentCycle?: string;
    /** Nome do gerente de conta. */
    managerName?: string;
    /** Dados bancários (Pix, conta). */
    bankInfo?: string;
  }
  
  export interface StaffGoal {
    id?: string;
    staffId: string;
    staffName: string;
    productId: string;
    productName: string;
    /** Data início da vigência (YYYY-MM-DD). */
    validFrom: string;
    /** Data fim da vigência (YYYY-MM-DD). */
    validTo: string;
    targetAmount: number;
    /** Valor realizado: soma dos contratos de leads do produto que viraram clientes (final da esteira) no período. */
    currentAmount: number;
    bonusThresholdPercent: number; // e.g., 110%
  }

  /**
   * Meta interna definida pelo parceiro (imobiliária). Não confundir com StaffGoal (escritório).
   * partnerUserId = user.id do usuário logado com role IMOBILIARIA (ex.: u11 no seed).
   */
  export interface PartnerInternalGoal {
    id: string;
    partnerUserId: string;
    name?: string;
    validFrom: string;
    validTo: string;
    targetAmount: number;
    currentAmount: number;
  }

  export enum SortOrder {
    ASC = 'asc',
    DESC = 'desc',
  }

  /** Espelha `PaginationDto` no backend (`wms-crm.backend/src/common/pagination.dto.ts`). */
  export const PAGINATION_QUERY = {
    PAGE_MIN: 1,
    LIMIT_MIN: 1,
    LIMIT_MAX: 500,
    LIMIT_DEFAULT: 10,
    SORT_ORDER_VALUES: ['asc', 'desc'] as const,
  } as const;

  export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: SortOrder;
  }

  /** Formato único de listas paginadas (`createPaginatedResponse` na API). */
  export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }
