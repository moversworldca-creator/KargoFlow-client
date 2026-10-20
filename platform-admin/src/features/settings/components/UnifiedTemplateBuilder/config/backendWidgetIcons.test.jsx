import React from "react";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { BACKEND_WIDGET_ICONS } from "./backendWidgetIcons";

describe("backend document widget icons", () => {
  it("assigns a unique icon to every backend widget across document, estimate and invoice palettes", () => {
    expect(Object.keys(BACKEND_WIDGET_ICONS).sort()).toEqual([
      "button",
      "charges",
      "clause",
      "columns",
      "conditional",
      "crew_trucks",
      "divider",
      "estimate_summary",
      "form_field",
      "heading",
      "image",
      "initial",
      "inventory",
      "line_items",
      "move_details",
      "options",
      "page_break",
      "payment",
      "payment_history",
      "repeater",
      "signature",
      "spacer",
      "table",
      "terms",
      "text",
      "totals",
      "variable",
    ]);
    expect(new Set(Object.values(BACKEND_WIDGET_ICONS)).size).toBe(27);
    expect(BACKEND_WIDGET_ICONS.payment).toBeTruthy();
    expect(BACKEND_WIDGET_ICONS.button).toBeTruthy();
    expect(BACKEND_WIDGET_ICONS.options).toBeTruthy();
  });

  it("renders every mapped icon as a decorative SVG", () => {
    const { container } = render(
      <div>
        {Object.entries(BACKEND_WIDGET_ICONS).map(([type, Icon]) => (
          <Icon key={type} data-widget-icon={type} aria-hidden="true" />
        ))}
      </div>
    );

    expect(container.querySelectorAll("svg")).toHaveLength(27);
    expect(container.querySelector('[data-widget-icon="page_break"]')).not.toBeNull();
    expect(container.querySelector('[data-widget-icon="form_field"]')).not.toBeNull();
  });
});
