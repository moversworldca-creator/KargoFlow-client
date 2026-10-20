import React from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import UnifiedTemplateBuilder from "./UnifiedTemplateBuilder";

vi.mock("../../../../services/api", () => ({
  getBuilderTemplateDraft: vi.fn().mockResolvedValue({ data: {} }),
  getBuilderMeta: vi.fn().mockResolvedValue({ data: { blocks: [] } }),
  getBuilderVariables: vi.fn().mockResolvedValue({ data: [] }),
  getBuilderBlocks: vi.fn().mockResolvedValue({ data: [] }),
  getBuilderSettings: vi.fn().mockResolvedValue({ data: {} }),
}));

describe("UnifiedTemplateBuilder Add Component menu", () => {
  it("shows toolbar button names when hovering", () => {
    render(<UnifiedTemplateBuilder mode="estimate" isOverlay={false} />);

    fireEvent.mouseOver(
      screen.getByRole("button", { name: "Add Blank Page" })
    );

    expect(
      screen.getByRole("tooltip", { name: "Add Blank Page (A4)" })
    ).toBeInTheDocument();
  });

  it("adds a blank page from the canvas toolbar", () => {
    render(<UnifiedTemplateBuilder mode="estimate" isOverlay={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Add Blank Page" }));

    expect(screen.getByText("Page 2")).toBeInTheDocument();
  });

  it("opens the layout picker and inserts the selected layout", () => {
    const { container } = render(
      <UnifiedTemplateBuilder mode="estimate" isOverlay={false} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Custom Layout" }));
    fireEvent.click(screen.getByRole("button", { name: "Insert Layout" }));

    expect(
      container.querySelector(".doc-component .table-container-wrap")
    ).not.toBeNull();
  });

  it("opens the table picker and inserts a selected table", () => {
    const { container } = render(
      <UnifiedTemplateBuilder mode="estimate" isOverlay={false} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Insert Table" }));
    const tableGrid = container.querySelector(".grid.grid-cols-6");
    fireEvent.click(tableGrid.children[0]);

    expect(container.querySelector(".doc-component table")).not.toBeNull();
  });

  it.each(["estimate", "invoice", "cc_auth", "bol", "contract"])(
    "adds a visible component to %s templates",
    async (mode) => {
      const { container } = render(
        <UnifiedTemplateBuilder mode={mode} isOverlay />
      );
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      fireEvent.mouseOver(
        screen.getByRole("button", { name: "Add Component Menu" })
      );
      expect(
        screen.getByRole("tooltip", { name: "Add Component" })
      ).toBeInTheDocument();

      fireEvent.click(
        screen.getByRole("button", { name: "Add Component Menu" })
      );
      const menu = document.body.querySelector(".add-component-dropdown-menu");
      expect(menu).toHaveClass("z-[70002]");
      expect(menu.previousElementSibling).toHaveClass("z-[70001]");
      fireEvent.click(
        screen.getByRole("button", {
          name: "Label and Value Side-by-side label and data value",
        })
      );

      expect(container.querySelector(".doc-component .shipment-box")).not.toBeNull();
      expect(screen.getByText("Label")).toBeInTheDocument();
    }
  );

  it.each(["estimate", "invoice", "cc_auth", "bol", "contract"])(
    "adds components to the selected page in %s templates",
    (mode) => {
      const firstPageItem = {
        id: "first-page-item",
        type: "text",
        label: "First page content",
        content: "First page content",
        visible: true,
        style: {},
      };
      const secondPageItem = {
        id: "second-page-item",
        type: "text",
        label: "Second page content",
        content: "Second page content",
        visible: true,
        style: {},
      };
      const { container } = render(
        <UnifiedTemplateBuilder
          mode={mode}
          isOverlay
          template={{
            name: "Two Page Template",
            items: [firstPageItem, secondPageItem],
            pages: [
              { id: "page-1", name: "Page 1", items: [firstPageItem] },
              { id: "page-2", name: "Page 2", items: [secondPageItem] },
            ],
            settings: {},
          }}
        />
      );

      fireEvent.click(screen.getByText("First page content"));
      fireEvent.click(screen.getByRole("button", { name: "Add Component Menu" }));
      fireEvent.click(screen.getByRole("button", { name: "Text Block Editable multiline paragraph" }));

      const pageWrappers = container.querySelectorAll(".page-sheet-wrapper");
      const insertedItem = [...container.querySelectorAll(".doc-component")].find((item) =>
        item.textContent.includes("Click here to add custom text")
      );

      expect(insertedItem).toBeDefined();
      expect(insertedItem.closest(".page-sheet-wrapper")).toBe(pageWrappers[0]);
      expect(pageWrappers[1].querySelectorAll(".doc-component")).toHaveLength(1);
    }
  );

  it("adds a callout component to email templates", async () => {
    const { container } = render(
      <UnifiedTemplateBuilder mode="email" isOverlay={false} />
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.mouseOver(
      screen.getByRole("button", { name: "Add Component Menu" })
    );
    expect(
      screen.getByRole("tooltip", { name: "Add Component" })
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Add Component Menu" })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Highlight Callout Important notice or banner box",
      })
    );

    const callout = container.querySelector(".doc-component .bg-blue-50");
    expect(callout).not.toBeNull();
    expect(callout.textContent).toContain("Callout Box");
  });
});
