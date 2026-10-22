import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import DocumentBlock, { BackendWidgetPreview } from "./DocumentBlock";

function renderBlock(item, props = {}) {
  return render(
    <DocumentBlock
      item={item}
      isSelected
      onSelect={() => {}}
      onUpdate={() => {}}
      onDelete={() => {}}
      onDuplicate={() => {}}
      {...props}
    />
  );
}

describe("DocumentBlock", () => {
  it("resolves supported backend fields and legacy aliases in sample preview", () => {
    render(
      <BackendWidgetPreview
        block={{
          type: "text",
          props: {
            html: "<p>{{branch.address}} {{opportunity.has_storage}} {{sales_rep.phone}} {{estimate.tax_amount}} {{estimate.deposit_due}} {{invoice.tax_amount}}</p>",
          },
        }}
      />
    );

    expect(screen.getByText(/100 Main Street/)).toHaveTextContent(
      "100 Main Street, Vancouver, BC false (800) 555-0177 $77.63 $300.00 $77.63"
    );
    expect(screen.queryByText(/\{\{/)).not.toBeInTheDocument();
  });

  it("keeps charge columns aligned within the responsive preview width", () => {
    const { container } = renderBlock({
      id: "charges-responsive",
      type: "charges",
      label: "Charges",
      columns: [
        { id: "description", key: "description", label: "Item", width: 45, align: "left" },
        { id: "quantity", key: "quantity", label: "Qty", width: 15, align: "right" },
        { id: "rate", key: "rate", label: "Rate", width: 20, align: "right" },
        { id: "tax", key: "tax", label: "Tax", width: 10, align: "center" },
        { id: "amount", key: "amount", label: "Amount", width: 20, align: "right" },
      ],
      rows: [{
        id: "row-1",
        description: "Moving labour and truck",
        quantity: "6.5",
        rate: "$185",
        tax: "Yes",
        amount: "$1,202.50",
      }],
    });

    const table = container.querySelector(".charge-table table");
    const columnWidths = Array.from(table.querySelectorAll("colgroup col")).map((column) =>
      Number.parseFloat(column.style.width)
    );
    expect(table).toHaveClass("min-w-[500px]");
    expect(container.querySelector(".charge-table > div.overflow-x-auto")).not.toBeNull();
    expect(columnWidths[0]).toBe(52);
    expect(columnWidths.reduce((total, width) => total + width, 0)).toBeCloseTo(100);
    expect(table.querySelector("th:nth-child(2)")).toHaveStyle({ textAlign: "right" });
    expect(table.querySelector("td")).toHaveClass("align-top");
  });

  it("selects widget settings from the pencil without opening a custom popup", () => {
    const onSelect = vi.fn();
    const onSelectPart = vi.fn();
    renderBlock({
      id: "heading-content",
      type: "heading",
      label: "Heading",
      content: "Welcome",
    }, { onSelect, onSelectPart });

    fireEvent.click(screen.getByRole("button", { name: "Edit widget" }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelectPart).toHaveBeenCalledWith("edit-content");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Edit/ })).not.toBeInTheDocument();
    expect(screen.getByText("Welcome")).toBeInTheDocument();
  });

  it("runs heading move and delete actions", () => {
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    const onDelete = vi.fn();
    renderBlock({
      id: "heading-actions",
      type: "heading",
      label: "Heading",
      content: "Welcome",
    }, {
      isFirst: false,
      isLast: false,
      onMoveUp,
      onMoveDown,
      onDelete,
    });

    fireEvent.click(screen.getByRole("button", { name: "Move block up" }));
    fireEvent.click(screen.getByRole("button", { name: "Move block down" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete block" }));

    expect(onMoveUp).toHaveBeenCalledOnce();
    expect(onMoveDown).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("renders move-details content without a custom editor action", () => {
    renderBlock({
      id: "move-details-widget",
      type: "builder_block",
      blockType: "move_details",
      label: "Trip information",
      props: {},
    });

    expect(screen.getByRole("columnheader", { name: "Trip information" })).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit content" })).not.toBeInTheDocument();
  });

  it("applies selected typography to backend text widget content", () => {
    const { container } = renderBlock({
      id: "backend-text-1",
      type: "builder_block",
      blockType: "text",
      label: "Text",
      props: { html: "<p>Preview paragraph</p>" },
      style: {
        fontFamily: "Arial, sans-serif",
        fontSize: 18,
        fontWeight: 600,
        textTransform: "uppercase",
      },
    });

    const typographyWrapper = container.querySelector(".backend-widget-typography");
    expect(screen.getByText("Preview paragraph")).toBeInTheDocument();
    expect(typographyWrapper).not.toBeNull();
    expect(typographyWrapper.parentElement).toHaveStyle({
      fontFamily: "Arial, sans-serif",
      fontSize: "18px",
      fontWeight: "600",
      textTransform: "uppercase",
    });
    expect(typographyWrapper).toHaveStyle({
      "--builder-widget-font-family": "Arial, sans-serif",
      "--builder-widget-font-size": "18px",
      "--builder-widget-font-weight": "600",
      "--builder-widget-text-transform": "uppercase",
    });
  });

  it("applies heading typography to an unsaved backend widget preview", () => {
    renderBlock({
      id: "backend-heading-1",
      type: "builder_block",
      blockType: "heading",
      label: "Heading",
      props: { text: "Estimate title", level: 1 },
      style: {
        fontFamily: "Georgia, serif",
        fontSize: 24,
        fontWeight: 600,
        italic: true,
        underline: true,
        align: "center",
        color: "#336699",
      },
    });

    expect(screen.getByRole("heading", { name: "Estimate title" })).toHaveStyle({
      fontFamily: "Georgia, serif",
      fontSize: "24px",
      fontWeight: "600",
      fontStyle: "italic",
      textDecoration: "underline",
      textAlign: "center",
      color: "#336699",
    });
  });

  it("renders custom editable fields on a backend widget", () => {
    renderBlock({
      id: "move-details-custom-field",
      type: "builder_block",
      blockType: "move_details",
      label: "Move details",
      props: {
        custom_fields: {
          custom_1: {
            label: "Elevator access",
            mode: "custom",
            value: "Freight elevator booked",
            customValue: "Freight elevator booked",
          },
        },
      },
    });

    expect(screen.getByText("Elevator access")).toBeInTheDocument();
    expect(screen.getByText("Freight elevator booked")).toBeInTheDocument();
  });

  it("renders custom Crew and Assignment headings in the live widget preview", () => {
    renderBlock({
      id: "crew-trucks-headings",
      type: "builder_block",
      blockType: "crew_trucks",
      label: "Crew and trucks",
      props: {
        custom_fields: {
          crew_title: { label: "Team / vehicle" },
          truck_title: { label: "Assigned resource" },
        },
      },
    });

    expect(screen.getByText("Team / vehicle")).toBeInTheDocument();
    expect(screen.getByText("Assigned resource")).toBeInTheDocument();
  });

  it("resolves Crew and Assignment heading placeholders without replacing their static labels", () => {
    renderBlock({
      id: "crew-trucks-dynamic-headings",
      type: "builder_block",
      blockType: "crew_trucks",
      label: "Crew and trucks",
      props: {
        custom_fields: {
          crew_title: { label: "Crew / vehicle", mode: "dynamic", value: "{{customer.full_name}}" },
          truck_title: { label: "Assignment", mode: "dynamic", value: "{{company.name}}" },
        },
      },
    });

    expect(screen.getByText("Alex Customer")).toBeInTheDocument();
    expect(screen.getAllByText("KargoFlow Moving").length).toBeGreaterThan(0);
  });

  it("falls back to static headings for legacy pricing-placeholder bindings", () => {
    renderBlock({
      id: "crew-trucks-legacy-pricing-heading",
      type: "builder_block",
      blockType: "crew_trucks",
      label: "Crew and trucks",
      props: {
        custom_fields: {
          crew_title: { label: "{{estimate.discount}}" },
        },
      },
    });

    expect(screen.getByText("Crew / vehicle")).toBeInTheDocument();
    expect(screen.queryByText("$50.00")).not.toBeInTheDocument();
  });

  it("keeps legacy text using its selected font style", () => {
    const { container } = renderBlock({
      id: "legacy-text-1",
      type: "text",
      label: "Text",
      content: "Legacy text content",
      style: { fontFamily: "Arial, sans-serif", fontSize: 18, fontWeight: 600 },
    });

    expect(container.querySelector(".doc-component")).toHaveStyle({
      fontFamily: "Arial, sans-serif",
      fontSize: "18px",
      fontWeight: "600",
    });
  });

  it("renders inserted callout components as notice boxes", () => {
    const { container } = renderBlock({
      id: "callout-1",
      type: "callout",
      label: "Callout Box",
      content: "Important notice",
    });

    expect(screen.getByText("Important notice")).toBeInTheDocument();
    expect(container.querySelector(".bg-blue-50")).not.toBeNull();
  });

  it("renders inserted button components with button styling", () => {
    const { container } = renderBlock({
      id: "button-1",
      type: "button",
      label: "Online Pay Link",
      content: "Pay online",
    });

    expect(screen.getByText("Pay online")).toBeInTheDocument();
    expect(container.querySelector(".bg-blue-600")).not.toBeNull();
  });
});
