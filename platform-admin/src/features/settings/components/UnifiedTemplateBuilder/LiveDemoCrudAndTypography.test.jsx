import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import RightPropertiesPanel from "./components/RightPropertiesPanel";
import DocumentBlock from "./components/DocumentBlock";
import InteractiveTableBlock from "./components/InteractiveTableBlock";
import InsertTablePopup from "./modals/InsertTablePopup";
import { compileDocumentToHtml } from "./model/htmlCompiler";
import {
  createTableWidget,
  createWidget,
} from "./model/templateModel";
import {
  insertRows,
  insertCols,
  deleteRows,
  deleteCols,
  mergeSelectedCells,
  splitMergedCell,
  deleteRowKeepGap,
  deleteColKeepGap,
  clearSelectedCells,
} from "./core/tableOperations";

describe("Live Demo: Editable Components Typography & Full Table CRUD Engine", () => {
  describe("1. Editable Component Typography (Font Size, Family, Weight, Style, Align, Color, Line Height)", () => {
    it("updates font family across font groups and applies style on canvas and compiler", () => {
      const handleUpdateItem = vi.fn();
      const textItem = {
        id: "text-p1",
        type: "text",
        label: "Text Block",
        content: "Typography demo text",
        style: { fontFamily: "Inter, sans-serif", fontSize: 14 },
      };

      render(
        <RightPropertiesPanel
          selectedItem={textItem}
          onUpdateItem={handleUpdateItem}
          documentSettings={{}}
          onUpdateDocumentSettings={() => {}}
          mode="document"
        />
      );

      // Verify font family dropdown
      const fontSelect = screen.getByDisplayValue("Inter");
      expect(fontSelect).toBeDefined();

      // Change font family to Georgia (Elegant Serif)
      fireEvent.change(fontSelect, { target: { value: "Georgia, serif" } });
      expect(handleUpdateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          style: expect.objectContaining({ fontFamily: "Georgia, serif" }),
        })
      );

      // Verify DocumentBlock renders with Georgia font family
      const { container } = render(
        <DocumentBlock
          item={{ ...textItem, style: { ...textItem.style, fontFamily: "Georgia, serif" } }}
          isSelected={false}
          onSelect={() => {}}
          onUpdate={() => {}}
          onDelete={() => {}}
          onDuplicate={() => {}}
        />
      );
      const textBlock = container.querySelector(".text-block-widget [style*='font-family: Georgia, serif']");
      expect(textBlock).not.toBeNull();
    });

    it("toggles bold, italic, underline, and strikethrough", () => {
      const handleUpdateItem = vi.fn();
      const headingItem = {
        id: "heading-1",
        type: "heading",
        label: "Section Heading",
        content: "Formatted Title",
        style: { bold: false, italic: false, underline: false, strikethrough: false },
      };

      render(
        <RightPropertiesPanel
          selectedItem={headingItem}
          onUpdateItem={handleUpdateItem}
          documentSettings={{}}
          onUpdateDocumentSettings={() => {}}
          mode="estimate"
        />
      );

      const boldBtn = screen.getByTitle("Bold");
      const italicBtn = screen.getByTitle("Italic");
      const underlineBtn = screen.getByTitle("Underline");
      const strikeBtn = screen.getByTitle("Strikethrough");

      // Toggle Bold
      fireEvent.click(boldBtn);
      expect(handleUpdateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          style: expect.objectContaining({ bold: true, fontWeight: 700 }),
        })
      );

      // Toggle Italic
      fireEvent.click(italicBtn);
      expect(handleUpdateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          style: expect.objectContaining({ italic: true }),
        })
      );

      // Toggle Underline
      fireEvent.click(underlineBtn);
      expect(handleUpdateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          style: expect.objectContaining({ underline: true }),
        })
      );

      // Toggle Strikethrough
      fireEvent.click(strikeBtn);
      expect(handleUpdateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          style: expect.objectContaining({ strikethrough: true }),
        })
      );

      fireEvent.click(screen.getByText("Center"));
      expect(handleUpdateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          style: expect.objectContaining({ align: "center" }),
        })
      );

      fireEvent.change(screen.getByTitle("Text Color").querySelector('input[type="color"]'), {
        target: { value: "#336699" },
      });
      expect(handleUpdateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          style: expect.objectContaining({ color: "#336699" }),
        })
      );
    });

    it("changes text alignment (Left, Center, Right) and Line Height", () => {
      const handleUpdateItem = vi.fn();
      const textItem = {
        id: "text-align-1",
        type: "text",
        label: "Text Block",
        content: "Centered paragraph demo",
        style: { align: "left", lineHeight: 1.4 },
      };

      render(
        <RightPropertiesPanel
          selectedItem={textItem}
          onUpdateItem={handleUpdateItem}
          documentSettings={{}}
          onUpdateDocumentSettings={() => {}}
          mode="estimate"
        />
      );

      // Align Center
      const centerBtn = screen.getByText("Center");
      fireEvent.click(centerBtn);
      expect(handleUpdateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          style: expect.objectContaining({ align: "center" }),
        })
      );

      // Line Height
      const lineHeights = screen.getAllByRole("combobox");
      const lineHeightSelect = lineHeights.find((sel) => sel.value === "1.4");
      expect(lineHeightSelect).toBeDefined();

      fireEvent.change(lineHeightSelect, { target: { value: "1.8" } });
      expect(handleUpdateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          style: expect.objectContaining({ lineHeight: 1.8 }),
        })
      );
    });
  });

  describe("2. Table CRUD Engine & Cell Formatting", () => {
    it("CREATE: Inserts a custom 3x4 table via InsertTablePopup", () => {
      const handleInsert = vi.fn();
      render(
        <InsertTablePopup
          isOpen={true}
          onClose={() => {}}
          onInsert={handleInsert}
        />
      );

      expect(screen.getByText("Insert Table")).toBeDefined();
      const rowsInput = screen.getByLabelText(/Rows/i);
      const colsInput = screen.getByLabelText(/Cols/i);

      fireEvent.change(rowsInput, { target: { value: "3" } });
      fireEvent.change(colsInput, { target: { value: "4" } });

      const insertBtn = screen.getByRole("button", { name: /Create Table/i });
      fireEvent.click(insertBtn);

      expect(handleInsert).toHaveBeenCalledWith(3, 4);
    });

    it("READ & SELECT: Selects single cell and renders floating formatting toolbar", () => {
      const tableItem = createTableWidget(3, 3, "Demo Table");
      const handleUpdate = vi.fn();

      render(
        <InteractiveTableBlock
          item={tableItem}
          isSelected={true}
          preview={false}
          onSelect={() => {}}
          onItem={handleUpdate}
          selection={{ cellId: tableItem.tableRows[0].cells[0].id }}
        />
      );

      // Verify cell font size stepper in floating toolbar
      const cellFont = screen.getByText("12px");
      expect(cellFont).toBeDefined();

      // Verify + Row and + Col buttons exist in floating toolbar
      expect(screen.getByTitle("Insert row above")).toBeDefined();
      expect(screen.getByTitle("Insert row below")).toBeDefined();
      expect(screen.getByTitle("Insert column left")).toBeDefined();
      expect(screen.getByTitle("Insert column right")).toBeDefined();
    });

    it("UPDATE (Rows & Columns): Inserts row above/below and column left/right", () => {
      const table = createTableWidget(2, 2, "Test Table");
      expect(table.tableRows.length).toBe(2);
      expect(table.tableRows[0].cells.length).toBe(2);

      // Insert Row Below
      const rowsAfterInsert = insertRows(table.tableRows, 0, "below", 1);
      expect(rowsAfterInsert.length).toBe(3);

      // Insert Row Above
      const rowsAfterInsertAbove = insertRows(table.tableRows, 0, "above", 1);
      expect(rowsAfterInsertAbove.length).toBe(3);

      // Insert Column Right
      const colRes = insertCols(table.tableRows, table.tableSettings, 0, "right", 1);
      expect(colRes.rows[0].cells.length).toBe(3);
      expect(colRes.settings.columnWidths.length).toBe(3);

      // Insert Column Left
      const colLeftRes = insertCols(table.tableRows, table.tableSettings, 0, "left", 1);
      expect(colLeftRes.rows[0].cells.length).toBe(3);
    });

    it("UPDATE (Merge & Split): Merges multi-cell selection and splits back", () => {
      const table = createTableWidget(3, 3, "Merge Table");
      const c1Id = table.tableRows[0].cells[0].id;
      const c2Id = table.tableRows[0].cells[1].id;
      const c3Id = table.tableRows[1].cells[0].id;
      const c4Id = table.tableRows[1].cells[1].id;

      // Merge 2x2 cells
      const mergeRes = mergeSelectedCells(table.tableRows, [c1Id, c2Id, c3Id, c4Id]);
      expect(mergeRes.mergedCellId).toBe(c1Id);

      const mergedRows = mergeRes.rows;
      const masterCell = mergedRows[0].cells.find((c) => c.id === c1Id);
      expect(masterCell).toBeDefined();
      expect(masterCell.rowSpan).toBe(2);
      expect(masterCell.colSpan).toBe(2);

      // Split merged master cell back
      const splitRows = splitMergedCell(mergedRows, c1Id, 2, 2);
      expect(splitRows.length).toBe(3);
      // Master cell restored
      expect(splitRows[0].cells.length).toBe(3);
    });

    it("UPDATE (Cell Font Size Stepper & Colors): Modifies cell fontSize and color", () => {
      const table = createTableWidget(2, 2, "Cell Style Table");
      const handleItem = vi.fn();

      render(
        <InteractiveTableBlock
          item={table}
          isSelected={true}
          preview={false}
          onSelect={() => {}}
          onItem={handleItem}
          selection={{ cellId: table.tableRows[0].cells[0].id }}
        />
      );

      // Increase cell font size
      const plusBtn = screen.getByTitle("Increase font size");
      fireEvent.click(plusBtn);

      expect(handleItem).toHaveBeenCalledWith(
        expect.objectContaining({
          tableRows: expect.arrayContaining([
            expect.objectContaining({
              cells: expect.arrayContaining([
                expect.objectContaining({ fontSize: 13 }),
              ]),
            }),
          ]),
        })
      );
    });

    it("UPDATE (Nested Subgrid): Creates a 2x2 subgrid inside a table cell", () => {
      const table = createTableWidget(2, 2, "Subgrid Table");
      const cellId = table.tableRows[0].cells[0].id;

      const rowsWithSubgrid = splitMergedCell(table.tableRows, cellId, 2, 2);
      const targetCell = rowsWithSubgrid[0].cells.find((c) => c.id === cellId);

      expect(targetCell.subGrid).toBeDefined();
      expect(targetCell.subGrid.rows).toBe(2);
      expect(targetCell.subGrid.cols).toBe(2);
      expect(targetCell.subGrid.cells.length).toBe(4);
    });

    it("DELETE: Deletes row and column while maintaining grid integrity", () => {
      const table = createTableWidget(3, 3, "Delete Table");

      // Delete Row (physical)
      const rowsAfterDel = deleteRows(table.tableRows, [1]);
      expect(rowsAfterDel.length).toBe(2);

      // Delete Column (physical)
      const colDelRes = deleteCols(table.tableRows, table.tableSettings, [1]);
      expect(colDelRes.rows[0].cells.length).toBe(2);
      expect(colDelRes.settings.columnWidths.length).toBe(2);

      // Delete Row Gap Preservation (soft delete)
      const gapRows = deleteRowKeepGap(table.tableRows, [1]);
      expect(gapRows[1].cells.every((c) => c.isSpacer)).toBe(true);

      // Clear Cell text
      const cleared = clearSelectedCells(table.tableRows, [table.tableRows[0].cells[0].id]);
      expect(cleared[0].cells[0].content).toBe("");
    });
  });

  describe("3. Serialization & End-to-End Output Verification", () => {
    it("compiles customized typography and table structures cleanly to HTML", () => {
      const tableItem = createTableWidget(2, 2, "Invoice Table");
      tableItem.tableRows[0].cells[0].content = "Item Description";
      tableItem.tableRows[0].cells[0].bold = true;
      tableItem.tableRows[0].cells[0].fontSize = 14;
      tableItem.tableRows[0].cells[1].content = "$2,500.00";
      tableItem.tableRows[0].cells[1].textAlign = "right";

      const doc = {
        name: "Full Live Demo Invoice",
        settings: { fontSize: 14, pageSize: "A4", orientation: "Portrait" },
        items: [
          {
            id: "heading-1",
            type: "heading",
            content: "Official Freight Estimate",
            style: { fontSize: 26, fontFamily: "Georgia, serif", bold: true, color: "#0b2948" },
          },
          tableItem,
          {
            id: "text-1",
            type: "text",
            content: "Thank you for partnering with KargoFlow.",
            style: { fontSize: 13, align: "center", italic: true },
          },
        ],
      };

      const html = compileDocumentToHtml(doc, "estimate");
      expect(html).toContain("Official Freight Estimate");
      expect(html).toContain("font-size: 26px;");
      expect(html).toContain("font-family: Georgia, serif;");
      expect(html).toContain("Item Description");
      expect(html).toContain("font-size: 14px;");
      expect(html).toContain("text-align: right;");
      expect(html).toContain("$2,500.00");
      expect(html).toContain("Thank you for partnering with KargoFlow.");
    });
  });
});
