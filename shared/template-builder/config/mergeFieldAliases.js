const LEGACY_MERGE_FIELD_ALIASES = {
  "move.estimated_weight": "move.size",
  "move.pickup_date": "move.date",
  "move.delivery_address": "move.destination_address",
  "move.service_type": "opportunity.service_type",
  "estimate.portal_url": "links.estimate_portal",
  "invoice.issue_date": "invoice.issued_at",
  "invoice.due_date": "invoice.due_at",
  "invoice.payment_url": "links.pay_now",
};

export function normalizeLegacyMergeFieldAliases(value) {
  if (typeof value === "string") {
    return value.replace(/\{\{\s*([a-zA-Z0-9_.]+)(\s*\|[^}]*?\S)?\s*\}\}/g, (token, key, filters = "") => {
      const replacement = LEGACY_MERGE_FIELD_ALIASES[key];
      return replacement ? `{{${replacement}${filters}}}` : token;
    });
  }
  if (Array.isArray(value)) {
    return value.map(normalizeLegacyMergeFieldAliases);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeLegacyMergeFieldAliases(entry)])
    );
  }
  return value;
}
