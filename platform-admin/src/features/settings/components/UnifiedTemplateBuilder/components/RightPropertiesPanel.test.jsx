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
  it("removes CRM field bindings while retaining editable builder widget settings", () => {
    const onUpdate = vi.fn();
    render(
      <StatefulPropertiesPanel
        initialItem={{
          id: "heading-1",
          type: "builder_block",
          blockType: "heading",
          props: { text: "Estimate" },
          propsSchema: {
            type: "object",
            properties: { text: { type: "string" } },
            required: ["text"],
          },
        }}
        onUpdate={onUpdate}
      />
    );

    expect(screen.queryByText("CRM field bindings")).not.toBeInTheDocument();
    expect(screen.queryByText("CRM field (placeholder)")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/CRM field placeholder/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/text \*/i), { target: { value: "Updated heading" } });
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      props: expect.objectContaining({ text: "Updated heading" }),
    }));
  });

  it("shows a dismissible confirmation after applying builder block changes", () => {
    const onUpdate = vi.fn();

    render(
      <StatefulPropertiesPanel
        initialItem={{
          id: "totals-1",
          type: "builder_block",
          blockType: "totals",
          label: "Totals",
          props: {},
          propsSchema: { type: "object", properties: { total: { type: "number" } } },
        }}
        onUpdate={onUpdate}
      />
    );

    expect(screen.queryByText("Changes applied")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Apply Changes" }));

    expect(onUpdate).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent("Changes applied");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss changes applied notification" }));
    expect(screen.queryByText("Changes applied")).not.toBeInTheDocument();
  });

  it("discards unapplied custom field edits when Cancel is clicked", () => {
    const onUpdate = vi.fn();

    render(
      <StatefulPropertiesPanel
        initialItem={{
          id: "totals-1",
          type: "builder_block",
          blockType: "totals",
          label: "Totals",
          props: {},
          propsSchema: { type: "object", properties: {} },
        }}
        onUpdate={onUpdate}
      />
    );

    const customValue = screen.getByRole("spinbutton", { name: "Subtotal custom value" });
    fireEvent.change(customValue, { target: { value: "125.50" } });
    expect(customValue).toHaveValue(125.5);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(customValue).toHaveValue(null);
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("keeps record money values locked while their labels stay editable", () => {
    const onUpdate = vi.fn();
    render(
      <StatefulPropertiesPanel
        initialItem={{
          id: "totals-locked",
          type: "builder_block",
          blockType: "totals",
          label: "Totals",
          props: { custom_fields: { subtotal: { mode: "custom", value: 1, customValue: 1 } } },
          propsSchema: { type: "object", properties: {} },
        }}
        onUpdate={onUpdate}
      />
    );

    expect(screen.getByRole("spinbutton", { name: "Subtotal custom value" })).toBeDisabled();
    expect(screen.getByLabelText("Subtotal CRM placeholder")).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "Subtotal field name" }), { target: { value: "Moving subtotal" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply Changes" }));

    const subtotal = onUpdate.mock.calls.at(-1)[0].props.custom_fields.subtotal;
    expect(subtotal.label).toBe("Moving subtotal");
    expect(subtotal).not.toHaveProperty("mode");
    expect(subtotal).not.toHaveProperty("customValue");
    expect(subtotal).not.toHaveProperty("dynamicValue");
  });

  it("applies added pricing field edits to builder block custom fields", () => {
    const onUpdate = vi.fn();

    render(
      <StatefulPropertiesPanel
        initialItem={{
          id: "charges-1",
          type: "builder_block",
          blockType: "charges",
          props: {},
          propsSchema: { type: "object", properties: { enabled: { type: "boolean" } } },
        }}
        onUpdate={onUpdate}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Add Custom Pricing Field" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Pricing field 1 name" }), {
      target: { value: "Fuel surcharge" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Fuel surcharge current value" }), {
      target: { value: "40.00" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Fuel surcharge custom value" }), {
      target: { value: "45.00" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Apply Changes" }));

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      id: "charges-1",
      props: expect.objectContaining({
        custom_fields: expect.objectContaining({
          custom_1: expect.objectContaining({
            label: "Fuel surcharge",
            currentValue: 40,
            value: 45,
            customValue: 45,
          }),
        }),
      }),
    }));
  });

  it("uses prebuilt CRM placeholders for non-pricing widget data bindings", () => {
    const onUpdate = vi.fn();
    render(
      <StatefulPropertiesPanel
        initialItem={{
          id: "move-details-1",
          type: "builder_block",
          blockType: "move_details",
          label: "Move details",
          props: {},
          propsSchema: { type: "object", properties: { show_dates: { type: "boolean" } } },
        }}
        onUpdate={onUpdate}
      />
    );

    expect(screen.queryByRole("button", { name: "Add Custom Field" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Custom field 1 name")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Move date CRM placeholder"), {
      target: { value: "{{customer.full_name}}" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply Changes" }));

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      id: "move-details-1",
      props: expect.objectContaining({
        custom_fields: expect.objectContaining({
          move_date: expect.objectContaining({
            mode: "dynamic",
            value: "{{customer.full_name}}",
            dynamicValue: "{{customer.full_name}}",
          }),
        }),
      }),
    }));
    expect(screen.getByText("Changes applied")).toBeInTheDocument();
  });

  it("applies Crew and Assignment column heading edits to builder widget props", () => {
    const onUpdate = vi.fn();
    render(
      <StatefulPropertiesPanel
        initialItem={{
          id: "crew-trucks-1",
          type: "builder_block",
          blockType: "crew_trucks",
          label: "Crew and trucks",
          props: {},
          propsSchema: {
            type: "object",
            properties: {
              show_names: { type: "boolean" },
              show_trucks: { type: "boolean" },
            },
          },
        }}
        onUpdate={onUpdate}
      />
    );

    fireEvent.change(screen.getByLabelText("Crew column heading"), {
      target: { value: "Team / vehicle" },
    });
    fireEvent.change(screen.getByLabelText("Assignment column heading"), {
      target: { value: "Assigned resource" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply Changes" }));

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      id: "crew-trucks-1",
      props: expect.objectContaining({
        custom_fields: expect.objectContaining({
          crew_title: expect.objectContaining({ label: "Team / vehicle" }),
          truck_title: expect.objectContaining({ label: "Assigned resource" }),
        }),
      }),
    }));
  });

  it("provides CRM placeholder selectors for both Crew and Assignment headings", () => {
    const onUpdate = vi.fn();
    render(
      <StatefulPropertiesPanel
        initialItem={{
          id: "crew-trucks-placeholders",
          type: "builder_block",
          blockType: "crew_trucks",
          label: "Crew and trucks",
          props: {},
          propsSchema: { type: "object", properties: {} },
        }}
        onUpdate={onUpdate}
      />
    );

    const crewPlaceholder = screen.getByLabelText("Crew column heading CRM placeholder");
    const assignmentPlaceholder = screen.getByLabelText("Assignment column heading CRM placeholder");
    expect(crewPlaceholder).toHaveValue("");
    expect(assignmentPlaceholder).toHaveValue("");
    expect(screen.queryByRole("option", { name: "Choose CRM placeholder" })).not.toBeInTheDocument();

    fireEvent.change(crewPlaceholder, { target: { value: "{{customer.full_name}}" } });
    fireEvent.change(assignmentPlaceholder, { target: { value: "{{company.name}}" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply Changes" }));

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      props: expect.objectContaining({
        custom_fields: expect.objectContaining({
          crew_title: expect.objectContaining({
            label: "Crew / vehicle",
            mode: "dynamic",
            value: "{{customer.full_name}}",
            dynamicValue: "{{customer.full_name}}",
          }),
          truck_title: expect.objectContaining({
            label: "Assignment",
            mode: "dynamic",
            value: "{{company.name}}",
            dynamicValue: "{{company.name}}",
          }),
        }),
      }),
    }));
    expect(Array.from(crewPlaceholder.options, (option) => option.value)).not.toContain("{{estimate.discount}}");
  });

  it("discards unapplied Crew and Assignment heading edits when canceled", () => {
    const onUpdate = vi.fn();
    render(
      <StatefulPropertiesPanel
        initialItem={{
          id: "crew-trucks-cancel",
          type: "builder_block",
          blockType: "crew_trucks",
          label: "Crew and trucks",
          props: {},
          propsSchema: { type: "object", properties: {} },
        }}
        onUpdate={onUpdate}
      />
    );

    const crewHeading = screen.getByLabelText("Crew column heading");
    fireEvent.change(crewHeading, { target: { value: "Team" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(crewHeading).toHaveValue("Crew / vehicle");
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("discards unapplied CRM placeholder changes when Cancel is clicked", () => {
    const onUpdate = vi.fn();
    render(
      <StatefulPropertiesPanel
        initialItem={{
          id: "move-details-dynamic",
          type: "builder_block",
          blockType: "move_details",
          label: "Move details",
          props: {
            custom_fields: {
              move_date: {
                mode: "dynamic",
                value: "{{legacy.move_date}}",
                dynamicValue: "{{legacy.move_date}}",
              },
            },
          },
          propsSchema: { type: "object", properties: {} },
        }}
        onUpdate={onUpdate}
      />
    );

    const placeholder = screen.getByLabelText("Move date CRM placeholder");
    expect(placeholder).toHaveValue("{{legacy.move_date}}");
    expect(screen.getByRole("option", {
      name: "Existing binding: {{legacy.move_date}}",
    })).toBeInTheDocument();
    fireEvent.change(placeholder, { target: { value: "{{customer.full_name}}" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(placeholder).toHaveValue("{{legacy.move_date}}");
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("keeps normal heading content editable without a custom-value field", () => {
    const onUpdate = vi.fn();
    render(
      <StatefulPropertiesPanel
        initialItem={{
          id: "heading-2",
          type: "builder_block",
          blockType: "heading",
          label: "Heading",
          props: { text: "Estimate" },
          propsSchema: { type: "object", properties: { text: { type: "string" } } },
        }}
        onUpdate={onUpdate}
      />
    );

    expect(screen.queryByLabelText("Heading custom value")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("text"), { target: { value: "Updated estimate" } });

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      props: expect.objectContaining({ text: "Updated estimate" }),
    }));
  });

  it("limits merge-field widget data binding to prebuilt CRM placeholders", () => {
    const onUpdate = vi.fn();
    render(
      <StatefulPropertiesPanel
        initialItem={{
          id: "variable-1",
          type: "builder_block",
          blockType: "variable",
          props: { token: "customer.full_name" },
          propsSchema: { type: "object", properties: { token: { type: "string" } }, required: ["token"] },
        }}
        onUpdate={onUpdate}
      />
    );

    const placeholder = screen.getByLabelText("token *");
    expect(placeholder.tagName).toBe("SELECT");
    expect(screen.queryByRole("textbox", { name: "token *" })).not.toBeInTheDocument();
    fireEvent.change(placeholder, { target: { value: "customer.email" } });

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      props: expect.objectContaining({ token: "customer.email" }),
    }));
  });

  it("uses CRM placeholders instead of static inputs for legacy header data fields", () => {
    const onUpdate = vi.fn();
    render(
      <StatefulPropertiesPanel
        initialItem={{
          id: "header-legacy",
          type: "header",
          label: "Estimate Header",
          fields: [
            { id: "companyName", label: "Company", value: "{{company.name}}" },
            { id: "estimateTitle", label: "Title", value: "Estimate" },
            { id: "estimateNumber", label: "Number", value: "{{estimate.number}}" },
          ],
        }}
        onUpdate={onUpdate}
      />
    );

    const companyPlaceholder = screen.getByLabelText("Company CRM placeholder");
    expect(companyPlaceholder.tagName).toBe("SELECT");
    fireEvent.change(companyPlaceholder, { target: { value: "{{company.phone}}" } });

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      fields: expect.arrayContaining([
        expect.objectContaining({ id: "companyName", value: "{{company.phone}}" }),
      ]),
    }));
    expect(screen.getByDisplayValue("Estimate")).toBeInTheDocument();
  });

  it("inserts existing CRM placeholders into email subjects and body blocks", () => {
    const onUpdateDocumentSettings = vi.fn();
    const onInsertPlaceholder = vi.fn();
    render(
      <RightPropertiesPanel
        selectedItem={null}
        onUpdateItem={() => {}}
        onDeleteItem={() => {}}
        onDuplicateItem={() => {}}
        documentSettings={{ subject: "Your estimate" }}
        onUpdateDocumentSettings={onUpdateDocumentSettings}
        mode="email"
        onInsertPlaceholder={onInsertPlaceholder}
      />
    );

    fireEvent.change(screen.getByLabelText("Insert Placeholder into email subject"), {
      target: { value: "{{opportunity.number}}" },
    });
    expect(onUpdateDocumentSettings).toHaveBeenCalledWith(expect.objectContaining({
      subject: "Your estimate {{opportunity.number}}",
    }));

    fireEvent.change(screen.getByLabelText("Insert Placeholder into email body"), {
      target: { value: "{{customer.email}}" },
    });
    expect(onInsertPlaceholder).toHaveBeenCalledWith("{{customer.email}}");
  });

  it("inserts prebuilt CRM placeholders into SMS without introducing pricing controls", () => {
    const onInsertPlaceholder = vi.fn();
    render(
      <RightPropertiesPanel
        selectedItem={null}
        onUpdateItem={() => {}}
        onDeleteItem={() => {}}
        onDuplicateItem={() => {}}
        documentSettings={{}}
        onUpdateDocumentSettings={() => {}}
        mode="sms"
        smsText="Hello"
        onInsertPlaceholder={onInsertPlaceholder}
      />
    );

    fireEvent.change(screen.getByLabelText("Insert Placeholder into SMS message"), {
      target: { value: "{{move.date}}" },
    });
    expect(onInsertPlaceholder).toHaveBeenCalledWith("{{move.date}}");
    expect(screen.queryByText("Pricing values")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Custom Pricing Field" })).not.toBeInTheDocument();
  });

  it("does not allow custom overrides for calculated pricing fields", () => {
    render(
      <StatefulPropertiesPanel
        initialItem={{
          id: "summary-readonly",
          type: "builder_block",
          blockType: "estimate_summary",
          label: "Summary",
          props: {},
          propsSchema: { type: "object", properties: {} },
        }}
      />
    );

    expect(screen.queryByLabelText("Tax (calculated) custom value")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Estimate total (calculated) custom value")).not.toBeInTheDocument();
  });

  it("does not expose custom-field creation for non-pricing blocks", () => {
    const onUpdate = vi.fn();
    render(
      <StatefulPropertiesPanel
        initialItem={{
          id: "move-details-1",
          type: "builder_block",
          blockType: "move_details",
          label: "Move details",
          props: {},
          propsSchema: { type: "object", properties: {} },
        }}
        onUpdate={onUpdate}
      />
    );

    expect(screen.queryByRole("button", { name: "Add Custom Field" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Custom field 1 name")).not.toBeInTheDocument();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("discards added pricing field edits on Cancel", () => {
    const onUpdate = vi.fn();

    render(
      <StatefulPropertiesPanel
        initialItem={{
          id: "charges-1",
          type: "builder_block",
          blockType: "charges",
          props: {},
          propsSchema: { type: "object", properties: {} },
        }}
        onUpdate={onUpdate}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Add Custom Pricing Field" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Pricing field 1 name" }), {
      target: { value: "Fuel surcharge" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Fuel surcharge custom value" }), {
      target: { value: "45.00" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("textbox", { name: "Pricing field 1 name" })).not.toBeInTheDocument();
    expect(onUpdate).not.toHaveBeenCalled();
  });

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

    expect(screen.getAllByDisplayValue("Move details")[0]).toHaveFocus();
  });

  it("edits heading text in the properties panel and focuses it from the edit action", () => {
    const heading = {
      id: "heading-editor",
      type: "heading",
      label: "Section title",
      content: "Estimate",
      style: {},
    };
    const onUpdate = vi.fn();
    render(
      <RightPropertiesPanel
        selectedItem={heading}
        selection={{ itemId: heading.id, part: "edit-content" }}
        onUpdateItem={onUpdate}
        onDeleteItem={() => {}}
        onDuplicateItem={() => {}}
        documentSettings={{}}
        onUpdateDocumentSettings={() => {}}
      />
    );

    const headingText = screen.getByRole("textbox", { name: "Heading Text" });
    expect(headingText).toHaveValue("Estimate");
    expect(headingText).toHaveFocus();

    fireEvent.change(headingText, { target: { value: "Updated estimate" } });
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      id: heading.id,
      content: "Updated estimate",
    }));
  });

  it("shows plain text for HTML-backed content and keeps the editor focused while typing", () => {
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

    expect(editor).toHaveValue("Existing content");
    editor.focus();
    expect(editor).toHaveFocus();
    fireEvent.change(editor, { target: { value: "Updated content" } });
    expect(screen.getByLabelText("html *")).toBe(editor);
    expect(editor).toHaveValue("Updated content");

    fireEvent.change(editor, { target: { value: "Updated content again" } });
    expect(screen.getByLabelText("html *")).toBe(editor);
    expect(editor).toHaveValue("Updated content again");
    expect(item.props.html).toBe("<p>Existing content</p>");
  });

  it("escapes typed markup so text content cannot display HTML tags", () => {
    const item = {
      id: "text-escaped-1",
      type: "builder_block",
      blockType: "text",
      label: "Text",
      props: { html: "<p>Existing content</p>" },
      propsSchema: { type: "object", properties: { html: { type: "string", format: "html" } } },
    };
    const onUpdate = vi.fn();
    render(<StatefulPropertiesPanel initialItem={item} onUpdate={onUpdate} />);

    const editor = screen.getByLabelText("html");
    fireEvent.change(editor, { target: { value: "<strong>Plain content</strong>" } });

    expect(editor).toHaveValue("<strong>Plain content</strong>");
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      props: expect.objectContaining({ html: "&lt;strong&gt;Plain content&lt;/strong&gt;" }),
    }));
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
    expect(content).toHaveValue("Original {{customer.first_name}}");
    fireEvent.change(content, { target: { value: "Updated {{customer.first_name}}" } });

    expect(onUpdate).toHaveBeenLastCalledWith({
      ...item,
      children: [{
        ...item.children[0],
        props: {
          ...item.children[0].props,
          html: "Updated {{customer.first_name}}",
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
