/**
 * Core Data Models & Mathematical Calculation Engine
 * Unified across: Estimate, Invoice, Credit Card Auth, Bill of Lading, Contract, Email, SMS.
 * Converted from TypeScript to React JavaScript.
 */

import { DEFAULT_SAMPLE_HTML, DEFAULT_SAMPLE_CSS } from "../core/htmlSanitizer";

export function getPageDimensions(pageSize = "A4", orientation = "Portrait") {
  const isLandscape = String(orientation).toLowerCase() === "landscape";
  const sizeUpper = String(pageSize).toUpperCase();
  let baseWidth = 794;
  let baseHeight = 1123;

  if (sizeUpper === "LETTER") {
    baseWidth = 816;
    baseHeight = 1056;
  } else if (sizeUpper === "LEGAL") {
    baseWidth = 816;
    baseHeight = 1344;
  }

  return {
    width: isLandscape ? baseHeight : baseWidth,
    height: isLandscape ? baseWidth : baseHeight,
  };
}

export function getDocumentPages(doc) {
  if (doc?.pages && Array.isArray(doc.pages) && doc.pages.length > 0) {
    return doc.pages;
  }
  return [{ id: "page-1", name: "Page 1", items: doc?.items || [] }];
}

export const baseStyle = (align = "left", size = 12) => ({
  fontFamily: "Inter, sans-serif",
  fontSize: size,
  fontWeight: 500,
  color: "#0b2948",
  align,
  bold: false,
  italic: false,
  underline: false,
});

export const field = (id, label, value) => ({
  id,
  label,
  value,
  visible: true,
});

export const standardColumns = [
  {
    id: "description",
    label: "DESCRIPTION",
    key: "description",
    width: 45,
    align: "left",
    visible: true,
  },
  {
    id: "quantity",
    label: "QTY",
    key: "quantity",
    width: 15,
    align: "right",
    visible: true,
  },
  {
    id: "unitPrice",
    label: "RATE",
    key: "unitPrice",
    width: 20,
    align: "right",
    visible: true,
  },
  {
    id: "amount",
    label: "AMOUNT",
    key: "amount",
    width: 20,
    align: "right",
    visible: true,
  },
];

export const createId = (prefix = "item") =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

export const deepClone = (value) => structuredClone(value);

