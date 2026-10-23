/**
 * Prebuilt document sections (header, move overview, job timeline, footer, paid stamp)
 * drawn with sample data for the builder canvas and Preview/Print. The server renders
 * the real document with the same layout (KargoFlow_Domain/tenant/builder/rendering.py).
 */
import { SAMPLE_VARIABLES } from "../config/sampleVariables.js";

export const PREBUILT_SECTION_TYPES = Object.freeze(["doc_header", "move_overview", "job_timeline", "doc_footer", "paid_stamp"]);

// Charge tables: which charge categories each filter lists (mirrors blocks.CHARGE_FILTER_CATEGORIES).
export const CHARGE_FILTER_CATEGORIES = Object.freeze({
  labor: ["labor"],
  materials: ["material"],
  services: ["packing", "storage", "valuation", "custom"],
  fees: ["travel", "fuel", "minimum", "surcharge"],
});
const CHARGE_CATEGORY_LABELS = {
  labor: "Labour", travel: "Travel", packing: "Packing", material: "Materials", storage: "Storage",
  fuel: "Fuel surcharge", minimum: "Minimum charge", surcharge: "Surcharges", discount: "Discounts",
  valuation: "Valuation", custom: "Other services",
};
const CATEGORY_ALIASES = { labour: "labor", materials: "material", fees: "surcharge" };

export function chargeCategory(value) {
  const code = String(value ?? "").trim().toLowerCase();
  const aliased = CATEGORY_ALIASES[code] || code;
  const byLabel = Object.entries(CHARGE_CATEGORY_LABELS).find(([, label]) => label.toLowerCase() === aliased);
  return byLabel ? byLabel[0] : aliased;
}

export function chargeMatches(category, filter) {
  if (!filter || filter === "all") return true;
  return (CHARGE_FILTER_CATEGORIES[filter] || []).includes(chargeCategory(category));
}

export function chargeCategoryLabel(category) {
  return CHARGE_CATEGORY_LABELS[chargeCategory(category)] || String(category || "Other");
}

const PRIMARY = "#1E40AF";
const DEFAULT_TITLES = { estimate: "Estimate", estimate_portal: "Estimate", invoice: "Invoice" };

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));
const sample = (token) => {
  const value = SAMPLE_VARIABLES[token];
  return value === undefined || value === null ? "" : String(value);
};
const merge = (text) => String(text ?? "").replace(/\{\{\s*([a-zA-Z0-9_.]+)(?:\|[^}]*)?\s*\}\}/g, (token, name) => {
  const value = SAMPLE_VARIABLES[name];
  return value === undefined ? token : String(value);
});
const on = (props, key) => props?.[key] !== false;

const kv = (pairs) => {
  const rows = pairs.filter(([, value]) => value).map(([label, value]) =>
    `<tr><td style="color:#6b7280;padding:2px 10px 2px 0;white-space:nowrap;width:1%;vertical-align:top">${esc(label)}</td><td style="padding:2px 0;vertical-align:top">${esc(value)}</td></tr>`).join("");
  return rows ? `<table style="width:100%;border-collapse:collapse;table-layout:auto;font-size:12px">${rows}</table>` : "";
};
const card = (title, body) => (body
  ? `<div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${PRIMARY};margin:0 0 6px">${esc(title)}</div>${body}`
  : "");
const grid = (cells) => {
  const filled = cells.filter(Boolean);
  const cell = (content, span) => `<td${span ? ' colspan="3"' : ""} style="vertical-align:top;border:1px solid #e5e7eb;border-radius:6px;padding:10px 12px">${content}</td>`;
  const rows = [];
  for (let index = 0; index < filled.length; index += 2) {
    const pair = filled.slice(index, index + 2);
    rows.push(pair.length === 2
      ? `<tr>${cell(pair[0])}<td style="width:12px;border:none;padding:0"></td>${cell(pair[1])}</tr>`
      : `<tr>${cell(pair[0], true)}</tr>`);
  }
  return rows.length ? `<table style="width:100%;border-collapse:separate;border-spacing:0 10px;table-layout:fixed">${rows.join("")}</table>` : "";
};
export const headingBar = (title) => (title
  ? `<div style="font-size:12.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${PRIMARY};border-bottom:2px solid ${PRIMARY};padding-bottom:4px;margin:12px 0 6px">${esc(merge(title))}</div>`
  : "");

