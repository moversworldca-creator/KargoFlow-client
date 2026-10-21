import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BackendWidgetPreview } from "./DocumentBlock";
import { compileDocumentToHtml } from "../model/htmlCompiler";

describe("backend widget preview content", () => {
  it("renders dynamic and custom header content in the sample preview", () => {
    const { rerender } = render(<BackendWidgetPreview block={{ type: "header", props: {} }} />);
    expect(screen.getByText("KargoFlow Moving")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Estimate" })).toBeInTheDocument();
    expect(screen.getByText("EST-00042")).toBeInTheDocument();

    rerender(
      <BackendWidgetPreview block={{
        type: "header",
        props: {
          custom_fields: {
            company_name: { mode: "custom", value: "Acme Movers" },
            document_title: { mode: "custom", value: "Moving Proposal" },
            document_number: { mode: "dynamic", value: "{{invoice.number}}" },
          },
        },
      }} />
    );
    expect(screen.getByText("Acme Movers")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Moving Proposal" })).toBeInTheDocument();
    expect(screen.getByText("INV-00128")).toBeInTheDocument();
  });

  it("renders actual sample rows for estimate and invoice data widgets", () => {
    const { rerender } = render(
      <BackendWidgetPreview block={{ type: "charges", props: { show_quantity: true } }} />
    );
    expect(screen.getByText("Moving labor")).toBeInTheDocument();
    expect(screen.getByText("$925.00")).toBeInTheDocument();
    expect(screen.getByText("Estimate charges")).toBeInTheDocument();

    rerender(<BackendWidgetPreview block={{ type: "totals", props: { show_balance: true } }} />);
    expect(screen.getByText("Invoice total")).toBeInTheDocument();
    expect(screen.getByText("$1,202.63")).toBeInTheDocument();
  });

  it("keeps Move Details label and value columns aligned in preview and print HTML", () => {
    const { container } = render(
      <BackendWidgetPreview block={{ type: "move_details", props: {} }} />
    );
    expect(Array.from(container.querySelectorAll("col")).map((column) => column.style.width))
      .toEqual(["20%", "80%"]);

    const html = compileDocumentToHtml({
      items: [{
        id: "move-details",
        type: "builder_block",
        blockType: "move_details",
        props: {},
      }],
    });
    expect(html).toContain('<colgroup><col style="width:20%"><col style="width:80%"></colgroup>');
  });

  it("resolves merge fields for sample preview and preserves tokens in raw mode", () => {
    const block = { type: "heading", props: { text: "Hello {{customer.first_name}}" } };
    const { rerender } = render(<BackendWidgetPreview block={block} sampleData />);
    expect(screen.getByText("Hello Alex")).toBeInTheDocument();

    rerender(<BackendWidgetPreview block={block} sampleData={false} />);
    expect(screen.getByText("Hello {{customer.first_name}}")).toBeInTheDocument();
  });

  it("renders container children and honors sample conditional rules in customer preview", () => {
    const block = {
      type: "conditional",
      condition: { var: "customer.email", op: "not_empty" },
      children: [{ type: "text", props: { html: "<p>Customer email: {{customer.email}}</p>" } }],
    };
    const { rerender } = render(<BackendWidgetPreview block={block} customerPreview sampleData />);
    expect(screen.getByText("Customer email: alex.customer@example.com")).toBeInTheDocument();

    rerender(<BackendWidgetPreview
      block={{ ...block, condition: { var: "customer.email", op: "empty" } }}
      customerPreview
      sampleData
    />);
    expect(screen.queryByText("Customer email: alex.customer@example.com")).not.toBeInTheDocument();
  });

  it("includes backend widget content in compiled preview and print HTML", () => {
    const html = compileDocumentToHtml({
      items: [
        {
          id: "legacy-header",
          type: "header",
          label: "Estimate",
          fields: [
            { id: "companyName", value: "{{company.name}}" },
            { id: "estimateTitle", value: "Moving Estimate" },
            { id: "estimateNumber", value: "{{estimate.number}}" },
          ],
          customFields: {
            company_name: {
              mode: "custom",
              value: "Acme Movers",
              customValue: "Acme Movers",
              dynamicValue: "{{company.name}}",
            },
          },
        },
        { id: "header", type: "builder_block", blockType: "header", props: { custom_fields: {
          company_name: { mode: "custom", value: "Acme Movers" },
          document_title: { mode: "custom", value: "Moving Proposal" },
        } } },
        { id: "charges", type: "builder_block", blockType: "charges", props: { show_quantity: true } },
        { id: "summary", type: "builder_block", blockType: "estimate_summary", props: { show_deposit: true } },
        { id: "heading", type: "builder_block", blockType: "heading", props: { text: "<script>alert(1)</script>", align: "left; color:red" } },
      ],
    });
    expect(html).toContain("Acme Movers");
    expect(html).toContain("Moving Estimate");
    expect(html).toContain("Moving Proposal");
    expect(html).toContain("Moving labor");
    expect(html).toContain("$925.00");
    expect(html).toContain("Deposit due");
    expect(html).toContain("$1,502.63");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("text-align:left; color:red");
  });

  it("compiles widget custom values, dynamic bindings, and custom subtotal overrides", () => {
    const html = compileDocumentToHtml({
      items: [
        {
          id: "move",
          type: "builder_block",
          blockType: "move_details",
          props: {
            custom_fields: {
              move_date: { mode: "custom", value: "July 8, 2026", customValue: "July 8, 2026" },
              custom_access: { label: "Access note", mode: "custom", value: "Side entrance", customValue: "Side entrance" },
              custom_customer: { label: "Customer", mode: "dynamic", dynamicValue: "{{customer.full_name}}" },
            },
          },
        },
        {
          id: "estimate",
          type: "builder_block",
          blockType: "estimate_summary",
          props: {
            custom_fields: {
              subtotal: { mode: "custom", value: 1800, customValue: 1800, dynamicValue: "{{estimate.subtotal}}" },
            },
          },
        },
      ],
    });

    expect(html).toContain("July 8, 2026");
    expect(html).toContain("Access note");
    expect(html).toContain("Side entrance");
    expect(html).toContain("Alex Customer");
    expect(html).toContain("$1,800.00");
  });
});
