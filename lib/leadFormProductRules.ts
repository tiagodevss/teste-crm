/**
 * Regras de formulário de lead por produto (fluxos Weslley).
 * Espelha os matchers de backend/prisma/seeds/parametrizacao-fluxos-weslley.
 */

export interface LeadFormStep1Rules {
  nameRequired: boolean;
  nameLabel: string;
  namePlaceholder: string;
  phoneRequired: boolean;
  emailRequired: boolean;
  addressRequired: boolean;
  addressLabel: string;
  addressPlaceholder: string;
  showCompanyField: boolean;
  companyLabel?: string;
  successMessage?: string;
}

const DEFAULT_RULES: LeadFormStep1Rules = {
  nameRequired: true,
  nameLabel: 'Nome / Razão Social',
  namePlaceholder: 'Ex: Empresa Ltda ou Nome Completo',
  phoneRequired: true,
  emailRequired: true,
  addressRequired: false,
  addressLabel: 'Endereço',
  addressPlaceholder: 'Rua, número, bairro...',
  showCompanyField: true,
  companyLabel: 'Empresa',
};

const ABERTURA_SUCCESS_MESSAGE =
  'Solicitação demonstrativa cadastrada. A próxima etapa é validar os documentos; nenhum envio real será realizado.';

function matchesImpostoRendaComum(name: string): boolean {
  const n = name.toLowerCase();
  if (n.includes('regulariz')) return false;
  return (
    (n.includes('imposto') && n.includes('renda')) ||
    (n.includes('declara') && (n.includes('imposto') || n.includes('irpf'))) ||
    n.includes('irpf') ||
    (n.includes('ir') && n.includes('comum'))
  );
}

function matchesAberturaEmpresa(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('abertura') && n.includes('empresa');
}

function matchesContabilidadeMensal(name: string): boolean {
  const n = name.toLowerCase();
  return (
    (n.includes('contabilidade') && n.includes('mensal')) ||
    (n.includes('contabilidade') && n.includes('recorrente'))
  );
}

export function getLeadFormStep1Rules(productName?: string | null): LeadFormStep1Rules {
  if (!productName?.trim()) {
    return {
      ...DEFAULT_RULES,
      phoneRequired: false,
      emailRequired: false,
    };
  }

  if (matchesImpostoRendaComum(productName)) {
    return {
      nameRequired: false,
      nameLabel: 'Nome / Razão Social',
      namePlaceholder: 'Nome completo (opcional para PF)',
      phoneRequired: true,
      emailRequired: true,
      addressRequired: false,
      addressLabel: 'Endereço',
      addressPlaceholder: 'Rua, número, bairro...',
      showCompanyField: false,
    };
  }

  if (matchesAberturaEmpresa(productName)) {
    return {
      nameRequired: true,
      nameLabel: 'Nome do Contato',
      namePlaceholder: 'Nome da pessoa física de contato',
      phoneRequired: true,
      emailRequired: true,
      addressRequired: true,
      addressLabel: 'Endereço do Contato (Residencial)',
      addressPlaceholder: 'Endereço residencial completo',
      showCompanyField: false,
      successMessage: ABERTURA_SUCCESS_MESSAGE,
    };
  }

  if (matchesContabilidadeMensal(productName)) {
    return {
      nameRequired: true,
      nameLabel: 'Nome',
      namePlaceholder: 'Nome do contato',
      phoneRequired: true,
      emailRequired: true,
      addressRequired: true,
      addressLabel: 'Endereço conforme cadastrado no CNPJ',
      addressPlaceholder: 'Endereço cadastrado no CNPJ',
      showCompanyField: true,
      companyLabel: 'Empresa',
    };
  }

  return DEFAULT_RULES;
}

export function resolveLeadDisplayName(opts: {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  productName?: string | null;
}): string {
  const name = opts.name?.trim();
  if (name) return name;
  const phone = opts.phone?.trim();
  if (phone) return phone;
  const email = opts.email?.trim();
  if (email) return email;
  return opts.productName?.trim()
    ? `Lead — ${opts.productName.trim()}`
    : 'Lead sem nome';
}
