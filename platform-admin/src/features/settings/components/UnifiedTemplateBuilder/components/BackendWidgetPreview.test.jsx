import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
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

  it("renders applied Crew and Assignment heading labels", () => {
    render(
      <BackendWidgetPreview block={{
        type: "crew_trucks",
        props: {
          custom_fields: {
            crew_title: { label: "Team / vehicle" },
            truck_title: { label: "Assigned resource" },
          },
        },
      }} />
    );

    expect(screen.getByText("Team / vehicle")).toBeInTheDocument();
    expect(screen.getByText("Assigned resource")).toBeInTheDocument();
    expect(screen.getByText("Morgan Chen")).toBeInTheDocument();
  });

  it("uses edited Crew and Assignment headings in compiled preview HTML", () => {
    const html = compileDocumentToHtml({
      items: [{
        id: "crew-trucks-html",
        type: "builder_block",
        blockType: "crew_trucks",
        props: {
          custom_fields: {
            crew_title: { label: "Team / vehicle" },
            truck_title: { label: "Assigned resource" },
          },
        },
      }],
    });

    expect(html).toContain("Team / vehicle");
    expect(html).toContain("Assigned resource");
  });

  it("resolves Crew and Assignment placeholders in live and compiled previews", () => {
    const block = {
      type: "crew_trucks",
      props: {
        custom_fields: {
          crew_title: { label: "Crew / vehicle", mode: "dynamic", value: "{{customer.full_name}}" },
          truck_title: { label: "Assignment", mode: "dynamic", dynamicValue: "{{company.name}}" },
        },
      },
    };
    const { container } = render(<BackendWidgetPreview block={block} />);
    expect(container).toHaveTextContent("Alex Customer");
    expect(container).toHaveTextContent("KargoFlow Moving");

    const html = compileDocumentToHtml({
      items: [{ id: "crew-trucks-dynamic-html", type: "builder_block", blockType: "crew_trucks", props: block.props }],
    });
    expect(html).toContain("Alex Customer");
    expect(html).toContain("KargoFlow Moving");
  });

  it("does not render legacy pricing placeholders as Crew or Assignment headings", () => {
    const props = { custom_fields: { crew_title: { label: "{{estimate.discount}}" } } };
    const { container } = render(<BackendWidgetPreview block={{ type: "crew_trucks", props }} />);
    expect(container).toHaveTextContent("Crew / vehicle");
    expect(container).not.toHaveTextContent("$50.00");

    const html = compileDocumentToHtml({
      items: [{ id: "crew-trucks-legacy-pricing-html", type: "builder_block", blockType: "crew_trucks", props }],
    });
    expect(html).toContain("Crew / vehicle");
    expect(html).not.toContain("$50.00");
  });

  it("ignores custom rates and summary overrides in the live preview", () => {
    const { rerender } = render(
      <BackendWidgetPreview block={{
        type: "charges",
        props: {
          show_quantity: true,
          custom_fields: {
            charge_0_unit_price: { mode: "custom", customValue: 200, value: 200 },
          },
        },
      }} />
    );
    const movingLaborRow = screen.getByText("Moving labor").closest("tr");
    expect(within(movingLaborRow).getByText("$185.00")).toBeInTheDocument();
    expect(within(movingLaborRow).getByText("$925.00")).toBeInTheDocument();
    expect(within(movingLaborRow).queryByText("$200.00")).not.toBeInTheDocument();
    expect(within(movingLaborRow).queryByText("$1,000.00")).not.toBeInTheDocument();

    rerender(
      <BackendWidgetPreview block={{
        type: "estimate_summary",
        props: {
          custom_fields: {
            tax: { mode: "custom", customValue: 1, value: 1 },
            total: { mode: "custom", customValue: 2, value: 2 },
          },
        },
      }} />
    );
    expect(screen.getByText("$77.63")).toBeInTheDocument();
    expect(screen.getByText("$1,502.63")).toBeInTheDocument();
    expect(screen.queryByText("$1.00")).not.toBeInTheDocument();
    expect(screen.queryByText("$2.00")).not.toBeInTheDocument();
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

  it("applies and compiles saved heading typography", () => {
    const block = {
      type: "heading",
      props: {
        text: "Estimate title",
        level: 1,
        align: "center",
        style: {
          font_family: "Georgia, serif",
          font_size: 24,
          font_weight: 600,
          italic: true,
          underline: true,
          strikethrough: true,
          text_transform: "uppercase",
          letter_spacing: 1,
          line_height: 1.4,
          color: "#336699",
        },
      },
    };
    const { getByRole } = render(<BackendWidgetPreview block={block} />);
    expect(getByRole("heading", { name: "Estimate title" })).toHaveStyle({
      fontFamily: "Georgia, serif",
      fontSize: "24px",
      fontWeight: "600",
      fontStyle: "italic",
      textDecoration: "underline line-through",
      textTransform: "uppercase",
      letterSpacing: "1px",
      lineHeight: "1.4",
      color: "#336699",
      textAlign: "center",
    });

    const html = compileDocumentToHtml({
      items: [{
        id: "styled-heading",
        type: "builder_block",
        blockType: "heading",
        props: { text: "Estimate title", level: 1, align: "center" },
        style: {
          fontFamily: "Georgia, serif",
          fontSize: 24,
          fontWeight: 600,
          italic: true,
          underline: true,
          strikethrough: true,
          textTransform: "uppercase",
          letterSpacing: 1,
          lineHeight: 1.4,
          color: "#336699",
          align: "center",
        },
      }],
    });
    expect(html).toContain("font-family: Georgia, serif");
    expect(html).toContain("font-size: 24px");
    expect(html).toContain("font-weight: 600");
    expect(html).toContain("text-decoration: underline line-through");
    expect(html).toContain("text-transform: uppercase");
    expect(html).toContain("color: #336699");
  });

  it("compiles legacy heading text and styles into escaped print HTML", () => {
    const html = compileDocumentToHtml({
      items: [{
        id: "legacy-heading",
        type: "heading",
        content: "<img src=x onerror=alert(1)>",
        level: 3,
        style: {
          fontFamily: "Georgia, serif",
          fontSize: 24,
          fontWeight: 600,
          italic: true,
          underline: true,
          strikethrough: true,
          textTransform: "uppercase",
          letterSpacing: 1,
          lineHeight: 1.4,
          color: "#336699",
          align: "center",
        },
      }],
    });

    expect(html).toContain("<h3 style=");
    expect(html).toContain("font-family: Georgia, serif");
    expect(html).toContain("font-size: 24px");
    expect(html).toContain("font-weight: 600");
    expect(html).toContain("font-style: italic");
    expect(html).toContain("text-decoration: underline line-through");
    expect(html).toContain("text-transform: uppercase");
    expect(html).toContain("text-align: center");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).not.toContain("<img src=x");
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

  it("compiles widget custom values and dynamic bindings but never a custom subtotal", () => {
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
              subtotal: { label: "Moving subtotal", mode: "custom", value: 1800, customValue: 1800, dynamicValue: "{{estimate.subtotal}}" },
            },
          },
        },
      ],
    });

    expect(html).toContain("July 8, 2026");
    expect(html).toContain("Access note");
    expect(html).toContain("Side entrance");
    expect(html).toContain("Alex Customer");
    expect(html).toContain("Moving subtotal");
    expect(html).toContain("$1,475.00");
    expect(html).not.toContain("$1,800.00");
  });

  it("compiles record charge rates and calculated totals, ignoring rate and summary overrides", () => {
    const html = compileDocumentToHtml({
      items: [
        {
          id: "charges-custom-rate",
          type: "builder_block",
          blockType: "charges",
          props: {
            custom_fields: {
              charge_0_unit_price: { mode: "custom", value: 200, customValue: 200 },
            },
          },
        },
        {
          id: "summary-calculated",
          type: "builder_block",
          blockType: "estimate_summary",
          props: {
            custom_fields: {
              tax: { mode: "custom", value: 1, customValue: 1 },
              total: { mode: "custom", value: 2, customValue: 2 },
            },
          },
        },
      ],
    });

    expect(html).toContain("$185.00");
    expect(html).toContain("$925.00");
    expect(html).not.toContain("$1,000.00");
    expect(html).toContain("$77.63");
    expect(html).toContain("$1,502.63");
    expect(html).not.toContain("$2.00");
  });
});
