import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import RightPropertiesPanel from "./RightPropertiesPanel";

afterEach(cleanup);

function StatefulPropertiesPanel({ initialItem, mode = "document", onUpdate = () => {} }) {
  const [selectedItem, setSelectedItem] = useState(initialItem);
  return (
    <RightPropertiesPanel
      selectedItem={selectedItem}
      onUpdateItem={(updated) => {
        setSelectedItem(updated);
        onUpdate(updated);
      }}
      onDeleteItem={() => {}}
      onDuplicateItem={() => {}}
      documentSettings={{}}
      onUpdateDocumentSettings={() => {}}
      mode={mode}
    />
  );
}

function SelectablePropertiesPanel({ item }) {
  const [selectedItem, setSelectedItem] = useState(null);
  return (
    <>
      <button type="button" onClick={() => setSelectedItem(item)}>Select widget</button>
      <RightPropertiesPanel
        selectedItem={selectedItem}
        onUpdateItem={setSelectedItem}
        onDeleteItem={() => {}}
        onDuplicateItem={() => {}}
        documentSettings={{}}
        onUpdateDocumentSettings={() => {}}
      />
    </>
  );
}

describe("RightPropertiesPanel widget fields", () => {
  it("focuses the widget label after selecting a backend widget", () => {
    render(
      <SelectablePropertiesPanel
        item={{
          id: "move-details-1",
          type: "builder_block",
          blockType: "move_details",
          label: "Move details",
          props: {},
          propsSchema: { type: "object", properties: {} },
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Select widget" }));

    expect(screen.getByDisplayValue("Move details")).toHaveFocus();
  });

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

  it("edits supported conditional rules without exposing internal keys or children JSON", () => {
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

    expect(screen.getByText("conditional settings")).toBeInTheDocument();
    expect(screen.queryByLabelText("rule key *")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Condition variable")).toHaveValue("company.name");
    expect(screen.getByLabelText("Condition operator")).toHaveValue("not_empty");
    expect(screen.queryByLabelText("children")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Condition operator"), { target: { value: "eq" } });
    fireEvent.change(screen.getByLabelText("Condition value"), { target: { value: "KargoFlow" } });
    expect(screen.getByLabelText("Condition operator")).toHaveValue("eq");
    expect(screen.getByLabelText("Condition value")).toHaveValue("KargoFlow");
  });

  it("edits nested content without replacing its block structure or bindings", () => {
    const item = {
      id: "conditional-children",
      type: "builder_block",
      blockType: "conditional",
      props: { rule_key: "rule_conditional-children" },
      condition: { var: "customer.email", op: "not_empty" },
      children: [{
        key: "child-1",
        type: "text",
        props: { html: "<p>Original {{customer.first_name}}</p>", format: "rich" },
      }],
      propsSchema: { type: "object", properties: { rule_key: { type: "string" } } },
    };
    const onUpdate = vi.fn();
    render(<StatefulPropertiesPanel initialItem={item} onUpdate={onUpdate} />);

    const content = screen.getByLabelText("Nested text content child-1");
    fireEvent.change(content, { target: { value: "<p>Updated {{customer.first_name}}</p>" } });

    expect(onUpdate).toHaveBeenLastCalledWith({
      ...item,
      children: [{
        ...item.children[0],
        props: {
          ...item.children[0].props,
          html: "<p>Updated {{customer.first_name}}</p>",
        },
      }],
    });
    expect(screen.getByLabelText("Condition variable")).toHaveValue("customer.email");
  });

  it("updates spacer and divider configuration through the properties panel", () => {
    render(
      <StatefulPropertiesPanel initialItem={{ id: "spacer-1", type: "spacer", height: 24 }} />
    );
    fireEvent.change(screen.getByLabelText("Spacer Height"), { target: { value: "72" } });
    expect(screen.getByLabelText("Spacer Height")).toHaveValue("72");

    cleanup();
    render(
      <StatefulPropertiesPanel
        initialItem={{
          id: "divider-1",
          type: "divider",
          style: { borderStyle: "solid", borderWidth: 1, borderColor: "#e2e8f0" },
          spacing: 8,
        }}
      />
    );
    fireEvent.change(screen.getByLabelText("Divider line style"), { target: { value: "dashed" } });
    fireEvent.change(screen.getByLabelText("Divider line color"), { target: { value: "#336699" } });
    expect(screen.getByLabelText("Divider line style")).toHaveValue("dashed");
    expect(screen.getByLabelText("Divider line color")).toHaveValue("#336699");
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
