import { describe, expect, it } from "vitest";
import { createBackendWidget, fromBackendDocument, toBackendDocument } from "./documentAdapter";
import { createContentLayoutWidget, createTableWidget, createWidget } from "../model/templateModel";

const kinds = {
  document: [
    "columns", "spacer", "divider", "page_break", "conditional", "repeater", "heading", "text",
    "image", "table", "variable", "clause", "terms", "move_details", "crew_trucks",
    "estimate_summary", "charges", "inventory", "signature", "initial", "form_field",
  ],
  invoice: [
    "columns", "spacer", "divider", "page_break", "conditional", "repeater", "heading", "text",
    "image", "table", "variable", "clause", "terms", "move_details", "crew_trucks", "payment",
    "line_items", "totals", "payment_history",
  ],
  estimate_portal: [
    "columns", "spacer", "divider", "conditional", "repeater", "heading", "text", "image", "table",
    "variable", "clause", "terms", "button", "move_details", "crew_trucks", "estimate_summary",
    "charges", "inventory", "options", "payment", "signature",
  ],
};

describe("backend document widgets", () => {
  it.each(Object.entries(kinds))("inserts and serializes every %s palette widget", (kind, blockTypes) => {
    const items = blockTypes.map((type) => createBackendWidget({
      type,
      label: type.replace(/_/g, " "),
      container: ["columns", "conditional", "repeater"].includes(type),
      props_schema: { properties: {} },
    }, kind));

    const result = toBackendDocument({ items, settings: {} }, kind);
    const serializedTypes = result.sections.flatMap((section) => section.blocks.map((block) => block.type));

    expect(serializedTypes).toEqual(expect.arrayContaining(blockTypes));
    expect(serializedTypes.length).toBeGreaterThanOrEqual(blockTypes.length);
    expect(result.sections[0].blocks.find((block) => block.type === "conditional").props.rule_key).toBeTruthy();
    expect(result.rules).toHaveLength(1);
  });

  it("round-trips backend type, props, nested children, section metadata, rules and regions", () => {
    const document = {
      settings: { page: { size: "A4", orientation: "landscape" } },
      header: [{ key: "header_heading", type: "heading", props: { text: "Header" } }],
      footer: [{ key: "footer_text", type: "text", props: { html: "Footer" } }],
      sections: [{
        key: "terms_section",
        title: "Terms",
        page_break_before: true,
        blocks: [{
          key: "column_layout",
          type: "columns",
          props: { count: 2, gap: 12 },
          children: [{ key: "nested_heading", type: "heading", props: { text: "Nested", level: 2, align: "left" }, column: 1 }],
        }],
      }],
      rules: [],
      attachments: [{ key: "attachment_1", source: "file", file_asset_id: 10, filename: "terms.pdf", required: false }],
    };

    const loaded = fromBackendDocument(document);
    const saved = toBackendDocument(loaded, "contract");

    expect(saved.sections[0].key).toBe("terms_section");
    expect(saved.sections[0].page_break_before).toBe(true);
    expect(saved.sections[0].blocks[0]).toMatchObject(document.sections[0].blocks[0]);
    expect(saved.header).toEqual(document.header);
    expect(saved.footer).toEqual(document.footer);
    expect(saved.attachments).toEqual(document.attachments);
  });
});

describe("palette widgets keep their content when saved", () => {
  const save = (item) => toBackendDocument({ items: [item], pages: [{ id: "p1", items: [item] }] }, "contract")
    .sections.flatMap((section) => section.blocks)[0];

  it("saves custom table cells as text and merge fields", () => {
    const table = createTableWidget(2, 2, "");
    table.tableRows[0].cells[0].content = "Packing date";
    table.tableRows[0].cells[1].content = "<b>{{move.date}}</b>";
    table.tableRows[1].cells[0].content = "Crew";
    table.tableRows[1].cells[1].content = "{{estimate.crew_size}}";
    expect(save(table)).toMatchObject({ type: "table", props: {
      columns: ["", ""], rows: [["Packing date", "{{move.date}}"], ["Crew", "{{estimate.crew_size}}"]] } });

    table.tableSettings.headerRow = true;
    expect(save(table).props).toEqual({ columns: ["Packing date", "{{move.date}}"], rows: [["Crew", "{{estimate.crew_size}}"]] });
  });

  it("saves a legacy content layout as columns with its headings and text", () => {
    const block = save(createContentLayoutWidget("50-50", 1, 2, "Content Layout"));
    expect(block).toMatchObject({ type: "columns", props: { count: 2 } });
    expect(block.children.map((child) => [child.type, child.column])).toEqual([["heading", 1], ["text", 1]]);
  });

  it("keeps an empty notes widget valid and a custom field's label and value", () => {
    expect(save(createWidget("Notes", { type: "notes" }))).toMatchObject({ type: "text", props: { html: "<p></p>" } });
    expect(save(createWidget("Custom Field", { fieldLabel: "PO <number>", value: "{{opportunity.number}}" })).props.html)
      .toBe("<p><strong>PO &lt;number&gt;:</strong> {{opportunity.number}}</p>");
  });
});
