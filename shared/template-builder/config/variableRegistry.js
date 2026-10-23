/**
 * Variable & Merge Tag Registry per Document Mode
 * Categorizes tags for Customer, Move, Estimate, Invoice, Carrier, Payment, etc.
 */

export const MERGE_VARIABLES = {
  customer: [
    { label: "Customer Full Name", tag: "{{customer.full_name}}" },
    { label: "Customer First Name", tag: "{{customer.first_name}}" },
    { label: "Customer Phone", tag: "{{customer.phone}}" },
    { label: "Customer Email", tag: "{{customer.email}}" },
  ],
  move: [
    { label: "Move Date", tag: "{{move.date}}" },
    { label: "Origin Address", tag: "{{move.origin_address}}" },
    { label: "Destination Address", tag: "{{move.destination_address}}" },
    { label: "Opportunity Number", tag: "{{opportunity.number}}" },
    { label: "Move Size", tag: "{{move.size}}" },
    { label: "Estimated Weight (lbs)", tag: "{{move.estimated_weight}}" },
    { label: "Service Type", tag: "{{opportunity.service_type}}" },
  ],
  estimate: [
    { label: "Estimate Number", tag: "{{estimate.number}}" },
    { label: "Subtotal", tag: "{{estimate.subtotal}}" },
    { label: "Discounts Total", tag: "{{estimate.discount}}" },
    { label: "Tax Amount", tag: "{{estimate.tax}}" },
    { label: "Grand Total", tag: "{{estimate.grand_total}}" },
    { label: "Deposit Required", tag: "{{estimate.deposit_amount}}" },
    { label: "Customer Portal Link", tag: "{{links.estimate_portal}}" },
  ],
  invoice: [
    { label: "Invoice Number", tag: "{{invoice.number}}" },
    { label: "Invoice Issue Date", tag: "{{invoice.issued_at}}" },
    { label: "Due Date", tag: "{{invoice.due_at}}" },
    { label: "Invoice Subtotal", tag: "{{invoice.subtotal}}" },
    { label: "Invoice Discount", tag: "{{invoice.discount}}" },
    { label: "Invoice Tax", tag: "{{invoice.tax}}" },
    { label: "Total Billed", tag: "{{invoice.total}}" },
    { label: "Amount Paid", tag: "{{invoice.amount_paid}}" },
    { label: "Balance Due", tag: "{{invoice.balance_due}}" },
    { label: "Online Payment Link", tag: "{{links.pay_now}}" },
  ],
  carrier: [
    { label: "Branch / Carrier Name", tag: "{{company.name}}" },
    { label: "Branch Phone", tag: "{{company.phone}}" },
    { label: "Branch Email", tag: "{{company.email}}" },
    { label: "Branch Address", tag: "{{company.address}}" },
  ],
  links: [
    { label: "Customer Portal URL", tag: "{{portal.action_url}}" },
    { label: "Direct Tracking Link", tag: "{{tracking.short_url}}" },
    { label: "Unsubscribe URL", tag: "{{unsubscribe.url}}" },
  ],
};

export { normalizeLegacyMergeFieldAliases } from './mergeFieldAliases.js';

export function getVariablesForMode(mode = "estimate") {
  const common = [
    { group: "Customer Details", items: MERGE_VARIABLES.customer },
    { group: "Carrier / Branch", items: MERGE_VARIABLES.carrier },
  ];

  switch (mode) {
    case "document":
      return [
        { group: "Move Logistics", items: MERGE_VARIABLES.move },
        ...common,
      ];
    case "estimate_portal":
    case "estimate":
      return [
        { group: "Estimate Details", items: MERGE_VARIABLES.estimate },
        { group: "Move Logistics", items: MERGE_VARIABLES.move },
        ...common,
      ];
    case "invoice":
      return [
        { group: "Invoice & Payment", items: MERGE_VARIABLES.invoice },
        { group: "Move Logistics", items: MERGE_VARIABLES.move },
        ...common,
      ];
    case "cc_auth":
      return [
        { group: "Estimate & Payment", items: MERGE_VARIABLES.estimate },
        ...common,
      ];
    case "bol":
    case "contract":
      return [
        { group: "Move Logistics", items: MERGE_VARIABLES.move },
        { group: "Estimate Financials", items: MERGE_VARIABLES.estimate },
        ...common,
      ];
    case "email":
      return [
        { group: "Action Links", items: MERGE_VARIABLES.links },
        { group: "Estimate & Move", items: [...MERGE_VARIABLES.estimate, ...MERGE_VARIABLES.move] },
        ...common,
      ];
    case "sms":
      return [
        { group: "Quick Tokens", items: [
          { label: "First Name", tag: "{{customer.first_name}}" },
          { label: "Move Date", tag: "{{move.pickup_date}}" },
          { label: "Balance Due", tag: "{{invoice.balance_due}}" },
          { label: "Portal Link", tag: "{{portal.action_url}}" },
        ]},
        ...common,
      ];
    default:
      return common;
  }
}

export function normalizeBuilderVariableGroups(groups) {
  if (!Array.isArray(groups)) return [];

  return groups
    .map((group) => ({
      group: group.label || group.key || "General",
      items: (Array.isArray(group.variables) ? group.variables : [])
        .filter((variable) => typeof variable.token === "string" && variable.token.trim())
        .map((variable) => ({
          label: variable.label || variable.token,
          tag: `{{${variable.token.replace(/^\{\{\s*|\s*\}\}$/g, "").trim()}}}`,
        })),
    }))
    .filter((group) => group.items.length > 0);
}
