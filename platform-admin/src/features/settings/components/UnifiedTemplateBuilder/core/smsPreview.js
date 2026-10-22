const SMS_PREVIEW_VALUES = {
  "customer.full_name": "Alex Customer",
  customer_name: "Alex Customer",
  "customer.first_name": "Alex",
  "customer.phone": "(555) 019-2834",
  "customer.email": "alex.customer@example.com",
  "move.date": "June 15, 2026",
  "move.pickup_date": "June 15, 2026",
  move_date: "June 15, 2026",
  "move.origin_address": "123 Main St, Vancouver, BC",
  origin: "123 Main St, Vancouver, BC",
  "move.destination_address": "456 Oak Ave, Burnaby, BC",
  "move.delivery_address": "456 Oak Ave, Burnaby, BC",
  destination: "456 Oak Ave, Burnaby, BC",
  "estimate.number": "EST-00042",
  estimate_number: "EST-00042",
  "estimate.subtotal": "$1,000.00",
  "estimate.discount": "$0.00",
  "estimate.tax": "$8.00",
  "estimate.grand_total": "$1,008.00",
  "estimate.deposit_amount": "$100.00",
  "invoice.number": "INV-00042",
  "invoice.balance_due": "$908.00",
  balance_due: "$908.00",
  "payment.amount_due": "$908.00",
  "payment.link": "https://kargoflow.com/pay/inv-42",
  "company.name": "KargoFlow",
  company_name: "KargoFlow",
  "company.phone": "+1 800 555 0199",
  company_phone: "+1 800 555 0199",
  "company.primary_phone": "+1 800 555 0199",
  "company.email": "support@kargoflow.com",
  "company.address": "742 Evergreen Freight Way, Chicago, IL",
  "portal.action_url": "https://kargoflow.com/portal/est-42",
  quote_link: "https://kargoflow.com/portal/est-42",
  "links.estimate_portal": "https://kargoflow.com/portal/est-42",
  "links.pay_now": "https://kargoflow.com/pay/inv-42",
  "tracking.short_url": "https://kargoflow.com/track/42",
  crew_leader: "Jordan Lee",
  branch_name: "KargoFlow Main",
};

export function resolveSmsPreviewText(text, resolve = true) {
  if (!resolve || !text) return text;

  return String(text).replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, key) => {
    return SMS_PREVIEW_VALUES[key.trim().toLowerCase()] ?? match;
  });
}