export function createInitialDocument(mode = "estimate") {
  const baseDoc = {
    version: 2,
    id: createId("template"),
    name: "New Template",
    mode,
    updatedAt: null,
    settings: {
      category: "Estimate",
      currency: "USD",
      validity: "30 days",
      defaultTax: "0",
      pageSize: "A4",
      orientation: "Portrait",
    },
    items: [],
    pages: [
      {
        id: createId("page"),
        name: "Page 1",
        items: [],
      },
    ],
  };

  if (mode === "estimate") {
    baseDoc.name = "Standard Freight & Moving Estimate";
    baseDoc.settings.category = "Freight Estimate";
    baseDoc.items = [
      {
        id: "header",
        type: "header",
        label: "Header Section",
        content: "Header Section",
        variable: "{{estimate.number}}",
        visible: true,
        style: { ...baseStyle("right", 28), fontWeight: 700, bold: true },
        fields: [
          field("companyName", "Company Name", "{{company.name}}"),
          field("estimateTitle", "Estimate Title", "ESTIMATE OF CHARGES"),
          field("estimateNumber", "Estimate Number", "{{estimate.number}}"),
        ],
        rows: [],
        columns: [],
        image: { src: "", width: 50, align: "left", aspect: "contain" },
        padding: 0,
        width: "full",
      },
      {
        id: "meta",
        type: "meta",
        label: "Estimate Information",
        content: "",
        variable: "{{customer.full_name}}",
        visible: true,
        style: baseStyle(),
        fields: [
          field("customerName", "Estimate For", "{{customer.full_name}}"),
          field("customerCompany", "Customer Company", "{{customer.company}}"),
          field("customerAddress", "Customer Address", "{{customer.address}}"),
          field("issueDate", "Issue Date", "{{estimate.issue_date}}"),
          field("expiryDate", "Valid Until", "{{estimate.expiry_date}}"),
          field("salesName", "Prepared By", "{{sales_rep.name}}"),
          field("salesEmail", "Sales Email", "{{sales_rep.email}}"),
        ],
        rows: [],
        columns: [],
        padding: 0,
        width: "full",
      },
      {
        id: "shipment",
        type: "shipment",
        label: "Move Route & Logistics",
        content: "",
        variable: "{{move.pickup_address}}",
        visible: true,
        style: baseStyle(),
        fields: [
          field("origin", "Pickup Address", "{{move.pickup_address}}"),
          field("pickupDate", "Pickup Date & Window", "{{move.pickup_date}}"),
          field("destination", "Delivery Address", "{{move.delivery_address}}"),
          field("deliveryDate", "Delivery Date", "{{move.delivery_date}}"),
          field("serviceType", "Service Type", "{{move.service_type}}"),
          field("vehicleType", "Assigned Truck", "{{move.vehicle_type}}"),
          field("weight", "Est. Weight / Cu.Ft", "{{move.estimated_weight}}"),
        ],
        rows: [],
        columns: [],
        padding: 0,
        width: "full",
      },
      {
        id: "charges",
        type: "charges",
        label: "Itemized Charges Table",
        content: "",
        variable: "{{estimate.items}}",
        visible: true,
        style: baseStyle(),
        fields: [],
        columns: structuredClone(standardColumns),
        rows: [
          {
            id: createId("row"),
            description: "Labor & Transportation (Hourly/Flat)",
            quantity: "4",
            unitPrice: "150.00",
            discount: "0",
            tax: "",
            amount: "600.00",
          },
          {
            id: createId("row"),
            description: "Packing Materials & Supplies",
            quantity: "1",
            unitPrice: "85.00",
            discount: "0",
            tax: "",
            amount: "85.00",
          },
        ],
        padding: 0,
        width: "full",
      },
      {
        id: "totals",
        type: "totals",
        label: "Financial Summary & Deposit",
        content: "",
        variable: "{{estimate.grand_total}}",
        visible: true,
        style: baseStyle("right"),
        fields: [
          field("subtotal", "Subtotal", "{{estimate.subtotal}}"),
          field("discount", "Discount", "{{estimate.discount}}"),
          field("tax", "Taxes", "{{estimate.tax_amount}}"),
          field("grandTotal", "Grand Total", "{{estimate.grand_total}}"),
          field("depositDue", "Deposit Required", "{{estimate.deposit_due}}"),
        ],
        rows: [],
        columns: [],
        totals: {
          subtotal: true,
          discount: true,
          tax: true,
          additional: false,
          grandTotal: true,
          discountValue: "0",
          taxValue: "0",
          additionalValue: "0",
          numberFormat: "currency",
        },
        padding: 0,
        width: "full",
      },
      {
        id: "terms",
        type: "terms",
        label: "Terms & Conditions",
        content: "{{company.standard_terms}}",
        variable: "{{company.standard_terms}}",
        visible: true,
        style: baseStyle(),
        fields: [
          field("terms", "Terms of Service", "{{company.standard_terms}}"),
          field("paymentTerms", "Payment Schedule", "Deposit upon booking, balance at delivery."),
          field("signature", "Customer Acceptance", "{{e_signature}}"),
        ],
        rows: [],
        columns: [],
        padding: 0,
        width: "full",
      },
    ];
    baseDoc.pages[0].items = baseDoc.items;
  }

  return baseDoc;
}

