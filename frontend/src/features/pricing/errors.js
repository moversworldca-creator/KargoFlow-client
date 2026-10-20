// Pricing / Estimate refusals as messages a user can act on. The backend's
// stable codes decide the wording; its business message is kept as detail.
import { describeError } from '../settings/userManagement/errors';

const CODE_MESSAGES = {
  NO_APPLICABLE_TARIFF: 'No published Tariff applies to this job (branch, service, date). Publish or adjust a Tariff.',
  AMBIGUOUS_TARIFF: 'More than one Tariff applies with the same priority. Change a Tariff priority or applicability.',
  INCOMPLETE_CONTRACT_PRICING: 'This customer has contract pricing that does not cover this job. Pricing stops instead of using retail rates.',
  MISSING_RATE: 'A required rate is missing from the Tariff.',
  RATE_MATRIX_GAP: 'The rate matrix has a gap for these inputs.',
  RATE_MATRIX_OVERLAP: 'Two rate cells match these inputs.',
  CIRCULAR_PRICING_DEPENDENCY: 'Two rules depend on each other.',
  MISSING_EXTERNAL_INPUT: 'An external input (e.g. fuel index or distance) is missing.',
  PRICING_STALE: 'Pricing is out of date. Recalculate.',
  PUBLISHED_REVISION_IMMUTABLE: 'Published revisions cannot be edited. Create a new draft revision.',
  INVALID_REVISION_STATE: 'This revision is not in a state that allows this action.',
  REVISION_VALIDATION_FAILED: 'Validation found blocking errors. Fix them before submitting.',
  SELF_APPROVAL_NOT_ALLOWED: 'You cannot approve a revision you submitted.',
  UNAUTHORIZED_PRICING_OVERRIDE: 'You do not have permission for this discount, override or constraint.',
  REPRICING_NOT_ALLOWED: 'This Estimate cannot be repriced in place.',
  STALE_VERSION: 'Someone else changed this record. Reload to see the latest version before saving.',
  IDEMPOTENCY_CONFLICT: 'This request was already used for different inputs. Try again.',
  PRICING_NOT_CURRENT: 'Pricing is missing or out of date. Recalculate before continuing.',
  PRICING_APPROVAL_PENDING: 'Pricing approvals are still pending.',
  BOOKED_ESTIMATE_IMMUTABLE: 'This Estimate is booked and locked. Use a Change Order or Final Rating.',
  OPPORTUNITY_NOT_BOOKED: 'Change Orders apply only after the Opportunity is booked.',
  ESTIMATE_EXPIRED: 'This Estimate has expired. Revise it and send it again.',
  NTE_SCOPE_CHANGE_REQUIRES_WORKFLOW: 'A Not-to-Exceed amount changes only through a Change Order.',
  INVALID_PRICING_CONSTRAINT: 'The price constraint is not valid (for example a range whose minimum is above its maximum).',
  PRICING_APPROVAL_REQUIRED: 'This price needs approval before it can be used. Ask an approver to review it.',
  MARGIN_APPROVAL_REQUIRED: 'The margin is below the company minimum. A manager must approve this price.',
  MARGIN_HARD_FLOOR: 'The margin is below the hard floor. This price cannot be used without an exception.',
  RULE_CONFLICT: 'Two rules that may not both apply matched this job. Check their conditions or stacking.',
  FORMULA_ERROR: 'A formula or condition could not be evaluated. Check it in the Tariff revision.',
  INVALID_UNIT: 'A unit of measure is not supported or cannot be converted.',
  UNKNOWN_PRICING_SKILL: 'The crew uses a pricing skill that does not exist.',
  INACTIVE_PRICING_SKILL: 'The crew uses a pricing skill that has been deactivated.',
  INVALID_PRICING_INPUT: 'Some pricing inputs are missing or invalid.',
  INVALID_ESTIMATE_STATE: 'The Estimate is not in a state that allows this action. Reload to see its current state.',
  INVALID_CHANGE_ORDER_STATE: 'The Change Order is not in a state that allows this action. Reload to see its current state.',
  INVALID_ACCEPTANCE: 'The acceptance details are incomplete. Check the method, name and evidence.',
  INVALID_ESTIMATE_INPUT: 'Some Estimate details are missing or invalid.',
};

/** { kind, status, code, message, detail, details } for any failed request. */
export function pricingError(error, fallback) {
  const base = describeError(error, fallback);
  const data = error?.response?.data || {};
  const code = typeof data.code === 'string' ? data.code : '';
  const detail = typeof data.detail === 'string' ? data.detail : '';
  const friendly = CODE_MESSAGES[code];
  return {
    ...base,
    code: code || base.code,
    message: friendly || base.message,
    detail: friendly && detail && detail !== friendly ? detail : '',
    details: data.details && typeof data.details === 'object' ? data.details : null,
    permissionKey: data.permission_key || '',
  };
}

export const pricingErrorText = (error, fallback) => {
  const info = pricingError(error, fallback);
  return info.detail ? `${info.message} (${info.detail})` : info.message;
};
