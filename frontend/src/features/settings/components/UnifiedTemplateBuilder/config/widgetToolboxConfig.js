/**
 * Dynamic Widget Toolbox Configuration per Document Mode
 * Exposes specialized widgets tailored for:
 * - estimate
 * - invoice
 * - cc_auth
 * - bol
 * - contract
 * - email
 * - sms
 */

export const WIDGET_CATEGORIES = {
  // Shared universal widgets
  COMMON: [
    { id: "heading", label: "Heading", type: "heading", icon: "Heading" },
    { id: "text", label: "Text Block", type: "text", icon: "Type" },
    { id: "notes", label: "Notes", type: "notes", icon: "StickyNote" },
    { id: "table", label: "Custom Table", type: "table", icon: "Table" },
    { id: "layout", label: "Content Layout (Columns)", type: "layout", icon: "Columns" },
    { id: "custom_field", label: "Custom Field...", type: "custom_field", icon: "Sliders" },
    { id: "html", label: "Custom HTML Block", type: "html", icon: "Code2" },
  ],


  // Estimate widgets
  ESTIMATE: [
    { id: "header", label: "Header Section", type: "header", icon: "LayoutTemplate" },
    { id: "meta", label: "Estimate Information", type: "meta", icon: "FileText" },
    { id: "shipment", label: "Move Route & Logistics", type: "shipment", icon: "Truck" },
    { id: "charges", label: "Itemized Charges Table", type: "charges", icon: "DollarSign" },
    { id: "totals", label: "Financial Summary & Deposit", type: "totals", icon: "Calculator" },
    { id: "terms", label: "Terms & Conditions", type: "terms", icon: "ScrollText" },
    { id: "acceptance", label: "Customer Acceptance Pad", type: "acceptance", icon: "CheckSquare" },
  ],

  // Invoice widgets
  INVOICE: [
    { id: "inv_header", label: "Invoice Header & Status", type: "header", icon: "Receipt" },
    { id: "inv_billing", label: "Bill To / Ship To Details", type: "meta", icon: "UserCheck" },
    { id: "inv_items", label: "Itemized Billing Table", type: "charges", icon: "ListOrdered" },
    { id: "inv_totals", label: "Invoice Totals & Balance Due", type: "totals", icon: "Calculator" },
    { id: "inv_payment_btn", label: "Online Pay Link & QR Code", type: "button", icon: "QrCode" },
    { id: "inv_wire", label: "Bank Wire & Remittance Info", type: "text", icon: "Building" },
  ],

  // Credit Card Authorization widgets
  CC_AUTH: [
    { id: "cc_header", label: "Merchant & Job Header", type: "header", icon: "CreditCard" },
    { id: "cc_mandate", label: "Legal Authorization Terms", type: "terms", icon: "ShieldCheck" },
    { id: "cc_card_details", label: "Cardholder & Masked Card Details", type: "meta", icon: "Lock" },
    { id: "cc_billing_addr", label: "Card Billing Address", type: "meta", icon: "MapPin" },
    { id: "cc_scope", label: "Charge Limit / Scope Selector", type: "text", icon: "Sliders" },
    { id: "cc_signature", label: "Cardholder Signature & Date", type: "esign", icon: "PenTool" },
  ],

  // Bill of Lading (BOL) widgets
  BOL: [
    { id: "bol_header", label: "BOL Header (Carrier & Shipper)", type: "header", icon: "FileSignature" },
    { id: "bol_route", label: "Logistics Route & Stops", type: "shipment", icon: "Navigation" },
    { id: "bol_valuation", label: "Valuation & Liability Choice", type: "terms", icon: "Shield" },
    { id: "bol_accessorials", label: "Accessorial Services Grid", type: "table", icon: "CheckCircle" },
    { id: "bol_receipt", label: "Delivery Receipt & Exceptions", type: "text", icon: "ClipboardList" },
    { id: "bol_signatures", label: "Dual Shipper & Driver Signatures", type: "esign", icon: "PenTool" },
  ],

  // Contract widgets
  CONTRACT: [
    { id: "contract_header", label: "Contract Header & Parties", type: "header", icon: "FileText" },
    { id: "contract_scope", label: "Scope of Moving Services", type: "text", icon: "Box" },
    { id: "contract_rates", label: "Labor & Tariff Rate Table", type: "table", icon: "DollarSign" },
    { id: "contract_cancel", label: "Cancellation & Reschedule Policy", type: "text", icon: "CalendarX" },
    { id: "contract_clauses", label: "Terms of Carriage & Initial Pads", type: "terms", icon: "ScrollText" },
    { id: "contract_signature", label: "Final Acceptance Signature Block", type: "esign", icon: "PenTool" },
  ],

  // Email widgets
  EMAIL: [
    { id: "email_preheader", label: "Preheader & Subject", type: "text", icon: "Mail" },
    { id: "email_banner", label: "Hero Banner & Logo", type: "image", icon: "Image" },
    { id: "email_button", label: "Call-to-Action Button", type: "button", icon: "MousePointerClick" },
    { id: "email_callout", label: "Highlight Callout Box", type: "text", icon: "AlertCircle" },
    { id: "email_footer", label: "Email Footer & Unsubscribe", type: "footer", icon: "FileCode" },
  ],

  // SMS widgets
  SMS: [
    { id: "sms_body", label: "Message Body", type: "text", icon: "MessageSquare" },
    { id: "sms_link", label: "Customer Portal Short URL", type: "field", icon: "Link" },
    { id: "sms_optout", label: "Opt-Out Compliance Text", type: "field", icon: "ShieldAlert" },
  ],
};

export function getWidgetsForMode(mode = "estimate") {
  const common = WIDGET_CATEGORIES.COMMON;
  let specific = [];

  switch (mode) {
    case "estimate":
      specific = WIDGET_CATEGORIES.ESTIMATE;
      break;
    case "invoice":
      specific = WIDGET_CATEGORIES.INVOICE;
      break;
    case "cc_auth":
      specific = WIDGET_CATEGORIES.CC_AUTH;
      break;
    case "bol":
      specific = WIDGET_CATEGORIES.BOL;
      break;
    case "contract":
      specific = WIDGET_CATEGORIES.CONTRACT;
      break;
    case "email":
      specific = WIDGET_CATEGORIES.EMAIL;
      break;
    case "sms":
      specific = WIDGET_CATEGORIES.SMS;
      break;
    default:
      specific = WIDGET_CATEGORIES.ESTIMATE;
  }

  return { specific, common };
}
