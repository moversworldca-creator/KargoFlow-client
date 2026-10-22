import { describe, expect, it } from "vitest";
import { WIDGET_CATEGORIES } from "../config/widgetToolboxConfig";
import { createInitialDocument, createWidget } from "./templateModel";

describe("createWidget", () => {
  it("uses a supported move-size merge field in the starter estimate", () => {
    const document = createInitialDocument("estimate");
    const shipment = document.items.find((item) => item.type === "shipment");

    expect(shipment.fields.find((field) => field.id === "weight")).toMatchObject({
      label: "Move Size",
      value: "{{move.size}}",
    });
  });

  it("does not expose arbitrary custom-field widgets in the toolbox", () => {
    expect(
      Object.values(WIDGET_CATEGORIES).flat().some((widget) => widget.type === "custom_field")
    ).toBe(false);
  });

  it("preserves component types from every template-mode toolbox", () => {
    const widgets = Object.values(WIDGET_CATEGORIES)
      .flat()
      .filter(
        (widget) =>
          !["custom_field", "layout", "table"].includes(widget.type)
      );

    for (const widget of widgets) {
      expect(createWidget(widget.label, widget).type).toBe(widget.type);
    }
  });

  it("preserves saved HTML component content and styles", () => {
    const html = "<p>Saved clause</p>";
    const css = ".saved-clause { color: navy; }";

    const widget = createWidget("Saved Clause", {
      type: "html",
      htmlContent: html,
      cssContent: css,
    });

    expect(widget).toMatchObject({
      type: "html",
      content: html,
      htmlContent: html,
      cssContent: css,
    });
  });

  it("does not apply sample styles to an inserted HTML component without CSS", () => {
    const widget = createWidget("Saved Clause", {
      type: "html",
      htmlContent: "<p>Saved clause</p>",
    });

    expect(widget.cssContent).toBe("");
  });
});
