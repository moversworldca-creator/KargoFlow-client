import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DocumentCanvas from "./components/DocumentCanvas";

describe("Blank Page Interactive Mouse Drag & Click-to-Type Creation", () => {
  it("renders welcoming blank page prompt with 1-click quick insertion buttons", () => {
    const handleDirectCreate = vi.fn();
    const handleInsertTable = vi.fn();
    const handleAddWidget = vi.fn();

    render(
      <DocumentCanvas
        modeConfig={{ canvasType: "paged" }}
        pages={[{ id: "p1", name: "Page 1", items: [] }]}
        items={[]}
        onDirectCreateItem={handleDirectCreate}
        onInsertTable={handleInsertTable}
        onAddWidgetClick={handleAddWidget}
      />
    );

    expect(screen.getByText("Blank Page 1")).toBeDefined();
    expect(
      screen.getByText("Click anywhere or drag your mouse across this sheet to create a customized text box.")
    ).toBeDefined();

    const addHeadingBtn = screen.getByText("Add Heading");
    const addTextBtn = screen.getByText("Add Text Block");
    const insertTableBtns = screen.getAllByText("Insert Table");
    const addChargesBtn = screen.getByText("Add Charges");

    expect(addHeadingBtn).toBeDefined();
    expect(addTextBtn).toBeDefined();
    expect(insertTableBtns.length).toBeGreaterThan(0);
    expect(addChargesBtn).toBeDefined();

    // Test quick add heading
    fireEvent.click(addHeadingBtn);
    expect(handleDirectCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "heading", label: "Heading" }),
      0
    );

    // Test quick add text
    fireEvent.click(addTextBtn);
    expect(handleDirectCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "text", label: "Text Block" }),
      0
    );

    // Test quick insert table
    fireEvent.click(insertTableBtns[insertTableBtns.length - 1]);
    expect(handleInsertTable).toHaveBeenCalled();

    // Test quick add charges
    fireEvent.click(addChargesBtn);
    expect(handleAddWidget).toHaveBeenCalledWith(
      expect.objectContaining({ type: "charges" })
    );
  });

  it("handles mouse click on blank sheet to immediately create text block", () => {
    const handleDirectCreate = vi.fn();

    const { container } = render(
      <DocumentCanvas
        modeConfig={{ canvasType: "paged" }}
        pages={[{ id: "p1", name: "Page 1", items: [] }]}
        items={[]}
        onDirectCreateItem={handleDirectCreate}
      />
    );

    const emptyContainer = container.querySelector(".cursor-crosshair");
    expect(emptyContainer).not.toBeNull();

    // Simulate mouse down and mouse up (click)
    fireEvent.mouseDown(emptyContainer, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.mouseUp(window);

    expect(handleDirectCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "text",
        label: "Text Block",
      }),
      0
    );
  });

  it("handles mouse drag across blank sheet to create sized text box", () => {
    const handleDirectCreate = vi.fn();

    const { container } = render(
      <DocumentCanvas
        modeConfig={{ canvasType: "paged" }}
        pages={[{ id: "p1", name: "Page 1", items: [] }]}
        items={[]}
        onDirectCreateItem={handleDirectCreate}
      />
    );

    const emptyContainer = container.querySelector(".cursor-crosshair");
    expect(emptyContainer).not.toBeNull();

    // Start mouse drag
    fireEvent.mouseDown(emptyContainer, { clientX: 50, clientY: 50, button: 0 });

    // Move mouse across distance > 20px
    fireEvent.mouseMove(window, { clientX: 250, clientY: 180 });

    // Release mouse
    fireEvent.mouseUp(window);

    expect(handleDirectCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "text",
        label: "Text Block",
        style: expect.objectContaining({
          minHeight: expect.any(String),
        }),
      }),
      0
    );
  });

  it("renders welcoming empty state on email canvas with drag and click support", () => {
    const handleDirectCreate = vi.fn();

    const { container } = render(
      <DocumentCanvas
        modeConfig={{ canvasType: "email" }}
        mode="email"
        items={[]}
        onDirectCreateItem={handleDirectCreate}
      />
    );

    expect(screen.getByText("Email Canvas is Empty")).toBeDefined();

    const emailEmptyContainer = container.querySelector(".cursor-crosshair");
    expect(emailEmptyContainer).not.toBeNull();

    // Click on email empty container
    fireEvent.mouseDown(emailEmptyContainer, { clientX: 120, clientY: 120, button: 0 });
    fireEvent.mouseUp(window);

    expect(handleDirectCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "text",
      }),
      0
    );
  });
});