export function createHtmlWidget(initialHtml, initialCss, label = "HTML Document") {
  const html = initialHtml ?? DEFAULT_SAMPLE_HTML;
  const css = initialCss ?? DEFAULT_SAMPLE_CSS;
  return {
    id: createId("html"),
    type: "html",
    label,
    content: html,
    htmlContent: html,
    cssContent: css,
    variable: "",
    visible: true,
    style: baseStyle("left", 13),
    fields: [],
    rows: [],
    columns: [],
    padding: 0,
    width: "full",
  };
}

export function createTableWidget(rowCount = 3, colCount = 3, label = "") {
  const safeRows = Math.max(1, Math.min(20, Math.floor(rowCount)));
  const safeCols = Math.max(1, Math.min(12, Math.floor(colCount)));
  const equalWidth = Math.floor(100 / safeCols);
  const remainder = 100 - equalWidth * safeCols;
  const columnWidths = Array.from({ length: safeCols }, (_, idx) =>
    idx === 0 ? equalWidth + remainder : equalWidth
  );

  const tableRows = Array.from({ length: safeRows }, (_, rIdx) => ({
    id: createId(`trow-${rIdx + 1}`),
    height: 38,
    cells: Array.from({ length: safeCols }, (_, cIdx) => ({
      id: createId(`cell-${rIdx + 1}-${cIdx + 1}`),
      content: "",
      bold: false,
      textAlign: "left",
      verticalAlign: "middle",
      backgroundColor: "#ffffff",
    })),
  }));

  return {
    id: createId("table"),
    type: "table",
    label,
    content: "",
    variable: "",
    visible: true,
    style: baseStyle("left", 12),
    fields: [],
    rows: [],
    columns: [],
    tableRows,
    tableSettings: {
      rowCount: safeRows,
      colCount: safeCols,
      columnWidths,
      cellPadding: 8,
      tableAlign: "left",
      borderStyle: "solid",
      borderColor: "#cbd5e1",
      borderWidth: 1,
      borderScope: "all",
      striped: false,
      headerRow: false,
    },
    padding: 0,
    width: "full",
  };
}

export function createContentLayoutWidget(
  preset = "50-50",
  customRows = 1,
  customCols = 2,
  label = "Content Layout"
) {
  let rowsCount = 1;
  let colsCount = 2;
  let columnWidths = [50, 50];

  if (preset === "single") {
    rowsCount = 1;
    colsCount = 1;
    columnWidths = [100];
  } else if (preset === "50-50") {
    rowsCount = 1;
    colsCount = 2;
    columnWidths = [50, 50];
  } else if (preset === "30-70") {
    rowsCount = 1;
    colsCount = 2;
    columnWidths = [30, 70];
  } else if (preset === "70-30") {
    rowsCount = 1;
    colsCount = 2;
    columnWidths = [70, 30];
  } else if (preset === "three-col") {
    rowsCount = 1;
    colsCount = 3;
    columnWidths = [33, 34, 33];
  } else {
    rowsCount = Math.max(1, Math.min(20, Math.floor(customRows)));
    colsCount = Math.max(1, Math.min(12, Math.floor(customCols)));
    const eq = Math.floor(100 / colsCount);
    const rem = 100 - eq * colsCount;
    columnWidths = Array.from({ length: colsCount }, (_, i) =>
      i === 0 ? eq + rem : eq
    );
  }

  const tableRows = Array.from({ length: rowsCount }, (_, rIdx) => ({
    id: createId(`lrow-${rIdx + 1}`),
    height: 120,
    cells: Array.from({ length: colsCount }, (_, cIdx) => {
      const cellId = createId(`lcell-${rIdx + 1}-${cIdx + 1}`);
      const initialItems = [];

      if (colsCount === 2 && rIdx === 0) {
        if (cIdx === 0) {
          initialItems.push({
            id: createId("citem"),
            type: "image",
            imageSrc: "",
            caption: "Featured image",
            imageWidth: 100,
            imageAlign: "center",
          });
        } else {
          initialItems.push({
            id: createId("citem"),
            type: "heading",
            text: "Heading Title",
            level: 2,
            bold: true,
          });
          initialItems.push({
            id: createId("citem"),
            type: "text",
            text: "Type paragraph description, delivery terms, or specifications here...",
          });
        }
      }

      return {
        id: cellId,
        content: "",
        items: initialItems,
        textAlign: "left",
        verticalAlign: "top",
        backgroundColor: "#ffffff",
      };
    }),
  }));

  return {
    id: createId("layout"),
    type: "table",
    label,
    content: "",
    variable: "",
    visible: true,
    style: baseStyle("left", 12),
    fields: [],
    rows: [],
    columns: [],
    tableRows,
    tableSettings: {
      rowCount: rowsCount,
      colCount: colsCount,
      columnWidths,
      cellPadding: 12,
      tableAlign: "left",
      borderStyle: "none",
      borderColor: "#e2e8f0",
      borderWidth: 1,
      borderScope: "none",
      striped: false,
      headerRow: false,
      isLayout: true,
      mobileStack: true,
      layoutPreset: preset,
    },
    padding: 0,
    width: "full",
  };
}

