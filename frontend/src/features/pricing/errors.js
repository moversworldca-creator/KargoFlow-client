// Tariff refusals as messages a user can act on. The backend's stable codes
// decide the wording; its message is kept as detail. Field problems arrive as
// `errors: [{path, message}]` so a screen can show them next to the field.
import { describeError } from '../settings/userManagement/errors';

const CODE_MESSAGES = {
  STALE_VERSION: 'Someone else saved this tariff first. Reload to see their changes, then make yours again.',
  DUPLICATE_NAME: 'Another record already has this name.',
  MANAGED_TARIFF: 'A managed tariff’s rates come from its authorized template and cannot be edited here.',
  OPPORTUNITY_LOCKED: 'Only an open, unbooked Opportunity can change its tariff or materials.',
};

/** { kind, status, code, message, detail, errors } for any failed request. */
export function pricingError(error, fallback) {
  const base = describeError(error, fallback);
  const data = error?.response?.data || {};
  const code = typeof data.code === 'string' ? data.code : '';
  const detail = typeof data.detail === 'string' ? data.detail : '';
  const friendly = CODE_MESSAGES[code];
  return {
    ...base,
    code: code || base.code,
    message: friendly || detail || base.message,
    detail: friendly && detail && detail !== friendly ? detail : '',
    errors: Array.isArray(data.errors) ? data.errors : [],
  };
}

export const pricingErrorText = (error, fallback) => {
  const info = pricingError(error, fallback);
  return info.detail ? `${info.message} (${info.detail})` : info.message;
};
