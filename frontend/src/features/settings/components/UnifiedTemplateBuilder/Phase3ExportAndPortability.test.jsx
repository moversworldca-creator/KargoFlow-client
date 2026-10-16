import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import TransferModal from "./modals/TransferModal";
import VersionHistoryModal from "./modals/VersionHistoryModal";
import PreviewModal from "./modals/PreviewModal";
import { validateTemplateDocument } from "./model/templateModel";

describe("Phase 3: TransferModal Component (JSON Import/Export)", () => {
  it("renders export and import action buttons", () => {
    const onExport = vi.fn();
    const onImportClick = vi.fn();

    render(
      <TransferModal
        isOpen={true}
        onClose={vi.fn()}
        onExport={onExport}
        onImportClick={onImportClick}
      />
    );

    expect(screen.getByText("Import / Export Template")).toBeInTheDocument();
    expect(screen.getByText("Export Template (JSON)")).toBeInTheDocument();
    expect(screen.getByText("Import Template (JSON)")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Export Template (JSON)"));
    expect(onExport).toHaveBeenCalled();
  });
});

describe("Phase 3: VersionHistoryModal Component", () => {
  it("renders snapshot list and creates a named snapshot", () => {
    const onCreateSnapshot = vi.fn();
    const onRestoreSnapshot = vi.fn();

    const mockSnapshots = [
      {
        id: "snap-1",
        name: "Initial Draft",
        timestamp: Date.now() - 60000,
        doc: { name: "Initial Template", items: [] },
      },
    ];

    render(
      <VersionHistoryModal
        isOpen={true}
        snapshots={mockSnapshots}
        onClose={vi.fn()}
        onCreateSnapshot={onCreateSnapshot}
        onRestoreSnapshot={onRestoreSnapshot}
      />
    );

    expect(screen.getByText("Version History & Snapshots")).toBeInTheDocument();
    expect(screen.getByText("Initial Draft")).toBeInTheDocument();

    // Test restoring
    const restoreBtn = screen.getByRole("button", { name: /Restore/i });
    fireEvent.click(restoreBtn);
    expect(onRestoreSnapshot).toHaveBeenCalledWith(mockSnapshots[0].doc);

    // Test creating a new snapshot
    const input = screen.getByPlaceholderText(/Name this snapshot/i);
    fireEvent.change(input, { target: { value: "Before Pricing Bump" } });
    const createBtn = screen.getByRole("button", { name: /Create Snapshot/i });
    fireEvent.click(createBtn);
    expect(onCreateSnapshot).toHaveBeenCalledWith("Before Pricing Bump");
  });
});

describe("Phase 3: PreviewModal Component with Print & Export", () => {
  it("renders zoom controls, tags, and export/print buttons", () => {
    const onExportJson = vi.fn();
    const sampleDoc = {
      name: "Commercial Moving Agreement",
      settings: { pageSize: "Letter", orientation: "Portrait", currency: "USD" },
      items: [],
    };

    render(
      <PreviewModal
        isOpen={true}
        doc={sampleDoc}
        mode="estimate"
        pageSize="Letter"
        orientation="Portrait"
        onClose={vi.fn()}
        onExportJson={onExportJson}
      />
    );

    expect(screen.getByText(/Commercial Moving Agreement/i)).toBeInTheDocument();
    expect(screen.getByText(/Letter • Portrait/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Export JSON/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save as PDF \/ Print/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Export JSON/i }));
    expect(onExportJson).toHaveBeenCalled();
  });

  it("renders exact page dimensions sheet and toggles sample data variables", () => {
    const sampleDoc = {
      name: "International Logistics Manifest",
      settings: { pageSize: "A4", orientation: "Portrait", currency: "USD" },
      pages: [
        {
          id: "page-1",
          name: "Manifest Page",
          items: [
            {
              id: "head-1",
              type: "header",
              label: "Manifest",
              fields: [
                { id: "companyName", label: "Company", value: "{{company_name}}" },
              ],
            },
            {
              id: "table-1",
              type: "table",
              tableRows: [
                {
                  id: "r-1",
                  cells: [
                    { id: "c-1", content: "VeryLongUnbrokenTrackingNumber12345678901234567890" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    render(
      <PreviewModal
        isOpen={true}
        doc={sampleDoc}
        pageSize="A4"
        orientation="Portrait"
        onClose={vi.fn()}
      />
    );

    // Verify exact A4 dimensions: 794px width x 1123px height
    expect(screen.getByText(/794px × 1123px/i)).toBeInTheDocument();

    // Default sample data resolves {{company_name}} to KargoFlow Global Logistics Inc.
    expect(screen.getByText(/KargoFlow Global Logistics Inc/i)).toBeInTheDocument();

    // Toggle to raw variables
    const toggleBtn = screen.getByRole("button", { name: /Sample Data/i });
    fireEvent.click(toggleBtn);
    expect(screen.getByText(/Raw Variables/i)).toBeInTheDocument();
    expect(screen.getByText(/\{\{company_name\}\}/i)).toBeInTheDocument();
  });
});

describe("Phase 3: Schema Validation Engine", () => {
  it("validates a well-formed template document", () => {
    const validDoc = {
      version: 2,
      id: "doc-1",
      name: "Valid Template",
      items: [],
      settings: {
        category: "Test",
        pageSize: "A4",
        orientation: "Portrait",
        currency: "USD",
        defaultTax: "0",
      },
    };

    const errors = validateTemplateDocument(validDoc);
    expect(errors).toEqual([]);
  });

  it("catches invalid documents missing required fields", () => {
    const invalidDoc = {
      name: "",
      items: "not-an-array",
    };

    const errors = validateTemplateDocument(invalidDoc);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors).toContain("Template name is required");
  });
});
