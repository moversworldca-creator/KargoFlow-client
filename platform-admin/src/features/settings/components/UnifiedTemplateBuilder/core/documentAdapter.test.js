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

  it("normalizes the legacy move-weight alias when hydrating and serializing documents", () => {
    const backendDocument = {
      settings: { page: { size: "Letter", orientation: "portrait" } },
      sections: [{
        key: "main",
        blocks: [{
          key: "move-details",
          type: "move_details",
          props: {
            custom_fields: {
              move_size: { mode: "dynamic", dynamicValue: "{{move.estimated_weight}}" },
            },
          },
        }],
      }],
      rules: [],
    };
    const loaded = fromBackendDocument(backendDocument);
    const saved = toBackendDocument(loaded, "contract");

    expect(loaded.items[0].props.custom_fields.move_size.dynamicValue).toBe("{{move.estimated_weight}}");
    expect(saved.sections[0].blocks[0].props.custom_fields.move_size.dynamicValue).toBe("{{move.estimated_weight}}");
  });

  it("keeps custom HTML styling in the server-preview document payload", () => {
    const saved = toBackendDocument({
      items: [{
        id: "estimate-html",
        type: "html",
        htmlContent: '<div class="estimate-header"><h1>Estimate</h1></div>',
        cssContent: ".estimate-header { display: flex; color: #123456; }",
      }],
      settings: {},
    }, "estimate");
    const previewHtml = saved.sections[0].blocks[0].props.html;

    expect(previewHtml).toContain("<style>");
    expect(previewHtml).toContain(".html-doc-estimate-html .estimate-header");
    expect(previewHtml).toContain("display: flex");
    expect(previewHtml).toContain("color: #123456");
    expect(previewHtml).toContain('class="html-doc-estimate-html"');
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

  it("round-trips heading typography and text alignment", () => {
    const heading = {
      id: "heading-styled",
      type: "heading",
      label: "Estimate heading",
      content: "Estimate",
      level: 1,
      style: {
        align: "center",
        fontFamily: "Georgia, serif",
        fontSize: 24,
        fontWeight: 600,
        bold: false,
        italic: true,
        underline: true,
        strikethrough: false,
        textTransform: "uppercase",
        letterSpacing: 1,
        lineHeight: 1.4,
        color: "#336699",
      },
    };

    const saved = toBackendDocument({ items: [heading], settings: {} }, "contract");
    const savedHeading = saved.sections[0].blocks[0];

    expect(savedHeading.props).toEqual({
      text: "Estimate",
      level: 1,
      align: "center",
      style: {
        font_family: "Georgia, serif",
        font_size: 24,
        font_weight: 600,
        bold: false,
        italic: true,
        underline: true,
        strikethrough: false,
        text_transform: "uppercase",
        letter_spacing: 1,
        line_height: 1.4,
        color: "#336699",
      },
    });

    const reopened = fromBackendDocument(saved).items[0];
    expect(reopened.style).toEqual(heading.style);
    expect(toBackendDocument({ items: [reopened], settings: {} }, "contract").sections[0].blocks[0].props)
      .toEqual(savedHeading.props);
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

    const persistedCustomFields = {
      move_date: {
        ...customFields.move_date,
        dynamicValue: "{{move.date}}",
      },
    };
    expect(customFields.move_date.dynamicValue).toBe("{{move.pickup_date}}");
    expect(document.sections[0].blocks[0].props.custom_fields).toEqual(persistedCustomFields);
    const reloaded = fromBackendDocument(document);
    expect(reloaded.items[0].props.custom_fields).toEqual(persistedCustomFields);
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

  it("fills required block defaults and normalizes legacy editor values before saving", () => {
    const saved = toBackendDocument({
      items: [
        { id: "layout", type: "builder_block", blockType: "columns", props: { count: "3", gap: "20" } },
        { id: "layout-default", type: "builder_block", blockType: "columns", props: {} },
        { id: "spacer", type: "builder_block", blockType: "spacer", props: { height: "36" } },
        { id: "text", type: "builder_block", blockType: "text", props: {} },
        { id: "variable", type: "builder_block", blockType: "variable", props: { token: "company.name", format: "text" } },
        { id: "signature", type: "builder_block", blockType: "signature", props: { field_key: "sig_1", signer_role: "client" } },
      ],
      settings: {},
    }, "contract");
    const propsById = Object.fromEntries(saved.sections[0].blocks.map(({ key, props }) => [key, props]));

    expect(propsById.layout).toEqual({ count: 3, gap: 20 });
    expect(propsById["layout-default"]).toEqual({ count: 2 });
    expect(propsById.spacer.height).toBe(36);
    expect(propsById.text.html).toBe("<p>Enter text here.</p>");
    expect(propsById.variable).toEqual({ token: "company.name" });
    expect(propsById.signature.signer_role).toBe("customer");
  });

  it.each(["contract", "estimate"])("normalizes signature field keys for %s preview, save, and PDF serialization", (mode) => {
    const saved = toBackendDocument({
      items: [
        { id: "missing-key", type: "builder_block", blockType: "signature", props: {} },
        { id: "invalid-key", type: "builder_block", blockType: "signature", props: { field_key: "9 sign/field" } },
        { id: "long-key", type: "builder_block", blockType: "signature", props: { field_key: `sig_${"x".repeat(80)}` } },
        { id: "initial", type: "builder_block", blockType: "initial", props: { field_key: "" } },
        { id: "form-field", type: "builder_block", blockType: "form_field", props: { field_key: "field_1", field_type: "text" } },
        { id: "legacy-signature", type: "signature", field_key: "invalid key!" },
      ],
      settings: {},
    }, mode);
    const blocks = saved.sections[0].blocks;
    const fieldKeys = blocks.map(({ props }) => props.field_key);

    expect(fieldKeys).toEqual([
      "sig_missing-key",
      "field_9_sign_field",
      `sig_${"x".repeat(60)}`,
      "initial_initial",
      "field_1",
      "invalid_key_",
    ]);
    fieldKeys.forEach((fieldKey) => {
      expect(fieldKey).toMatch(/^[A-Za-z][A-Za-z0-9_-]{0,63}$/);
    });
  });

});
