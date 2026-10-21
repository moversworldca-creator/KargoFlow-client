import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import DocumentBlock from "./DocumentBlock";

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
