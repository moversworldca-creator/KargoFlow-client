import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import RightPropertiesPanel from "./components/RightPropertiesPanel";
import DocumentCanvas from "./components/DocumentCanvas";
import DocumentBlock from "./components/DocumentBlock";
import { compileDocumentToHtml } from "./model/htmlCompiler";

describe("Typography & Font Size Stepping across Templates", () => {
  describe("1. RightPropertiesPanel Steppers", () => {
    it("increments and decrements font size on selected component", () => {
      const handleUpdateItem = vi.fn();
      const selectedItem = {
        id: "item-text-1",
        type: "text",
        label: "Text Block",
        content: "Sample text",
        style: { fontSize: 14 },
      };

      render(
        <RightPropertiesPanel
          selectedItem={selectedItem}
          onUpdateItem={handleUpdateItem}
          documentSettings={{}}
          onUpdateDocumentSettings={() => {}}
          mode="estimate"
        />
      );

      const minusBtn = screen.getByTitle("Decrease font size");
      const plusBtn = screen.getByTitle("Increase font size");
      const input = screen.getByDisplayValue("14");

      expect(minusBtn).toBeDefined();
      expect(plusBtn).toBeDefined();
      expect(input).toBeDefined();

      // Decrement font size
      fireEvent.click(minusBtn);
      expect(handleUpdateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          style: expect.objectContaining({ fontSize: 13 }),
        })
      );

      // Increment font size
      fireEvent.click(plusBtn);
      expect(handleUpdateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          style: expect.objectContaining({ fontSize: 15 }),
        })
      );
    });

    it("increments and decrements table cell font size in cell inspector", () => {
      const handleUpdateItem = vi.fn();
      const selectedItem = {
        id: "tbl-1",
        type: "table",
        label: "Interactive Table",
        tableRows: [
          {
            id: "row-1",
            cells: [{ id: "cell-1", content: "A1", fontSize: 12 }],
          },
        ],
        tableSelection: {
          selectedCellIds: ["cell-1"],
        },
      };

      render(
        <RightPropertiesPanel
          selectedItem={selectedItem}
          selection={{ cellId: "cell-1" }}
          onUpdateItem={handleUpdateItem}
          documentSettings={{}}
          onUpdateDocumentSettings={() => {}}
          mode="document"
        />
      );

      const minusBtn = screen.getByTitle("Decrease cell font size");
      const plusBtn = screen.getByTitle("Increase cell font size");
      expect(minusBtn).toBeDefined();
      expect(plusBtn).toBeDefined();

      fireEvent.click(minusBtn);
      expect(handleUpdateItem).toHaveBeenCalled();

      fireEvent.click(plusBtn);
      expect(handleUpdateItem).toHaveBeenCalled();
    });

    it("increments and decrements SMS message font size in document settings", () => {
      const handleUpdateSettings = vi.fn();
      render(
        <RightPropertiesPanel
          selectedItem={null}
          onUpdateItem={() => {}}
          documentSettings={{ fontSize: 14 }}
          onUpdateDocumentSettings={handleUpdateSettings}
          mode="sms"
        />
      );

      const minusBtn = screen.getByTitle("Decrease SMS font size");
      const plusBtn = screen.getByTitle("Increase SMS font size");

      expect(minusBtn).toBeDefined();
      expect(plusBtn).toBeDefined();

      fireEvent.click(minusBtn);
      expect(handleUpdateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ fontSize: 13 })
      );

      fireEvent.click(plusBtn);
      expect(handleUpdateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ fontSize: 15 })
      );
    });

    it("increments and decrements base document font size for estimates/documents", () => {
      const handleUpdateSettings = vi.fn();
      render(
        <RightPropertiesPanel
          selectedItem={null}
          onUpdateItem={() => {}}
          documentSettings={{ fontSize: 12 }}
          onUpdateDocumentSettings={handleUpdateSettings}
          mode="estimate"
        />
      );

      const minusBtn = screen.getByTitle("Decrease base font size");
      const plusBtn = screen.getByTitle("Increase base font size");

      expect(minusBtn).toBeDefined();
      expect(plusBtn).toBeDefined();

      fireEvent.click(minusBtn);
      expect(handleUpdateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ fontSize: 11 })
      );

      fireEvent.click(plusBtn);
      expect(handleUpdateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ fontSize: 13 })
      );
    });
  });

  describe("2. DocumentCanvas SMS Secondary Toolbar Stepper", () => {
    it("renders SMS font size stepper in Header Row 2 and updates documentSettings", () => {
      const handleUpdateSettings = vi.fn();
      render(
        <DocumentCanvas
          modeConfig={{ canvasType: "sms" }}
          smsText="Your shipment KF-9021 has departed."
          documentSettings={{ fontSize: 14 }}
          onUpdateDocumentSettings={handleUpdateSettings}
        />
      );

      const minusBtn = screen.getByTitle("Decrease message font size");
      const plusBtn = screen.getByTitle("Increase message font size");

      expect(minusBtn).toBeDefined();
      expect(plusBtn).toBeDefined();
      expect(screen.getByText("14px")).toBeDefined();

      fireEvent.click(minusBtn);
      expect(handleUpdateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ fontSize: 13 })
      );

      fireEvent.click(plusBtn);
      expect(handleUpdateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ fontSize: 15 })
      );
    });

    it("renders SMS message bubble with custom font size", () => {
      const { container } = render(
        <DocumentCanvas
          modeConfig={{ canvasType: "sms" }}
          smsText="Test SMS Message Content"
          documentSettings={{ fontSize: 18 }}
        />
      );

      const bubble = container.querySelector(".bg-blue-600.text-white");
      expect(bubble).not.toBeNull();
      expect(bubble.style.fontSize).toBe("18px");

      const textarea = container.querySelector("textarea");
      expect(textarea).not.toBeNull();
      expect(textarea.style.fontSize).toBe("18px");
    });
  });

  describe("3. DocumentBlock Font Size Rendering", () => {
    it("renders text block with custom style.fontSize", () => {
      const item = {
        id: "text-1",
        type: "text",
        content: "Custom sized paragraph",
        style: { fontSize: 22 },
      };

      const { container } = render(
        <DocumentBlock
          item={item}
          isSelected={false}
          onSelect={() => {}}
          onUpdate={() => {}}
          onDelete={() => {}}
          onDuplicate={() => {}}
        />
      );

      const textElem = container.querySelector(".text-block-widget");
      expect(textElem).not.toBeNull();
      const inlineEdit = textElem.querySelector("[style*='font-size: 22px']");
      expect(inlineEdit).not.toBeNull();
    });

    it("renders charges block table with custom style.fontSize", () => {
      const item = {
        id: "charges-1",
        type: "charges",
        label: "Line Items",
        style: { fontSize: 16 },
        columns: [{ id: "c1", label: "Desc", key: "desc" }],
        rows: [{ id: "r1", desc: "Freight Charges" }],
      };

      const { container } = render(
        <DocumentBlock
          item={item}
          isSelected={false}
          onSelect={() => {}}
          onUpdate={() => {}}
          onDelete={() => {}}
          onDuplicate={() => {}}
        />
      );

      const table = container.querySelector("table");
      expect(table).not.toBeNull();
      expect(table.style.fontSize).toBe("16px");
    });
  });

  describe("4. HTML Compiler Font Size Serialization", () => {
    it("compiles body font size from doc.settings.fontSize", () => {
      const doc = {
        name: "Test Invoice",
        settings: { fontSize: 16 },
        items: [
          {
            id: "heading-1",
            type: "heading",
            content: "Invoice Title",
            style: { fontSize: 28 },
          },
          {
            id: "text-1",
            type: "text",
            content: "Please pay within 30 days.",
            style: { fontSize: 15 },
          },
        ],
      };

      const html = compileDocumentToHtml(doc, "invoice");
      expect(html).toContain("font-size: 16px;");
      expect(html).toContain("font-size: 28px;");
      expect(html).toContain("font-size: 15px;");
    });
  });
});
