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
};

/** Email/SMS tokens: exactly the communications renderer's approved variables. */
export const COMMUNICATION_VARIABLES = [
  { group: "Customer & Contact", items: [
    { label: "Customer Full Name", tag: "{{customer.full_name}}" },
    { label: "Customer First Name", tag: "{{customer.first_name}}" },
    { label: "Customer Phone", tag: "{{customer.phone}}" },
    { label: "Customer Email", tag: "{{customer.email}}" },
    { label: "Contact Name", tag: "{{contact.name}}" },
    { label: "Contact First Name", tag: "{{contact.first_name}}" },
    { label: "Contact Email", tag: "{{contact.email}}" },
    { label: "Contact Phone", tag: "{{contact.phone}}" },
  ] },
  { group: "Lead & Move", items: [
    { label: "Lead Number", tag: "{{lead.number}}" },
    { label: "Lead Move Date", tag: "{{lead.move_date}}" },
    { label: "Lead Origin City", tag: "{{lead.origin_city}}" },
    { label: "Lead Destination City", tag: "{{lead.destination_city}}" },
    { label: "Opportunity Number", tag: "{{opportunity.number}}" },
    { label: "Opportunity Move Date", tag: "{{opportunity.move_date}}" },
    { label: "Move Date", tag: "{{move.date}}" },
    { label: "Origin City", tag: "{{move.origin_city}}" },
    { label: "Destination City", tag: "{{move.destination_city}}" },
  ] },
  { group: "Company, Branch & Staff", items: [
    { label: "Company Name", tag: "{{company.name}}" },
    { label: "Branch Name", tag: "{{branch.name}}" },
    { label: "Branch Phone", tag: "{{branch.phone}}" },
    { label: "Branch Email", tag: "{{branch.email}}" },
    { label: "Employee Name", tag: "{{employee.name}}" },
    { label: "Employee First Name", tag: "{{employee.first_name}}" },
    { label: "Employee Email", tag: "{{employee.email}}" },
    { label: "Employee Phone", tag: "{{employee.phone}}" },
  ] },
];

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
    case "sms":
      return COMMUNICATION_VARIABLES;
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
