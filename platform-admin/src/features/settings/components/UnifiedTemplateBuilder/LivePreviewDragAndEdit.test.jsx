import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PreviewModal from "./modals/PreviewModal";

describe("Live Preview Drag & Drop and In-Place Editing", () => {
  const sampleDoc = {
    id: "doc-1",
    name: "Moving Estimate Template",
    settings: { pageSize: "A4", orientation: "Portrait", fontSize: 13 },
    pages: [
      {
        id: "page-1",
        name: "Page 1",
        items: [
          {
            id: "block-1",
            type: "header",
            label: "Estimate Header",
            fields: [{ id: "estimateTitle", value: "Moving Estimate" }],
          },
          {
            id: "block-2",
            type: "notes",
            label: "Terms & Conditions",
            value: "Payment due upon delivery.",
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. renders PreviewModal with Edit & Drag Mode toggle active by default", () => {
    render(
      <PreviewModal
        isOpen={true}
        doc={sampleDoc}
        mode="estimate"
        onClose={() => {}}
      />
    );

    // Toggle button should be present and say "Edit & Drag Mode"
    const toggleBtn = screen.getByText("Edit & Drag Mode");
    expect(toggleBtn).toBeDefined();

    // Drop zones should be rendered in interactive edit mode
    const dropZones = document.querySelectorAll(".drop-zone");
    expect(dropZones.length).toBeGreaterThan(0);

    // Component grips should be rendered
    const grips = document.querySelectorAll(".component-grip");
    expect(grips.length).toBe(2);
  });

  it("2. toggles between Edit & Drag Mode and Customer View cleanly", () => {
    render(
      <PreviewModal
        isOpen={true}
        doc={sampleDoc}
        mode="estimate"
        onClose={() => {}}
      />
    );

    const toggleBtn = screen.getByRole("button", { name: /Edit & Drag Mode/i });
    fireEvent.click(toggleBtn);

    // Now in Customer View
    expect(screen.getByText("Customer View")).toBeDefined();

    // No drop zones should be rendered in customer view
    const dropZones = document.querySelectorAll(".drop-zone");
    expect(dropZones.length).toBe(0);

    // No component drag grips in customer view
    const grips = document.querySelectorAll(".component-grip");
    expect(grips.length).toBe(0);
  });

  it("3. handles drag and drop reordering inside preview sheet", () => {
    const handleUpdateDoc = vi.fn();
    render(
      <PreviewModal
        isOpen={true}
        doc={sampleDoc}
        mode="estimate"
        onClose={() => {}}
        onUpdateDoc={handleUpdateDoc}
      />
    );

    const dropZones = document.querySelectorAll(".drop-zone");
    expect(dropZones.length).toBeGreaterThan(0);

    // Simulate drag start on block-2
    const dataTransfer = {
      data: { itemId: "block-2" },
      setData: function (k, v) {
        this.data[k] = v;
      },
      getData: function (k) {
        return this.data[k];
      },
      effectAllowed: "move",
    };

    // Drop block-2 into the top drop zone (index 0)
    fireEvent.drop(dropZones[0], {
      dataTransfer,
      preventDefault: vi.fn(),
    });

    expect(handleUpdateDoc).toHaveBeenCalledTimes(1);
    const updatedDoc = handleUpdateDoc.mock.calls[0][0];
    // block-2 should now be first, block-1 second
    expect(updatedDoc.pages[0].items[0].id).toBe("block-2");
    expect(updatedDoc.pages[0].items[1].id).toBe("block-1");
  });

  it("4. supports interactive mode in email templates as well", () => {
    const emailDoc = {
      id: "email-1",
      name: "Confirmation Email",
      settings: { subject: "Booking Confirmation" },
      items: [
        {
          id: "email-block-1",
          type: "paragraph",
          content: "Thank you for booking with us.",
        },
        {
          id: "email-block-2",
          type: "button",
          label: "View Portal",
        },
      ],
    };

    const handleUpdateDoc = vi.fn();
    render(
      <PreviewModal
        isOpen={true}
        doc={emailDoc}
        mode="email"
        onClose={() => {}}
        onUpdateDoc={handleUpdateDoc}
      />
    );

    // Mode toggle should be visible
    expect(screen.getByText("Edit & Drag Mode")).toBeDefined();

    // Drop zones should exist
    const dropZones = document.querySelectorAll(".drop-zone");
    expect(dropZones.length).toBeGreaterThan(0);

    // Simulate reordering email blocks
    const dataTransfer = {
      data: { itemId: "email-block-2" },
      setData: function (k, v) {
        this.data[k] = v;
      },
      getData: function (k) {
        return this.data[k];
      },
      effectAllowed: "move",
    };

    fireEvent.drop(dropZones[0], {
      dataTransfer,
      preventDefault: vi.fn(),
    });

    expect(handleUpdateDoc).toHaveBeenCalledTimes(1);
  });
});
