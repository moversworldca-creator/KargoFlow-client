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

describe("CreateUniversalDocumentModal document type selection", () => {
  it("does not show backend workflow implementation details", () => {
    render(
      <CreateUniversalDocumentModal
        isOpen
        onClose={vi.fn()}
        onCreated={vi.fn()}
        branches={branches}
      />
    );

    expect(screen.queryByText("Backend-supported workflow scopes")).not.toBeInTheDocument();
    expect(screen.queryByText(/actual applicability is configured with assignments/i)).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /document applies to/i })).toBeInTheDocument();
  });

  it("keeps invoice template selection available without the backend-scope panel", () => {
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

    expect(screen.getByRole("combobox", { name: /document applies to/i })).toHaveValue("invoice");
    expect(screen.queryByText("Backend-supported workflow scopes")).not.toBeInTheDocument();
  });
});
