import { describe, expect, it } from "vitest";
import { createBackendWidget, fromBackendDocument, toBackendDocument } from "./documentAdapter";

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

  it("persists supported divider style and color options", () => {
    const result = toBackendDocument({
      items: [{
        id: "divider-1",
        type: "divider",
        color: "#336699",
        style: { borderStyle: "dashed" },
      }],
      settings: {},
    }, "contract");

    expect(result.sections[0].blocks[0]).toEqual({
      key: "divider-1",
      type: "divider",
      props: { style: "dashed", color: "#336699" },
    });
  });

  it("persists custom widget fields and dynamic bindings through document hydration", () => {
    const customFields = {
      move_date: {
        label: "Scheduled date",
        mode: "custom",
        value: "June 20, 2026",
        customValue: "June 20, 2026",
        dynamicValue: "{{move.pickup_date}}",
      },
    };
    const document = toBackendDocument({
      items: [{
        id: "move-details-1",
        type: "move_details",
        label: "Moving schedule",
        customFields,
      }],
      settings: {},
    }, "contract");

    expect(document.sections[0].blocks[0].props.custom_fields).toEqual(customFields);
    const reloaded = fromBackendDocument(document);
    expect(reloaded.items[0].props.custom_fields).toEqual(customFields);
  });

  it("round-trips widget custom values and merge-field overrides without dropping dynamic bindings", () => {
    const widget = {
      id: "editable-variable",
      type: "builder_block",
      label: "Customer",
      blockType: "variable",
      props: {
        token: "customer.full_name",
        custom_fields: {
          merge_field: {
            mode: "custom",
            value: "Template label",
            customValue: "Template label",
            dynamicValue: "{{customer.full_name}}",
          },
          custom_location: {
            label: "Service location",
            mode: "custom",
            value: "Vancouver",
            customValue: "Vancouver",
          },
        },
      },
    };
    const saved = toBackendDocument({ items: [widget], settings: {} }, "contract");
    const reopened = fromBackendDocument(saved);

    expect(saved.sections[0].blocks[0].props).toEqual(widget.props);
    expect(reopened.items[0].props).toEqual(widget.props);
  });

});
