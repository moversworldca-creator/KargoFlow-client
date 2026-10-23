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
