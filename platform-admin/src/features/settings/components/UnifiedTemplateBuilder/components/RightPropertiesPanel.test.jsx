import React, { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import RightPropertiesPanel from "./RightPropertiesPanel";

afterEach(cleanup);

function StatefulPropertiesPanel({ initialItem, mode = "document" }) {
  const [selectedItem, setSelectedItem] = useState(initialItem);
  return (
    <RightPropertiesPanel
      selectedItem={selectedItem}
      onUpdateItem={setSelectedItem}
      onDeleteItem={() => {}}
      onDuplicateItem={() => {}}
      documentSettings={{}}
      onUpdateDocumentSettings={() => {}}
      mode={mode}
    />
  );
}

describe("RightPropertiesPanel widget fields", () => {
  it("keeps the text editor focused while its value updates on each keystroke", () => {
    const item = {
      id: "text-1",
      type: "builder_block",
      blockType: "text",
      label: "Text",
      props: { html: "<p>Existing content</p>" },
      propsSchema: {
        type: "object",
        properties: {
          html: { type: "string", format: "html" },
        },
        required: ["html"],
      },
    };

    render(<StatefulPropertiesPanel initialItem={item} />);
    const editor = screen.getByLabelText("html *");

    editor.focus();
    expect(editor).toHaveFocus();
    fireEvent.change(editor, { target: { value: "<p>Updated content</p>" } });
    expect(screen.getByLabelText("html *")).toBe(editor);
    expect(editor).toHaveValue("<p>Updated content</p>");

    fireEvent.change(editor, { target: { value: "<p>Updated content again</p>" } });
    expect(screen.getByLabelText("html *")).toBe(editor);
    expect(editor).toHaveValue("<p>Updated content again</p>");
  });

  it("hides conditional rule key, condition and children JSON controls", () => {
    const item = {
      id: "conditional-1",
      type: "builder_block",
      blockType: "conditional",
      label: "Conditional group",
      props: { rule_key: "rule_conditional-1" },
      condition: { var: "company.name", op: "not_empty" },
      children: [{ key: "child-1", type: "text", props: { html: "<p>Keep this content</p>" } }],
      container: true,
      propsSchema: {
        type: "object",
        properties: {
          rule_key: { type: "string" },
        },
        required: ["rule_key"],
      },
    };

    render(<StatefulPropertiesPanel initialItem={item} />);

    expect(screen.queryByText("conditional settings")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("rule key *")).not.toBeInTheDocument();
    expect(screen.queryByText("Show condition")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("children")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Condition variable")).not.toBeInTheDocument();
  });

  it.each(["document", "estimate"])("hides the raw children editor for container widgets in %s mode", (mode) => {
    const item = {
      id: "columns-1",
      type: "builder_block",
      blockType: "columns",
      label: "Columns",
      props: { count: 2, gap: 16 },
      children: [{ key: "nested-1", type: "text", props: { html: "<p>Preserved nested content</p>" } }],
      container: true,
      propsSchema: {
        type: "object",
        properties: {
          count: { type: "integer" },
          gap: { type: "integer" },
        },
      },
    };

    render(<StatefulPropertiesPanel initialItem={item} mode={mode} />);

    expect(screen.queryByLabelText("children")).not.toBeInTheDocument();
    expect(screen.getByLabelText("count")).toHaveValue(2);
    expect(screen.getByLabelText("gap")).toHaveValue(16);
    expect(screen.getByText("columns settings")).toBeInTheDocument();
  });

  it("aligns boolean widget settings consistently and keeps them interactive", () => {
    const item = {
      id: "move-details-1",
      type: "builder_block",
      blockType: "move_details",
      label: "Move details",
      props: { show_dates: true, show_stops: false, show_move_size: true },
      propsSchema: {
        type: "object",
        properties: {
          show_dates: { type: "boolean" },
          show_stops: { type: "boolean" },
          show_move_size: { type: "boolean" },
        },
      },
    };

    render(<StatefulPropertiesPanel initialItem={item} />);

    const datesToggle = screen.getByLabelText("show dates");
    const stopsToggle = screen.getByLabelText("show stops");
    const moveSizeToggle = screen.getByLabelText("show move size");

    for (const toggle of [datesToggle, stopsToggle, moveSizeToggle]) {
      expect(toggle).toHaveClass("h-4", "w-4", "shrink-0");
      expect(toggle.parentElement).toHaveClass("flex", "items-center", "justify-between", "gap-3");
    }
    expect(datesToggle).toBeChecked();
    expect(stopsToggle).not.toBeChecked();
    expect(moveSizeToggle).toBeChecked();

    fireEvent.click(stopsToggle);
    expect(stopsToggle).toBeChecked();
  });
});
