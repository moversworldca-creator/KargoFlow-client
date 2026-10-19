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
    { label: "Company Name", tag: "{{customer.company}}" },
  ],
  move: [
    { label: "Move Date", tag: "{{move.date}}" },
    { label: "Origin Address", tag: "{{move.origin_address}}" },
    { label: "Destination Address", tag: "{{move.destination_address}}" },
    { label: "Opportunity Number", tag: "{{opportunity.number}}" },
    { label: "Pickup Address", tag: "{{move.pickup_address}}" },
    { label: "Pickup City, State", tag: "{{move.pickup_city_state}}" },
    { label: "Delivery Address", tag: "{{move.delivery_address}}" },
    { label: "Delivery City, State", tag: "{{move.delivery_city_state}}" },
    { label: "Scheduled Move Date", tag: "{{move.pickup_date}}" },
    { label: "Delivery Date", tag: "{{move.delivery_date}}" },
    { label: "Estimated Weight / Cu.Ft", tag: "{{move.estimated_weight}}" },
    { label: "Service Type", tag: "{{move.service_type}}" },
  ],
  estimate: [
    { label: "Estimate Number", tag: "{{estimate.number}}" },
    { label: "Issue Date", tag: "{{estimate.issue_date}}" },
    { label: "Expiry Date", tag: "{{estimate.expiry_date}}" },
    { label: "Subtotal", tag: "{{estimate.subtotal}}" },
    { label: "Discounts Total", tag: "{{estimate.discount}}" },
    { label: "Tax Amount", tag: "{{estimate.tax_amount}}" },
    { label: "Grand Total", tag: "{{estimate.grand_total}}" },
    { label: "Deposit Required", tag: "{{estimate.deposit_due}}" },
    { label: "Customer Portal Link", tag: "{{estimate.portal_url}}" },
  ],
  invoice: [
    { label: "Invoice Number", tag: "{{invoice.number}}" },
    { label: "Invoice Issue Date", tag: "{{invoice.issue_date}}" },
    { label: "Due Date", tag: "{{invoice.due_date}}" },
    { label: "Total Billed", tag: "{{invoice.total}}" },
    { label: "Amount Paid", tag: "{{invoice.amount_paid}}" },
    { label: "Balance Due", tag: "{{invoice.balance_due}}" },
    { label: "Online Payment Link", tag: "{{invoice.payment_url}}" },
  ],
  carrier: [
    { label: "Branch / Carrier Name", tag: "{{company.name}}" },
    { label: "Carrier DOT Number", tag: "{{company.dot_number}}" },
    { label: "Carrier MC Number", tag: "{{company.mc_number}}" },
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

export function getVariablesForMode(mode = "estimate") {
  const common = [
    { group: "Customer Details", items: MERGE_VARIABLES.customer },
    { group: "Carrier / Branch", items: MERGE_VARIABLES.carrier },
  ];

  switch (mode) {
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