function header(props, mode) {
  const contact = [];
  if (on(props, "show_contact")) {
    contact.push(sample("company.address"));
    contact.push([sample("company.phone"), sample("company.email"), sample("company.website")].filter(Boolean).join(" · "));
  }
  if (on(props, "show_license") && sample("company.state_license_number")) contact.push(`Licence #${sample("company.state_license_number")}`);
  const logo = on(props, "show_logo")
    ? `<div style="display:inline-block;margin-bottom:6px;padding:10px 14px;border:1px dashed #cbd5e1;border-radius:6px;color:#94a3b8;font-size:10px;font-weight:600;letter-spacing:.08em">YOUR LOGO</div>`
    : "";
  const left = `${logo}<div style="font-size:19px;font-weight:700;color:${PRIMARY}">${esc(sample("company.name"))}</div>`
    + contact.filter(Boolean).map((line) => `<div style="color:#4b5563;font-size:11.5px;line-height:1.55">${esc(line)}</div>`).join("");
  const meta = [];
  // The canvas does not know the template kind; the server uses the real one. Infer it from the title.
  const title = merge(props?.title || DEFAULT_TITLES[mode] || "Agreement");
  if (!DEFAULT_TITLES[mode]) mode = /invoice/i.test(title) ? "invoice" : /estimate|quote/i.test(title) ? "estimate" : mode;
  if (on(props, "show_document_info")) {
    if (mode === "invoice") meta.push(["Invoice #", sample("invoice.number")], ["Date", sample("invoice.issued_at")], ["Due", sample("invoice.due_at")]);
    else if (mode === "estimate" || mode === "estimate_portal") meta.push(["Estimate #", sample("estimate.number")], ["Date", sample("estimate.created_date")]);
    else meta.push(["Job #", sample("job.number")], ["Date", sample("system.today")]);
    meta.push(["Move date", sample("move.date")]);
  }
  if (on(props, "show_customer")) meta.push(["Prepared for", sample("customer.full_name")]);
  const metaRows = meta.filter(([, value]) => value).map(([label, value]) =>
    `<tr><td style="color:#6b7280;padding:2px 0 2px 14px;text-align:right">${esc(label)}</td><td style="padding:2px 0 2px 14px;text-align:right">${esc(value)}</td></tr>`).join("");
  return `<table style="width:100%;border-collapse:collapse;table-layout:auto;border-bottom:3px solid ${PRIMARY}"><tr>`
    + `<td style="vertical-align:top;padding:0 0 12px">${left}</td>`
    + `<td style="vertical-align:top;padding:0 0 12px;text-align:right"><div style="font-size:24px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:${PRIMARY}">${esc(title)}</div>`
    + (metaRows ? `<table style="width:auto;margin-left:auto;border-collapse:collapse;table-layout:auto;font-size:11.5px">${metaRows}</table>` : "")
    + "</td></tr></table>";
}

function stopCard(title, end, showAccess) {
  const address = sample(`move.${end}_address`);
  const body = (address ? `<div style="font-weight:600;font-size:12.5px;margin-bottom:4px">${esc(address)}</div>` : "")
    + (showAccess ? kv([["Property", sample(`move.${end}_property_type`)], ["Stairs", sample(`move.${end}_stairs`)],
      ["Elevator", sample(`move.${end}_elevator`)], ["Parking", sample(`move.${end}_parking`)]]) : "");
  return card(title, body);
}

