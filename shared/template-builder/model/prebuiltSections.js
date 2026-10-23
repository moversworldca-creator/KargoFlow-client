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
const INK = "#0F172A";
const MUTED = "#64748B";
const BORDER = "#E2E8F0";
const SURFACE = "#F8FAFC";
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
    `<tr><td style="color:${MUTED};padding:4px 12px 4px 0;width:36%;vertical-align:top;line-height:1.5">${esc(label)}</td><td style="padding:4px 0;vertical-align:top;font-weight:500;color:${INK};overflow-wrap:anywhere;line-height:1.5">${esc(value)}</td></tr>`).join("");
  return rows ? `<table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:12px">${rows}</table>` : "";
};
const card = (title, body) => (body
  ? `<div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:${PRIMARY};margin:0 0 10px;padding-bottom:9px;border-bottom:1px solid ${BORDER}">${esc(title)}</div>${body}`
  : "");
const grid = (cells) => {
  const filled = cells.filter(Boolean);
  const cell = (content, span) => `<td${span ? ' colspan="3"' : ""} style="vertical-align:top;border:1px solid ${BORDER};background:${SURFACE};border-radius:10px;padding:15px 16px">${content}</td>`;
  const rows = [];
  for (let index = 0; index < filled.length; index += 2) {
    const pair = filled.slice(index, index + 2);
    rows.push(pair.length === 2
      ? `<tr>${cell(pair[0])}<td style="width:12px;border:none;padding:0"></td>${cell(pair[1])}</tr>`
      : `<tr>${cell(pair[0], true)}</tr>`);
  }
  return rows.length ? `<table style="width:100%;border-collapse:separate;border-spacing:0 12px;table-layout:fixed">${rows.join("")}</table>` : "";
};
export const headingBar = (title) => (title
  ? `<div style="font-size:14px;font-weight:700;letter-spacing:-.01em;color:${INK};border-bottom:1px solid ${BORDER};padding-bottom:10px;margin:18px 0 10px">${esc(merge(title))}</div>`
  : "");

function header(props, mode) {
  const contact = [];
  if (on(props, "show_contact")) {
    contact.push(sample("company.address"));
    contact.push([sample("company.phone"), sample("company.email"), sample("company.website")].filter(Boolean).join(" · "));
  }
  if (on(props, "show_license") && sample("company.state_license_number")) contact.push(`Licence #${sample("company.state_license_number")}`);
  const initials = sample("company.name").split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join("").toUpperCase();
  const logo = on(props, "show_logo")
    ? `<div style="display:inline-block;margin-bottom:10px;padding:9px 10px;border:1px solid ${BORDER};border-radius:9px;background:${SURFACE};color:${PRIMARY};font-size:13px;font-weight:700;letter-spacing:.04em">${esc(initials)}</div>`
    : "";
  const left = `${logo}<div style="font-size:19px;line-height:1.3;font-weight:700;letter-spacing:-.02em;color:${INK};margin-bottom:6px">${esc(sample("company.name"))}</div>`
    + contact.filter(Boolean).map((line) => `<div style="color:${MUTED};font-size:11px;line-height:1.65;overflow-wrap:anywhere">${esc(line)}</div>`).join("");
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
    `<tr><td style="color:${MUTED};padding:3px 10px 3px 0;text-align:right;vertical-align:top">${esc(label)}</td><td style="padding:3px 0;text-align:right;font-weight:600;vertical-align:top;color:${INK};overflow-wrap:anywhere">${esc(value)}</td></tr>`).join("");
  return `<table style="width:100%;border-collapse:collapse;table-layout:fixed;border-top:4px solid ${PRIMARY};border-bottom:1px solid ${BORDER}"><tr>`
    + `<td style="width:50%;vertical-align:top;padding:18px 24px 18px 0">${left}</td>`
    + `<td style="vertical-align:top;padding:18px 0;text-align:right"><div style="font-size:25px;line-height:1.2;font-weight:700;letter-spacing:-.03em;color:${PRIMARY};margin-bottom:12px;overflow-wrap:anywhere">${esc(title)}</div>`
    + (metaRows ? `<table style="width:auto;margin-left:auto;border-collapse:collapse;table-layout:auto;font-size:11px">${metaRows}</table>` : "")
    + "</td></tr></table>";
}

function stopCard(title, end, showAccess) {
  const address = sample(`move.${end}_address`);
  const body = (address ? `<div style="font-weight:600;font-size:13px;line-height:1.5;color:${INK};margin-bottom:9px;overflow-wrap:anywhere">${esc(address)}</div>` : "")
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
  const cell = (value) => `<td style="padding:12px 10px;border-bottom:1px solid ${BORDER};vertical-align:top;color:${INK};overflow-wrap:anywhere">${esc(value)}</td>`;
  const head = ["Job", "Date", "Arrival window", "Start", "End"].map((label) =>
    `<th style="text-align:left;padding:10px;background:#F1F5F9;color:${MUTED};font-size:10.5px;font-weight:600;border-bottom:1px solid ${BORDER}">${label}</th>`).join("");
  const row = `<tr>${cell("Moving day")}${cell(sample("move.date"))}${cell(sample("move.arrival_window"))}${cell(sample("move.start_time"))}${cell(sample("move.end_time"))}</tr>`;
  const facts = [];
  if (on(props, "show_crew")) facts.push(`${sample("estimate.crew_size")} movers`, `${sample("estimate.truck_count")} truck`);
  if (on(props, "show_hours")) facts.push(`${sample("estimate.estimated_hours")} hours estimated`, `${sample("estimate.travel_time_hours")} hour travel`);
  return headingBar(props?.title || "Schedule")
    + `<div style="border:1px solid ${BORDER};border-radius:10px;overflow:hidden"><table style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:12px"><thead><tr>${head}</tr></thead><tbody>${row}</tbody></table></div>`
    + (facts.length ? `<p style="color:${MUTED};font-size:11px;line-height:1.6;margin:10px 0 0;padding:9px 12px;background:${SURFACE};border:1px solid ${BORDER};border-radius:8px">${esc(facts.join(" · "))}</p>` : "");
}

function footer(props) {
  const align = ["left", "center", "right"].includes(props?.align) ? props.align : "center";
  const lines = [];
  if (props?.text) lines.push(esc(merge(props.text)).replace(/\n/g, "<br>"));
  if (on(props, "show_contact")) {
    lines.push(esc([sample("company.name"), sample("company.phone"), sample("company.email"), sample("company.website")].filter(Boolean).join(" · ")));
  }
  if (on(props, "show_license") && sample("company.state_license_number")) lines.push(esc(`Licence #${sample("company.state_license_number")}`));
  return `<div style="border-top:1px solid ${BORDER};margin-top:24px;padding-top:14px;font-size:11px;color:${MUTED};line-height:1.7;text-align:${align}">`
    + lines.map((line, index) => `<div${index === 0 ? ` style="font-weight:600;color:${INK};margin-bottom:3px"` : ""}>${line}</div>`).join("") + "</div>";
}

function paidStamp(props) {
  return `<div style="text-align:right"><span style="display:inline-block;border:1px solid #A7F3D0;background:#ECFDF5;color:#047857;font-size:13px;font-weight:700;letter-spacing:.1em;padding:8px 16px;border-radius:999px">${esc(props?.label || "PAID")}</span>`
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
