import type {
  FieldConfig,
  FieldRuleCondition,
  FieldRuleGroup,
  FieldRules,
  StageRuleCondition,
  WorkflowPermissionRule,
} from '../types';

export interface RuleEvaluationContext {
  fieldValues: Record<
    string,
    string | number | boolean | Array<string | number | boolean> | null | undefined
  >;
  currentStage: string;
  userProfileCode?: string;
}

function isStageCondition(
  cond: FieldRuleCondition | StageRuleCondition,
): cond is StageRuleCondition {
  return 'stage' in cond && !('field' in cond);
}

function evaluateCondition(
  cond: FieldRuleCondition | StageRuleCondition,
  ctx: RuleEvaluationContext,
): boolean {
  if (isStageCondition(cond)) {
    const actual = ctx.currentStage;
    const expected = cond.value;
    switch (cond.op) {
      case 'eq': return actual === expected;
      case 'neq': return actual !== expected;
      case 'in': return Array.isArray(expected) ? expected.includes(actual) : actual === expected;
      case 'nin': return Array.isArray(expected) ? !expected.includes(actual) : actual !== expected;
    }
  }

  const actual = ctx.fieldValues[(cond as FieldRuleCondition).field];
  const { op, value } = cond as FieldRuleCondition;
  const actualValues = Array.isArray(actual) ? actual.map(String) : [String(actual)];

  switch (op) {
    case 'empty': return actual === null || actual === undefined || actual === '';
    case 'not_empty': return actual !== null && actual !== undefined && actual !== '';
    case 'eq': return Array.isArray(actual) ? actualValues.includes(String(value)) : String(actual) === String(value);
    case 'neq': return Array.isArray(actual) ? !actualValues.includes(String(value)) : String(actual) !== String(value);
    case 'in': {
      const arr = Array.isArray(value) ? value : [String(value)];
      const expectedValues = arr.map(String);
      return actualValues.some((actualValue) => expectedValues.includes(actualValue));
    }
    case 'nin': {
      const arr = Array.isArray(value) ? value : [String(value)];
      const expectedValues = arr.map(String);
      return actualValues.every((actualValue) => !expectedValues.includes(actualValue));
    }
    case 'gt': return parseFloat(String(actual)) > parseFloat(String(value));
    case 'gte': return parseFloat(String(actual)) >= parseFloat(String(value));
    case 'lt': return parseFloat(String(actual)) < parseFloat(String(value));
    case 'lte': return parseFloat(String(actual)) <= parseFloat(String(value));
    default: return true;
  }
}

function evaluateGroups(groups: FieldRuleGroup[], ctx: RuleEvaluationContext): boolean {
  if (groups.length === 0) return true;
  return groups.some((group) => group.conditions.every((cond) => evaluateCondition(cond, ctx)));
}

function evaluatePermissionRules(
  rules: WorkflowPermissionRule[] | null | undefined,
  ctx: RuleEvaluationContext,
): boolean {
  if (!rules?.length) return true;
  const denyRules = rules.filter((rule) => rule.effect === 'deny');
  if (denyRules.some((rule) => (rule.profileCode ?? rule.role) === ctx.userProfileCode)) {
    return false;
  }
  const allowRules = rules.filter((rule) => rule.effect !== 'deny');
  if (!allowRules.length) return true;
  return allowRules.some((rule) => (rule.profileCode ?? rule.role) === ctx.userProfileCode);
}

export function evaluateFieldRules(
  rules: FieldRules | null | undefined,
  ctx: RuleEvaluationContext,
  baseRequired?: boolean,
): { visible: boolean; editable: boolean; required: boolean } {
  if (!rules) return { visible: true, editable: true, required: !!baseRequired };
  const allowedByPermission = evaluatePermissionRules(rules.permissionRules, ctx);
  if (!allowedByPermission) {
    return { visible: false, editable: false, required: !!baseRequired };
  }
  const visible = rules.displayRules?.length ? evaluateGroups(rules.displayRules, ctx) : true;
  const editable = rules.editRules?.length ? evaluateGroups(rules.editRules, ctx) : true;
  const required = rules.requiredRules?.length
    ? evaluateGroups(rules.requiredRules, ctx)
    : !!baseRequired;
  return { visible, editable, required };
}

/**
 * Filtra campos visíveis e, quando `requiredRules` está definido, resolve a
 * obrigatoriedade condicional sobrescrevendo `required` no campo retornado
 * (ex.: data de nascimento do 2º proponente só é obrigatória se houver 2º proponente).
 */
export function filterVisibleFields(
  fields: FieldConfig[],
  ctx: RuleEvaluationContext,
): FieldConfig[] {
  return fields
    .map((f) => {
      if (!f.requiredRules?.length) return f;
      const rules: FieldRules = { requiredRules: f.requiredRules };
      const { required } = evaluateFieldRules(rules, ctx, f.required);
      return required === f.required ? f : { ...f, required };
    })
    .filter((f) => {
      const rules: FieldRules = {
        displayRules: f.displayRules,
        editRules: f.editRules,
        permissionRules: f.permissionRules,
      };
      return evaluateFieldRules(rules, ctx, f.required).visible;
    });
}

export function getEditableFieldKeys(
  fields: FieldConfig[],
  ctx: RuleEvaluationContext,
): Set<string> {
  const editable = new Set<string>();
  for (const f of fields) {
    const rules: FieldRules = {
      displayRules: f.displayRules,
      editRules: f.editRules,
      permissionRules: f.permissionRules,
    };
    if (evaluateFieldRules(rules, ctx).editable) {
      editable.add(f.key);
    }
  }
  return editable;
}
