import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import InteractiveTableBlock from "./components/InteractiveTableBlock";
import SplitCellDialog from "./modals/SplitCellDialog";
import DeleteCellsDialog from "./modals/DeleteCellsDialog";
import {
  mergeSelectedCells,
  splitMergedCell,
  deleteRowKeepGap,
  deleteColKeepGap,
} from "./core/tableOperations";
import { createTableWidget } from "./model/templateModel";

describe("Phase 2: Table Operations Core Engine", () => {
  it("merges adjacent cells into a merged cell with colSpan and rowSpan", () => {
    const rows = [
      {
        id: "r1",
        cells: [
          { id: "c1", content: "Top Left" },
          { id: "c2", content: "Top Right" },
        ],
      },
      {
        id: "r2",
        cells: [
          { id: "c3", content: "Bottom Left" },
          { id: "c4", content: "Bottom Right" },
        ],
      },
    ];

    const result = mergeSelectedCells(rows, ["c1", "c2"]);
    expect(result.mergedCellId).toBe("c1");
    expect(result.rows[0].cells.length).toBe(1);
    expect(result.rows[0].cells[0].colSpan).toBe(2);
    expect(result.rows[0].cells[0].content).toContain("Top Left Top Right");
  });

  it("splits a cell back into subcells or local subgrid", () => {
    const rows = [
      {
        id: "r1",
        cells: [{ id: "c1", content: "Big Header", colSpan: 2, rowSpan: 1 }],
      },
    ];

    const split = splitMergedCell(rows, "c1", 1, 2);
    expect(split[0].cells.length).toBe(2);
  });

  it("deletes a column while preserving the exact layout gap as spacer", () => {
    const rows = [
      {
        id: "r1",
        cells: [
          { id: "c1", content: "Col 1" },
          { id: "c2", content: "Col 2" },
        ],
      },
    ];

    const result = deleteColKeepGap(rows, [1]);
    expect(result[0].cells[1].isSpacer).toBe(true);
    expect(result[0].cells[1].content).toBe("");
  });
});

describe("Phase 2: InteractiveTableBlock Component", () => {
  const sampleTableItem = {
    id: "table-1",
    type: "table",
    label: "Cost Breakdown",
    tableRows: [
      {
        id: "tr1",
        height: 40,
        cells: [
          { id: "cell-a1", content: "Item Description" },
          { id: "cell-b1", content: "Rate ($)" },
        ],
      },
      {
        id: "tr2",
        height: 36,
        cells: [
          { id: "cell-a2", content: "Labor (4 Movers)" },
          { id: "cell-b2", content: "120.00" },
        ],
      },
    ],
    tableSettings: {
      columnWidths: [60, 40],
    },
  };

  it("renders table cells and column headers when selected", () => {
    render(
      <InteractiveTableBlock
        item={sampleTableItem}
        isSelected={true}
        preview={false}
      />
    );

    expect(screen.getByText(/Item Description/i)).toBeInTheDocument();
    expect(screen.getByText(/Labor \(4 Movers\)/i)).toBeInTheDocument();

    // Column header bars A and B
    expect(screen.getByText(/A \(60%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/B \(40%\)/i)).toBeInTheDocument();
  });

  it("shows contextual table toolbar when a cell is clicked", () => {
    render(
      <InteractiveTableBlock
        item={sampleTableItem}
        isSelected={true}
        preview={false}
      />
    );

    const cell = screen.getByText(/Item Description/i);
    fireEvent.click(cell);

    // Contextual buttons appear
    expect(screen.getByText(/\+ Row ↑/i)).toBeInTheDocument();
    expect(screen.getByText(/\+ Col →/i)).toBeInTheDocument();
    expect(screen.getByText(/⊟ Split/i)).toBeInTheDocument();
    expect(screen.getByText(/Delete Cells/i)).toBeInTheDocument();
  });

  it("creates a blank table without prefilled fields or labels", () => {
    const blankTable = createTableWidget(2, 2, "");
    expect(blankTable.label).toBe("");
    expect(blankTable.tableRows.length).toBe(2);
    expect(blankTable.tableRows[0].cells.length).toBe(2);
    expect(blankTable.tableRows[0].cells[0].content).toBe("");
    expect(blankTable.tableRows[1].cells[1].content).toBe("");

    const { container } = render(
      <InteractiveTableBlock item={blankTable} isSelected={false} preview={false} />
    );

    // No default "Custom Table" header banner is rendered
    expect(screen.queryByText("Custom Table")).toBeNull();
    // No "—" hyphens rendered in blank cells
    expect(container.textContent).not.toContain("—");
  });

  it("allows entering manual values in blank cells on click or edit", () => {
    const onItem = vi.fn();
    const blankTable = createTableWidget(2, 2, "");
    const { container } = render(
      <InteractiveTableBlock
        item={blankTable}
        isSelected={true}
        preview={false}
        onItem={onItem}
      />
    );

    const cells = container.querySelectorAll("td span");
    expect(cells.length).toBe(4);

    // Double click first blank cell to start manual entry
    fireEvent.doubleClick(cells[0]);
    const input = container.querySelector("input[type='text'], input:not([type='color'])");
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "Item Description" } });
    fireEvent.blur(input);

    expect(onItem).toHaveBeenCalled();
    const updated = onItem.mock.calls[0][0];
    expect(updated.tableRows[0].cells[0].content).toBe("Item Description");
  });
});

describe("Phase 2: Dialog Modals", () => {
  it("submits SplitCellDialog with target row and column count", () => {
    const onSplit = vi.fn();
    const cell = { id: "cell-1", rowSpan: 2, colSpan: 2 };

    render(
      <SplitCellDialog
        isOpen={true}
        cell={cell}
        onClose={vi.fn()}
        onSplit={onSplit}
      />
    );

    expect(screen.getByText("Split Table Cell")).toBeInTheDocument();
    const submitBtn = screen.getByRole("button", { name: /Apply Split/i });
    fireEvent.click(submitBtn);

    expect(onSplit).toHaveBeenCalledWith(2, 2);
  });

  it("submits DeleteCellsDialog with chosen deletion behavior", () => {
    const onConfirm = vi.fn();

    render(
      <DeleteCellsDialog
        isOpen={true}
        selectedCount={2}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText(/Delete 2 Selected Cells/i)).toBeInTheDocument();
    const deleteBtn = screen.getByRole("button", { name: /Delete Cells/i });
    fireEvent.click(deleteBtn);

    expect(onConfirm).toHaveBeenCalledWith("keep-gap");
  });
});
