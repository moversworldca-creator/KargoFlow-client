import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import TopNavbar from "./TopNavbar";

describe("TopNavbar printing", () => {
  it("shows and invokes Print for SMS templates", () => {
    const onPrint = vi.fn();
    render(
      <TopNavbar
        title="SMS template"
        onTitleChange={vi.fn()}
        canUndo={false}
        canRedo={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        isDirty={false}
        isSaving={false}
        onSave={vi.fn()}
        onBack={vi.fn()}
        onOpenPreview={vi.fn()}
        mode="sms"
        modeConfig={{ label: "SMS" }}
        onPrint={onPrint}
      />
    );

    fireEvent.click(screen.getByTitle("Direct Print or Save as PDF"));
    expect(onPrint).toHaveBeenCalledOnce();
  });

  it("keeps primary editor actions available in the responsive toolbar layout", () => {
    const actions = {
      onBack: vi.fn(),
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onSave: vi.fn(),
      onOpenPreview: vi.fn(),
      onTogglePanel: vi.fn(),
    };
    const { container } = render(
      <TopNavbar
        title="Responsive template"
        onTitleChange={vi.fn()}
        canUndo
        canRedo
        {...actions}
        isDirty={false}
        isSaving={false}
        mode="estimate"
        modeConfig={{ label: "Estimate" }}
      />
    );

    const header = screen.getByRole("banner");
    expect(header).toHaveClass("grid-cols-2", "xl:flex");
    expect(container.querySelector(".col-start-2.row-start-2")).toHaveClass("flex-wrap");

    fireEvent.click(screen.getByRole("button", { name: "Back to Templates" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Template" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview Template" }));
    fireEvent.click(screen.getByRole("button", { name: "Toggle inspector panel" }));

    Object.values(actions).forEach((action) => expect(action).toHaveBeenCalledOnce());
  });

  it("keeps secondary actions reachable in the narrow-screen menu", () => {
    const onPrint = vi.fn();
    const onPublish = vi.fn();
    render(
      <TopNavbar
        title="Responsive template"
        onTitleChange={vi.fn()}
        canUndo={false}
        canRedo={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        isDirty={false}
        isSaving={false}
        onSave={vi.fn()}
        onBack={vi.fn()}
        onOpenPreview={vi.fn()}
        onPublish={onPublish}
        onPrint={onPrint}
        mode="estimate"
        modeConfig={{ label: "Estimate" }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    fireEvent.click(screen.getByRole("button", { name: "Print Document" }));
    fireEvent.click(screen.getByRole("button", { name: "Publish Template" }));

    expect(onPrint).toHaveBeenCalledOnce();
    expect(onPublish).toHaveBeenCalledOnce();
  });
});
