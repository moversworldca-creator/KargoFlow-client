import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import TransferModal from "./modals/TransferModal";
import VersionHistoryModal from "./modals/VersionHistoryModal";
import PreviewModal from "./modals/PreviewModal";
import { validateTemplateDocument } from "./model/templateModel";
import { compileDocumentToHtml } from "./model/htmlCompiler";

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

  it("renders clean SMS preview card without device hardware background and supports Desktop, Tablet, Mobile toggles", () => {
    const sampleDoc = {
      name: "SMS Dispatch Notification",
      settings: {},
      items: [],
    };

    render(
      <PreviewModal
        isOpen={true}
        doc={sampleDoc}
        mode="sms"
        smsText="Hi {{customer_name}}, your driver is on the way!"
        onClose={vi.fn()}
      />
    );

    // Verify clean header and delivered badge
    expect(screen.getByText(/SMS Notification • Recipient View/i)).toBeInTheDocument();
    expect(screen.getByText(/Delivered/i)).toBeInTheDocument();

    // Verify resolved sample variable
    expect(screen.getByText(/Hi Alex Customer, your driver is on the way!/i)).toBeInTheDocument();

    // Verify Desktop, Tablet, Mobile buttons are present in toolbar
    expect(screen.getByTitle(/Desktop 600px Preview/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Tablet 560px Preview/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Mobile 340px Preview/i)).toBeInTheDocument();

    // Click tablet
    fireEvent.click(screen.getByTitle(/Tablet 560px Preview/i));
    expect(screen.getByText("560px")).toBeInTheDocument();

    // Click mobile
    fireEvent.click(screen.getByTitle(/Mobile 340px Preview/i));
    expect(screen.getByText("340px")).toBeInTheDocument();
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

  it("compiles table cells to standalone HTML preserving cell fontSize and fontFamily styles", () => {
    const docWithStyledTable = {
      name: "Table Typography Export",
      settings: { pageSize: "A4", orientation: "Portrait" },
      items: [
        {
          id: "table-exp-1",
          type: "table",
          tableRows: [
            {
              id: "r-1",
              cells: [
                {
                  id: "c-1",
                  content: "Styled Freight Cell",
                  fontSize: 16,
                  fontFamily: "Georgia, serif",
                  color: "#1e40af",
                },
              ],
            },
          ],
        },
      ],
    };

    const compiledHtml = compileDocumentToHtml(docWithStyledTable);
    expect(compiledHtml).toContain("font-size: 16px;");
    expect(compiledHtml).toContain("font-family: Georgia, serif;");
    expect(compiledHtml).toContain("color: #1e40af;");
    expect(compiledHtml).toContain("Styled Freight Cell");
  });

  it("keeps native print layout rules from collapsing custom HTML columns", () => {
    const compiledHtml = compileDocumentToHtml({
      name: "Custom HTML Print Layout",
      items: [{
        id: "custom-html",
        type: "html",
        htmlContent: '<div class="flex-layout"><div>Company name</div><div>Estimate details</div></div>',
        cssContent: ".flex-layout { display: flex; justify-content: space-between; }",
      }],
    });

    expect(compiledHtml).toContain('class="kargoflow-block kargoflow-html-block html-doc-custom-html"');
    expect(compiledHtml).toContain(".kargoflow-block:not(.kargoflow-html-block)");
    expect(compiledHtml).not.toContain("\n    table {");
    expect(compiledHtml).not.toContain("\n    th, td {");
  });
});