function moveOverview(props) {
  const cards = [];
  if (on(props, "show_customer")) {
    cards.push(card("Customer", kv([["Name", sample("customer.full_name")], ["Phone", sample("customer.phone")], ["Email", sample("customer.email")]])));
  }
  if (on(props, "show_schedule")) {
    cards.push(card("Move", kv([
      ["Move date", sample("move.date")], ["Arrival window", sample("move.arrival_window")],
      ["Service", sample("opportunity.service_type")], ["Move size", on(props, "show_size") ? sample("move.size") : ""],
      ["Volume", sample("move.estimated_volume") && `${sample("move.estimated_volume")} cu ft`],
      ["Weight", sample("move.estimated_weight") && `${sample("move.estimated_weight")} lbs`],
      ["Distance", sample("move.distance_miles") && `${sample("move.distance_miles")} mi`],
    ])));
  }
  if (on(props, "show_stops")) {
    cards.push(stopCard("Origin", "origin", on(props, "show_access")));
    cards.push(stopCard("Destination", "destination", on(props, "show_access")));
  }
  if (sample("move.customer_notes")) cards.push(card("Notes", `<div style="font-size:12px">${esc(sample("move.customer_notes"))}</div>`));
  return grid(cards);
}

function jobTimeline(props) {
  const cell = (value) => `<td style="padding:6px 4px;border-bottom:1px solid #e5e7eb">${esc(value)}</td>`;
  const head = ["Job", "Date", "Arrival window", "Start", "End"].map((label) =>
    `<th style="text-align:left;padding:6px 4px;border-bottom:2px solid ${PRIMARY}">${label}</th>`).join("");
  const row = `<tr>${cell("Moving day")}${cell(sample("move.date"))}${cell(sample("move.arrival_window"))}${cell(sample("move.start_time"))}${cell(sample("move.end_time"))}</tr>`;
  const facts = [];
  if (on(props, "show_crew")) facts.push(`${sample("estimate.crew_size")} movers`, `${sample("estimate.truck_count")} truck`);
  if (on(props, "show_hours")) facts.push(`${sample("estimate.estimated_hours")} hours estimated`, `${sample("estimate.travel_time_hours")} hour travel`);
  return headingBar(props?.title || "Schedule")
    + `<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>${head}</tr></thead><tbody>${row}</tbody></table>`
    + (facts.length ? `<p style="color:#6b7280;font-size:11.5px;margin:6px 0 0">${esc(facts.join(" · "))}</p>` : "");
}

function footer(props) {
  const align = ["left", "center", "right"].includes(props?.align) ? props.align : "center";
  const lines = [];
  if (props?.text) lines.push(esc(merge(props.text)).replace(/\n/g, "<br>"));
  if (on(props, "show_contact")) {
    lines.push(esc([sample("company.name"), sample("company.phone"), sample("company.email"), sample("company.website")].filter(Boolean).join(" · ")));
  }
  if (on(props, "show_license") && sample("company.state_license_number")) lines.push(esc(`Licence #${sample("company.state_license_number")}`));
  return `<div style="border-top:1px solid #d1d5db;padding-top:8px;font-size:11px;color:#6b7280;line-height:1.5;text-align:${align}">`
    + lines.map((line) => `<div>${line}</div>`).join("") + "</div>";
}

function paidStamp(props) {
  return `<div style="text-align:right"><span style="display:inline-block;border:4px solid #16a34a;color:#16a34a;font-size:26px;font-weight:800;letter-spacing:.2em;padding:2px 18px;border-radius:8px;transform:rotate(-8deg);opacity:.85">${esc(props?.label || "PAID")}</span>`
    + '<div style="color:#94a3b8;font-size:10px;margin-top:6px">Shown once the invoice has no balance due</div></div>';
}

/** Sample-data HTML of a prebuilt section, or null for any other block type. */
export function prebuiltSectionHtml(type, props = {}, mode = "contract") {
  switch (type) {
    case "doc_header": return header(props, mode);
    case "move_overview": return moveOverview(props);
    case "job_timeline": return jobTimeline(props);
    case "doc_footer": return footer(props);
    case "paid_stamp": return paidStamp(props);
    default: return null;
  }
}
