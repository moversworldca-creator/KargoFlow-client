/**
 * Mode Registry for Unified Template Builder
 * Defines visual canvas capabilities, layout constraints, and features
 * for: estimate, invoice, cc_auth, bol, contract, email, and sms.
 */

export const BUILDER_MODES = {
  estimate: {
    id: "estimate",
    label: "Estimate Template",
    description: "Multi-page printable moving & freight estimate with charges table and totals.",
    canvasType: "paged", // paged | email | sms
    supportsPagination: true,
    supportsOrientations: true,
    supportedPageSizes: ["A4", "Letter", "Legal"],
    defaultPageSize: "A4",
    defaultOrientation: "Portrait",
    supportsTables: true,
    supportsESign: true,
  },
  invoice: {
    id: "invoice",
    label: "Payment Invoice",
    description: "Itemized billing invoice with tax breakdowns, balance due, and online pay links.",
    canvasType: "paged",
    supportsPagination: true,
    supportsOrientations: true,
    supportedPageSizes: ["A4", "Letter"],
    defaultPageSize: "A4",
    defaultOrientation: "Portrait",
    supportsTables: true,
    supportsESign: false,
  },
  cc_auth: {
    id: "cc_auth",
    label: "Credit Card Authorization",
    description: "Single-page payment card authorization form with masked account details and legal signature.",
    canvasType: "paged",
    supportsPagination: false,
    supportsOrientations: false,
    supportedPageSizes: ["Letter", "Legal"],
    defaultPageSize: "Letter",
    defaultOrientation: "Portrait",
    supportsTables: true,
    supportsESign: true,
  },
  bol: {
    id: "bol",
    label: "Bill of Lading",
    description: "Standard household goods bill of lading with valuation choices and dual-signature receipts.",
    canvasType: "paged",
    supportsPagination: true,
    supportsOrientations: true,
    supportedPageSizes: ["Letter", "Legal"],
    defaultPageSize: "Letter",
    defaultOrientation: "Portrait",
    supportsTables: true,
    supportsESign: true,
  },
  contract: {
    id: "contract",
    label: "Services Contract",
    description: "Legally binding moving agreement with tariff tables, cancellation terms, and initial boxes.",
    canvasType: "paged",
    supportsPagination: true,
    supportsOrientations: true,
    supportedPageSizes: ["Letter", "A4"],
    defaultPageSize: "Letter",
    defaultOrientation: "Portrait",
    supportsTables: true,
    supportsESign: true,
  },
  email: {
    id: "email",
    label: "Email Template",
    description: "Responsive 600px marketing and automated notifications with CTA buttons and banners.",
    canvasType: "email",
    supportsPagination: false,
    supportsOrientations: false,
    supportedPageSizes: [],
    supportsTables: true,
    supportsESign: false,
  },
  sms: {
    id: "sms",
    label: "SMS Notification",
    description: "Direct telecom SMS composer with character counter and phone bubble preview.",
    canvasType: "sms",
    supportsPagination: false,
    supportsOrientations: false,
    supportedPageSizes: [],
    supportsTables: false,
    supportsESign: false,
  },
};

export function getModeConfig(mode = "estimate") {
  return BUILDER_MODES[mode] || BUILDER_MODES.estimate;
}
