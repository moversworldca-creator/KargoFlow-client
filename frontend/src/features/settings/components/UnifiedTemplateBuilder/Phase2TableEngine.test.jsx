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
  restoreSpacerCell,
  splitTableHorizontal,
  splitTableVertical,
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

    // Restore spacer cell
    const restored = restoreSpacerCell(result, "c2");
    expect(restored[0].cells[1].isSpacer).toBe(false);
  });

  it("splits table horizontally into two separate tables", () => {
    const rows = [
      { id: "r1", cells: [{ id: "c1", content: "Row 1" }] },
      { id: "r2", cells: [{ id: "c2", content: "Row 2" }] },
    ];
    const { table1, table2 } = splitTableHorizontal(rows, {}, 1);
    expect(table1.rows.length).toBe(1);
    expect(table2.rows.length).toBe(1);
    expect(table1.rows[0].cells[0].content).toBe("Row 1");
    expect(table2.rows[0].cells[0].content).toBe("Row 2");
  });

  it("splits table vertically into two separate tables with normalized widths", () => {
    const rows = [
      { id: "r1", cells: [{ id: "c1", content: "A1" }, { id: "c2", content: "B1" }] },
    ];
    const { table1, table2 } = splitTableVertical(rows, { columnWidths: [50, 50] }, 1);
    expect(table1.rows[0].cells.length).toBe(1);
    expect(table2.rows[0].cells.length).toBe(1);
    expect(table1.rows[0].cells[0].content).toBe("A1");
    expect(table2.rows[0].cells[0].content).toBe("B1");
    expect(table1.settings.columnWidths).toEqual([100]);
    expect(table2.settings.columnWidths).toEqual([100]);
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

  it("renders subGrid subcells when cell has a subGrid structure", () => {
    const tableWithSubgrid = {
      id: "table-subgrid",
      type: "table",
      label: "Subgrid Table",
      tableRows: [
        {
          id: "tr1",
          height: 50,
          cells: [
            {
              id: "parent-cell-1",
              content: "",
              subGrid: {
                rows: 2,
                cols: 1,
                cells: [
                  { id: "sub-1", content: "Primary Service" },
                  { id: "sub-2", content: "Accessorial Charge" },
                ],
              },
            },
          ],
        },
      ],
      tableSettings: { columnWidths: [100] },
    };

    render(
      <InteractiveTableBlock
        item={tableWithSubgrid}
        isSelected={true}
        preview={false}
      />
    );

    expect(screen.getByText("Primary Service")).toBeInTheDocument();
    expect(screen.getByText("Accessorial Charge")).toBeInTheDocument();
  });

  it("renders + Restore button on spacer cell and restores on click", () => {
    const onItem = vi.fn();
    const tableWithSpacer = {
      id: "table-spacer",
      type: "table",
      label: "Spacer Table",
      tableRows: [
        {
          id: "tr1",
          height: 36,
          cells: [
            { id: "spacer-cell-1", isSpacer: true, content: "" },
          ],
        },
      ],
      tableSettings: { columnWidths: [100] },
    };

    render(
      <InteractiveTableBlock
        item={tableWithSpacer}
        isSelected={true}
        preview={false}
        onItem={onItem}
      />
    );

    const restoreBtn = screen.getByRole("button", { name: /\+ Restore/i });
    expect(restoreBtn).toBeInTheDocument();
    fireEvent.click(restoreBtn);

    expect(onItem).toHaveBeenCalled();
    const updated = onItem.mock.calls[0][0];
    expect(updated.tableRows[0].cells[0].isSpacer).toBe(false);
  });

  it("renders cell fontSize and fontFamily inline styles when provided", () => {
    const tableWithFontStyles = {
      id: "table-fonts",
      type: "table",
      label: "Custom Fonts Table",
      tableRows: [
        {
          id: "tr1",
          height: 40,
          cells: [
            {
              id: "cell-font-1",
              content: "Custom Styled Cell",
              fontSize: 18,
              fontFamily: "Georgia, serif",
              color: "#2563eb",
            },
          ],
        },
      ],
      tableSettings: { columnWidths: [100] },
    };

    const { container } = render(
      <InteractiveTableBlock
        item={tableWithFontStyles}
        isSelected={true}
        preview={false}
      />
    );

    const td = container.querySelector("td");
    expect(td).toBeInTheDocument();
    expect(td.style.fontSize).toBe("18px");
    expect(td.style.fontFamily).toBe("Georgia, serif");
    expect(td.style.color).toBe("rgb(37, 99, 235)");
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
