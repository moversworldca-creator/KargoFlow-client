import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CreateUniversalDocumentModal from "./CreateUniversalDocumentModal";

const branches = [];

vi.mock("../../../../services/api", () => ({
  createDocumentTemplate: vi.fn(),
  createEstimatePortalTemplate: vi.fn(),
  createCommunicationTemplate: vi.fn(),
}));

describe("CreateUniversalDocumentModal Builder workflow scopes", () => {
  it("displays opportunity, job, and invoice scopes supported by document workflows", () => {
    render(
      <CreateUniversalDocumentModal
        isOpen
        onClose={vi.fn()}
        onCreated={vi.fn()}
        branches={branches}
      />
    );

    expect(screen.getByText("Backend-supported workflow scopes")).toBeInTheDocument();
    expect(screen.getByText("Opportunity / Estimate")).toBeInTheDocument();
    expect(screen.getByText("Job", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Invoice", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText(/actual applicability is configured with assignments after it is published/i)).toBeInTheDocument();
  });

  it("shows invoice-specific backend scope and stages for invoice templates", () => {
    render(
      <CreateUniversalDocumentModal
        isOpen
        onClose={vi.fn()}
        onCreated={vi.fn()}
        branches={branches}
      />
    );

    fireEvent.change(screen.getByRole("combobox", { name: /document applies to/i }), {
      target: { value: "invoice" },
    });

    expect(screen.getByText(/Invoice \/ Billing Scope/)).toBeInTheDocument();
    expect(screen.getByText(/Invoice issue · Storage billing/)).toBeInTheDocument();
    expect(screen.queryByText("Opportunity / Estimate")).not.toBeInTheDocument();
  });
});