export function duplicateItem(item) {
  const copy = deepClone(item);
  copy.id = createId(item.type);
  copy.fields = (copy.fields || []).map((value) => ({
    ...value,
    id: createId("field"),
  }));
  copy.rows = (copy.rows || []).map((value) => ({ ...value, id: createId("row") }));
  copy.columns = (copy.columns || []).map((value) => ({
    ...value,
    id: createId("column"),
  }));
  if (copy.tableRows) {
    copy.tableRows = copy.tableRows.map((r) => ({
      ...r,
      id: createId("trow"),
      cells: r.cells.map((c) => ({
        ...c,
        id: createId("cell"),
        items: c.items?.map((it) => ({ ...it, id: createId("citem") })),
        subGrid: c.subGrid
          ? {
              ...c.subGrid,
              cells: c.subGrid.cells.map((sc) => ({
                ...sc,
                id: createId("cell"),
                items: sc.items?.map((it) => ({
                  ...it,
                  id: createId("citem"),
                })),
              })),
            }
          : undefined,
      })),
    }));
  }
  return copy;
}

export function parseNumeric(value) {
  const raw = String(value ?? "").trim();
  if (!raw || raw.includes("{{")) return null;
  const cleaned = raw
    .replace(/[\s$€£₹]/g, "")
    .replace(/(?:USD|EUR|INR|GBP)/gi, "");
  const valid = /^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(cleaned);
  if (!valid) return null;
  const parsed = Number(cleaned.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function calculateCharge(row, defaultTax = "0") {
  const quantity = parseNumeric(row?.quantity);
  const price = parseNumeric(row?.unitPrice);
  if (quantity === null || price === null || quantity <= 0 || price < 0) {
    return null;
  }
  const discountValue = parseNumeric(row.discount);
  const taxValue = parseNumeric(row.tax);
  const discountIsPlaceholder =
    !String(row.discount || "").trim() || String(row.discount || "").includes("{{");
  const taxIsPlaceholder =
    !String(row.tax || "").trim() || String(row.tax || "").includes("{{");

  if (discountValue === null && !discountIsPlaceholder) return null;
  if (taxValue === null && !taxIsPlaceholder) return null;

  const discountPercent = discountValue ?? 0;
  const taxPercent = taxValue ?? parseNumeric(defaultTax) ?? 0;
  if (
    discountPercent < 0 ||
    discountPercent > 100 ||
    taxPercent < 0 ||
    taxPercent > 100
  ) {
    return null;
  }

  const gross = quantity * price;
  const discount = Math.round(gross * discountPercent) / 100;
  const base = Math.round((gross - discount) * 100) / 100;
  const tax = Math.round(base * taxPercent) / 100;
  return {
    base,
    discount: Math.round(discount * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round((base + tax) * 100) / 100,
  };
}

export function calculateRow(row, defaultTax = "0") {
  return calculateCharge(row, defaultTax)?.total ?? null;
}

export function calculateSubtotal(items, defaultTax = "0") {
  const chargeRows = (items || [])
    .filter((item) => item.visible && item.type === "charges")
    .flatMap((item) => item.rows || []);
  if (!chargeRows.length) return null;
  const amounts = chargeRows.map((row) => calculateCharge(row, defaultTax));
  if (amounts.some((amount) => amount === null)) return null;
  return (
    Math.round(
      amounts.reduce((sum, amount) => sum + amount.base, 0) * 100
    ) / 100
  );
}

export function calculateTaxTotal(items, defaultTax = "0") {
  const chargeRows = (items || [])
    .filter((item) => item.visible && item.type === "charges")
    .flatMap((item) => item.rows || []);
  if (!chargeRows.length) return null;
  const amounts = chargeRows.map((row) => calculateCharge(row, defaultTax));
  if (amounts.some((amount) => amount === null)) return null;
  return (
    Math.round(
      amounts.reduce((sum, amount) => sum + amount.tax, 0) * 100
    ) / 100
  );
}

export function validateTemplateDocument(value) {
  const errors = [];
  if (!value || typeof value !== "object") {
    return ["Template must be a JSON object"];
  }
  const candidate = value;
  if (candidate.version !== 2) errors.push("Unsupported template version");
  if (candidate.id !== undefined && typeof candidate.id !== "string") {
    errors.push("Template ID must be a string");
  }
  if (typeof candidate.name !== "string" || !candidate.name.trim()) {
    errors.push("Template name is required");
  }
  if (!Array.isArray(candidate.items)) {
    errors.push("Template items must be an array");
  }
  if (!candidate.settings || typeof candidate.settings !== "object") {
    errors.push("Template settings are required");
  }
  if (errors.length) return errors;

  const settings = candidate.settings;
  const tax = parseNumeric(settings.defaultTax);
  if (tax === null || tax < 0 || tax > 100) {
    errors.push("Default tax must be between 0 and 100");
  }

  const items = candidate.items;
  const itemIds = new Set();
  for (const item of items) {
    if (!item || typeof item !== "object") {
      errors.push("Invalid component");
      continue;
    }
    if (typeof item.id !== "string" || !item.id.trim() || itemIds.has(item.id)) {
      errors.push("Component IDs must be unique and non-empty");
    } else {
      itemIds.add(item.id);
    }
  }

  return [...new Set(errors)];
}

export function isTemplateDocument(value) {
  return validateTemplateDocument(value).length === 0;
}

export const widgetType = (label) => {
  if (!label) return "generic";
  if (label === "Header Section" || label === "Estimate Title") return "header";
  if (
    [
      "Company Information",
      "Customer Information",
      "Sales Representative",
      "Estimate Number",
      "Issue Date & Expiry Date",
      "Status Badge",
      "Label and Value",
      "Custom Field",
    ].includes(label)
  )
    return "meta";
  if (label === "Company Logo" || label === "Image / Logo" || label === "Image")
    return "image";
  if (label === "Section Heading" || label === "Heading") return "heading";
  if (label === "Text Block" || label === "Text") return "text";
  if (
    label.includes("Shipment") ||
    label.includes("Origin") ||
    label.includes("Destination") ||
    label.includes("Pickup") ||
    label.includes("Service Type") ||
    label.includes("Vehicle") ||
    label.includes("Weight") ||
    label.includes("Package")
  )
    return "shipment";
  if (
    label.includes("Charge") ||
    label.includes("Surcharge") ||
    label.includes("Warehousing") ||
    label.includes("Loading") ||
    label === "Itemized Charges Table" ||
    label === "Add Charge Row"
  )
    return "charges";
  if (
    label.includes("Subtotal") ||
    label.includes("Discount") ||
    label.includes("Tax") ||
    label.includes("Grand Total") ||
    label.includes("Payment Summary")
  )
    return "totals";
  if (label === "Notes" || label === "Notes / Terms") return "notes";
  if (
    label.includes("Terms") ||
    label.includes("Conditions") ||
    label.includes("Signature") ||
    label.includes("Stamp")
  )
    return "terms";
  if (
    label.includes("Footer") ||
    label.includes("Contact") ||
    label.includes("Page Number") ||
    label === "Disclaimer"
  )
    return "footer";
  if (label === "Custom Table" || label === "Table" || label === "Insert Table")
    return "table";
  if (
    label === "Custom Layout" ||
    label === "Content Layout" ||
    label === "Table Layout"
  )
    return "table";
  if (
    label === "HTML Document" ||
    label === "HTML Code" ||
    label === "HTML Section" ||
    label === "Custom HTML"
  )
    return "html";
  return "generic";
};

export function createWidget(label, customOptions = {}) {
  const type = widgetType(label);
  if (type === "html") {
    return createHtmlWidget(customOptions?.value, undefined, label);
  }
  if (type === "table") {
    return createTableWidget(
      customOptions?.rowCount || 3,
      customOptions?.colCount || 3,
      customOptions?.label || ""
    );
  }
  const defaultVar = `{{${label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")}}}`;
  const variable = customOptions?.variable ?? defaultVar;
  const isNotes = label === "Notes" || label === "Notes / Terms";
  const isHeading =
    label === "Heading" || label.toLowerCase().includes("heading");
  const isDivider = label === "Divider / Spacer" || label === "Divider";
  const isText = label === "Text" || label === "Text Block";
  const isLabelValue = label === "Label and Value";
  const isCustomField = label === "Custom Field";

  const resolvedType = isNotes
    ? "notes"
    : isHeading
      ? "heading"
      : isText
        ? "text"
        : isLabelValue || isCustomField
          ? "meta"
          : isDivider
            ? "generic"
            : type;

  const fieldLabel =
    customOptions?.fieldLabel ||
    (isCustomField ? "Custom Field" : isLabelValue ? "Label" : label);
  const fieldValue =
    customOptions?.value ||
    (isCustomField
      ? "Enter reference number"
      : isLabelValue
        ? "Value"
        : variable);

  const base = {
    id: createId(
      isNotes
        ? "notes"
        : isHeading
          ? "heading"
          : isText
            ? "text"
            : isDivider
              ? "divider"
              : isCustomField
                ? "custom-field"
                : resolvedType
    ),
    type: resolvedType,
    label: isHeading ? "Section Heading" : isText ? "Text Block" : label,
    content: isNotes
      ? ""
      : isHeading
        ? "Section Heading"
        : isText
          ? "Click here to add custom text, explanations, or notes..."
          : label,
    variable: isNotes ? "" : variable,
    visible: true,
    style: isHeading
      ? { ...baseStyle("left", 18), fontWeight: 700, bold: true }
      : isText
        ? { ...baseStyle("left", 13), lineHeight: 1.6 }
        : baseStyle(),
    fields: isNotes
      ? []
      : isDivider
        ? []
        : [field(createId("field"), fieldLabel, fieldValue)],
    rows: [],
    columns: [],
    padding: isDivider ? 10 : 0,
    width: "full",
  };

  if (type === "image") {
    base.image = { src: "", width: 80, align: "left", aspect: "contain" };
  }
  if (type === "charges") {
    base.columns = structuredClone(standardColumns);
    base.rows = [
      {
        id: createId("row"),
        description: label,
        quantity: "{{quantity}}",
        unitPrice: "{{unit_price}}",
        discount: "0",
        tax: "",
        amount: "{{amount}}",
      },
    ];
  }
  if (type === "totals") {
    base.totals = {
      subtotal: true,
      discount: true,
      tax: true,
      additional: true,
      grandTotal: true,
      discountValue: "{{discount}}",
      taxValue: "{{tax_amount}}",
      additionalValue: "{{additional_charges}}",
      numberFormat: "currency",
    };
  }

  return base;
}

