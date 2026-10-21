import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import DocumentBlock from "./DocumentBlock";

describe("DocumentBlock typography", () => {
  it("renders the editable label on move-details widgets", () => {
    render(
      <DocumentBlock
        item={{
          id: "move-details-widget",
          type: "builder_block",
          blockType: "move_details",
          label: "Trip information",
          props: {},
        }}
        isSelected={false}
        onSelect={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
        onDuplicate={() => {}}
      />
    );

    expect(screen.getByRole("columnheader", { name: "Trip information" })).toBeInTheDocument();
  });

  it("applies selected typography to backend text widget content", () => {
    const { container } = render(
      <DocumentBlock
        item={{
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
        }}
        isSelected
        onSelect={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
        onDuplicate={() => {}}
        preview={false}
      />
    );

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

  it("keeps legacy text using its selected font style", () => {
    const { container } = render(
      <DocumentBlock
        item={{
          id: "legacy-text-1",
          type: "text",
          label: "Text",
          content: "Legacy text content",
          style: { fontFamily: "Arial, sans-serif", fontSize: 18, fontWeight: 600 },
        }}
        isSelected
        onSelect={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
        onDuplicate={() => {}}
      />
    );

    expect(container.querySelector(".doc-component")).toHaveStyle({
      fontFamily: "Arial, sans-serif",
      fontSize: "18px",
      fontWeight: "600",
    });
  });

  it("renders inserted callout components as editable notice boxes", () => {
    const { container } = render(
      <DocumentBlock
        item={{
          id: "callout-1",
          type: "callout",
          label: "Callout Box",
          content: "Important notice",
        }}
        isSelected={false}
        onSelect={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
        onDuplicate={() => {}}
      />
    );

    expect(screen.getByText("Important notice")).toBeInTheDocument();
    expect(container.querySelector(".bg-blue-50")).not.toBeNull();
  });

  it("renders inserted button components with button styling", () => {
    const { container } = render(
      <DocumentBlock
        item={{
          id: "button-1",
          type: "button",
          label: "Online Pay Link",
          content: "Pay online",
        }}
        isSelected={false}
        onSelect={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
        onDuplicate={() => {}}
      />
    );

    expect(screen.getByText("Pay online")).toBeInTheDocument();
    expect(container.querySelector(".bg-blue-600")).not.toBeNull();
  });
});
