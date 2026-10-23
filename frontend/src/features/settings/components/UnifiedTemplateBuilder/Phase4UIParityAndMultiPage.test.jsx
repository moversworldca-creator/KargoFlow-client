import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import UnifiedTemplateBuilder from "./UnifiedTemplateBuilder";
import TopNavbar, { Logo } from "./components/TopNavbar";
import LeftSidebar from "./components/LeftSidebar";
import DocumentCanvas from "./components/DocumentCanvas";
import DocumentBlock from "./components/DocumentBlock";
import RightPropertiesPanel from "./components/RightPropertiesPanel";
import CustomFieldModal from "./modals/CustomFieldModal";
import * as storageService from "./core/storageService";

describe("Phase 4: Reference UI Parity & Multi-Page Viewport Controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. renders official KargoFlow brand logo", () => {
    render(<Logo compact={true} />);
    expect(screen.getByAltText("KargoFlow")).toBeDefined();
  });


  it("2. renders sidebar toggle button and toggles toolkit sidebar", () => {
    const handleToggle = vi.fn();
    render(
      <TopNavbar
        title="Test Template"
        onTitleChange={() => {}}
        onToggleSidebar={handleToggle}
        isSidebarOpen={true}
        mode="estimate"
        modeConfig={{ label: "Estimate", canvasType: "paged" }}
      />
    );
    const toggleBtn = screen.getByTitle("Toggle toolkit sidebar");
    expect(toggleBtn).toBeDefined();
    fireEvent.click(toggleBtn);
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it("3. renders Draft button alongside Save Template button", () => {
    const handleSaveDraft = vi.fn();
    const handleSave = vi.fn();
    render(
      <TopNavbar
        title="Test Template"
        onTitleChange={() => {}}
        onSaveDraft={handleSaveDraft}
        onSave={handleSave}
        mode="estimate"
        modeConfig={{ label: "Estimate", canvasType: "paged" }}
      />
    );
    const draftBtn = screen.getByTitle("Save Draft");
    const saveBtn = screen.getByTitle("Save Template");
    expect(draftBtn).toBeDefined();
    expect(saveBtn).toBeDefined();

    fireEvent.click(draftBtn);
    expect(handleSaveDraft).toHaveBeenCalledTimes(1);

    fireEvent.click(saveBtn);
    expect(handleSave).toHaveBeenCalledTimes(1);
  });

  it("4. supports 3-way device preview switcher (desktop, tablet, mobile)", () => {
    const handleDeviceChange = vi.fn();
    render(
      <DocumentCanvas
        items={[]}
        pageSize="A4"
        orientation="Portrait"
        devicePreview="desktop"
        onDevicePreviewChange={handleDeviceChange}
        modeConfig={{ canvasType: "paged" }}
      />
    );
    const tabletBtn = screen.getByTitle("Tablet view (768px)");
    const mobileBtn = screen.getByTitle("Mobile view (375px)");
    const desktopBtn = screen.getByTitle("Desktop view (Standard page)");

    expect(desktopBtn).toBeDefined();
    expect(tabletBtn).toBeDefined();
    expect(mobileBtn).toBeDefined();

    fireEvent.click(tabletBtn);
    expect(handleDeviceChange).toHaveBeenCalledWith("tablet");

    fireEvent.click(mobileBtn);
    expect(handleDeviceChange).toHaveBeenCalledWith("mobile");
  });

  it("4b. renders mobile viewport frame with .mobile-viewport class and unclipped height", () => {
    const mockItem = { id: "item-1", type: "heading", label: "Mobile Header" };
    const { container } = render(
      <DocumentCanvas
        items={[mockItem]}
        pageSize="A4"
        orientation="Portrait"
        devicePreview="mobile"
        modeConfig={{ canvasType: "paged" }}
      />
    );

    const mobileContainer = container.querySelector(".device-viewport-container.device-mobile");
    expect(mobileContainer).not.toBeNull();

    const mobileDoc = container.querySelector(".mobile-viewport");
    expect(mobileDoc).not.toBeNull();
    expect(mobileDoc.textContent).toContain("Mobile Header");
    expect(mobileDoc.style.minHeight).toBe("auto");
  });

  it("4c. automatically fits landscape paper to the builder viewport", () => {
    let observer;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback) {
          this.callback = callback;
          observer = this;
        }

        observe(target) {
          this.target = target;
          Object.defineProperty(target, "clientWidth", { configurable: true, value: 800 });
          Object.defineProperty(target, "clientHeight", { configurable: true, value: 650 });
          this.callback();
        }

        disconnect() {}
      }
    );

    try {
      const handleZoomChange = vi.fn();
      render(
        <DocumentCanvas
          items={[]}
          pageSize="A4"
          orientation="Landscape"
          zoom={100}
          onZoomChange={handleZoomChange}
          devicePreview="desktop"
          modeConfig={{ canvasType: "paged" }}
        />
      );

      expect(handleZoomChange).toHaveBeenCalledWith(66);

      Object.defineProperty(observer.target, "clientWidth", { configurable: true, value: 600 });
      act(() => observer.callback());

      expect(handleZoomChange).toHaveBeenLastCalledWith(49);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("4d. reserves the scaled landscape page width in the canvas layout", () => {
    const { container } = render(
      <DocumentCanvas
        items={[]}
        pageSize="A4"
        orientation="Landscape"
        zoom={66}
        devicePreview="desktop"
        modeConfig={{ canvasType: "paged" }}
      />
    );

    const scaleFrame = container.querySelector(".page-sheet-scale-frame");
    const page = container.querySelector(".page-sheet-wrapper");
    expect(scaleFrame.style.width).toBe("741.18px");
    expect(page.style.width).toBe("1123px");
    expect(page.style.transform).toBe("scale(0.66)");
    expect(page.style.transformOrigin).toBe("top left");
  });

  it("4e. keeps a clear blank gap between pages in landscape canvas", () => {
    const { container } = render(
      <DocumentCanvas
        items={[]}
        pages={[
          { id: "page-1", name: "Page 1", items: [] },
          { id: "page-2", name: "Page 2", items: [] },
        ]}
        pageSize="A4"
        orientation="Landscape"
        zoom={66}
        devicePreview="desktop"
        modeConfig={{ canvasType: "paged" }}
      />
    );

    expect(container.querySelector('[data-testid="document-page-stack"]')).toHaveClass("gap-16");
    expect(container.querySelectorAll(".page-sheet-scale-frame")).toHaveLength(2);
    expect(container.querySelector(".page-sheet-scale-frame")).toHaveClass("isolate");
  });

  it("4f. reserves layout space when landscape page content exceeds paper height", () => {
    let pageObserver;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback) {
          this.callback = callback;
        }

        observe(target) {
          if (target.classList.contains("page-sheet-wrapper")) {
            pageObserver = this;
            Object.defineProperty(target, "getBoundingClientRect", {
              configurable: true,
              value: () => ({
                top: 0,
                bottom: 792,
                left: 0,
                right: 741,
                width: 741,
                height: 792,
              }),
            });
          }
        }

        disconnect() {}
      }
    );

    try {
      const { container } = render(
        <DocumentCanvas
          items={[]}
          pages={[{ id: "long-page", name: "Page 1", items: [] }]}
          pageSize="A4"
          orientation="Landscape"
          zoom={66}
          devicePreview="desktop"
          modeConfig={{ canvasType: "paged" }}
        />
      );
      act(() => pageObserver.callback());

      expect(container.querySelector(".page-sheet-scale-frame").style.height).toBe("792px");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("4f. new estimate pages inherit the document page size and orientation", () => {
    const handleChange = vi.fn();
    const template = {
      name: "Landscape estimate",
      content: {
        name: "Landscape estimate",
        settings: { pageSize: "A4", orientation: "Landscape" },
        items: [{ id: "heading-1", type: "heading", label: "Estimate heading" }],
        pages: [
          {
            id: "page-1",
            name: "Page 1",
            items: [{ id: "heading-1", type: "heading", label: "Estimate heading" }],
          },
        ],
      },
    };

    render(
      <UnifiedTemplateBuilder
        mode="estimate"
        template={template}
        onChange={handleChange}
        isOverlay={false}
      />
    );

    fireEvent.click(screen.getByLabelText("Add Blank Page"));

    expect(handleChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          settings: expect.objectContaining({ pageSize: "A4", orientation: "Landscape" }),
          pages: expect.arrayContaining([
            expect.objectContaining({
              name: "Page 2",
              pageSize: "A4",
              orientation: "Landscape",
            }),
          ]),
        }),
      })
    );
  });

  it("5. supports Fit Width, Fit Page, and Zoom Reset auto-scaling buttons", () => {
    const handleZoomChange = vi.fn();
    const { container } = render(
      <DocumentCanvas
        items={[]}
        pageSize="A4"
        orientation="Portrait"
        zoom={100}
        onZoomChange={handleZoomChange}
        modeConfig={{ canvasType: "paged" }}
      />
    );
    const canvasViewport = container.querySelector(".document-canvas-scroll-area");
    Object.defineProperty(canvasViewport, "clientWidth", { configurable: true, value: 800 });
    Object.defineProperty(canvasViewport, "clientHeight", { configurable: true, value: 650 });
    canvasViewport.style.padding = "16px";

    const fitWidthBtn = screen.getByTitle("Fit to Width");
    const fitPageBtn = screen.getByTitle("Fit to Page");
    const resetZoomBtn = screen.getByTitle("Reset Zoom (100%)");

    expect(fitWidthBtn).toBeDefined();
    expect(fitPageBtn).toBeDefined();
    expect(resetZoomBtn).toBeDefined();

    fireEvent.click(fitWidthBtn);
    expect(handleZoomChange).toHaveBeenCalledWith(89);

    Object.defineProperty(canvasViewport, "clientWidth", { configurable: true, value: 400 });
    fireEvent.click(fitWidthBtn);
    expect(handleZoomChange).toHaveBeenLastCalledWith(43);

    Object.defineProperty(canvasViewport, "clientWidth", { configurable: true, value: 800 });
    fireEvent.click(fitPageBtn);
    expect(handleZoomChange).toHaveBeenCalledWith(51);

    fireEvent.click(resetZoomBtn);
    expect(handleZoomChange).toHaveBeenCalledWith(100);
  });

  it("provides consistent, keyboard-discoverable labels and spacing for canvas toolbar icons", () => {
    const { container, unmount } = render(
      <DocumentCanvas
        items={[]}
        pageSize="A4"
        orientation="Portrait"
        devicePreview="desktop"
        zoom={100}
        modeConfig={{ canvasType: "paged" }}
      />
    );

    const desktopButton = screen.getByLabelText("Desktop preview");
    const fitWidthButton = screen.getByLabelText("Fit to Width");
    const rotateButton = screen.getByLabelText("Rotate Page Orientation");

    expect(desktopButton.className).toContain("h-8 w-8");
    expect(fitWidthButton.className).toContain("h-8 w-8");
    expect(rotateButton.className).toContain("h-8 w-8");
    expect(desktopButton.parentElement.querySelector(".gdoc-tooltip")).toHaveTextContent(
      "Desktop view (Standard page)"
    );
    expect(screen.getByTitle("Document preview: A4 · Portrait")).toBeDefined();
    expect(screen.getByTitle("Add Blank Page (A4)")).toBeDefined();
    expect(screen.getByTitle("Add Component")).toBeDefined();
    expect(fitWidthButton.parentElement.querySelector(".gdoc-tooltip")).toHaveTextContent(
      "Fit to width"
    );
    expect(container.querySelector(".gdoc-tooltip-container")).not.toBeNull();

    unmount();
    const { container: emailContainer, unmount: unmountEmail } = render(
      <DocumentCanvas
        items={[]}
        devicePreview="mobile"
        zoom={100}
        modeConfig={{ canvasType: "email" }}
      />
    );

    const emailMobileButton = screen.getByLabelText("Mobile preview");
    const emailZoomButton = screen.getByLabelText("Zoom Out");
    const emailCanvasViewport = screen.getByTestId("template-canvas-viewport");
    const emailScaleFrame = emailContainer.querySelector(".page-sheet-scale-frame");
    expect(emailMobileButton.className).toContain("h-8 w-8");
    expect(emailCanvasViewport.className).toContain("min-h-0");
    expect(emailCanvasViewport.className).toContain("overflow-y-auto");
    expect(emailCanvasViewport.className).toContain("overflow-x-auto");
    expect(emailCanvasViewport.className).toContain("overscroll-contain");
    expect(emailScaleFrame.style.width).toBe("360px");
    expect(screen.getByTitle("Email preview: Responsive width (360px)")).toBeDefined();
    expect(screen.getByTitle("Add Section Block")).toBeDefined();
    expect(screen.getByTitle("Custom Layout")).toBeDefined();
    expect(emailMobileButton.parentElement.querySelector(".gdoc-tooltip")).toHaveTextContent(
      "Mobile preview (360px)"
    );
    expect(emailZoomButton.className).toContain("h-8 w-8");
    expect(emailScaleFrame.style.width).toBe("360px");

    unmountEmail();
    const { container: smsContainer } = render(
      <DocumentCanvas
        items={[]}
        smsText="Status update"
        modeConfig={{ canvasType: "sms" }}
      />
    );
    const smsCanvasViewport = screen.getByTestId("template-canvas-viewport");
    const smsScaleFrame = smsContainer.querySelector(".page-sheet-scale-frame");
    expect(smsCanvasViewport.className).toContain("min-h-0");
    expect(smsCanvasViewport.className).toContain("overflow-y-auto");
    expect(smsCanvasViewport.className).toContain("overflow-x-auto");
    expect(smsCanvasViewport.className).toContain("overscroll-contain");
    expect(smsScaleFrame.style.width).toBe("600px");
    expect(screen.getByTitle("SMS Dispatch Simulator · GSM-7 & UCS-2")).toBeDefined();
    expect(screen.getByTitle("Insert Variable")).toBeDefined();
    expect(screen.getByTitle(/Carrier payload:/)).toBeDefined();
  });

  it("6. renders 1-click Rotate Page Orientation button in secondary canvas toolbar", () => {
    const handleToggleOrientation = vi.fn();
    render(
      <DocumentCanvas
        items={[]}
        pageSize="A4"
        orientation="Portrait"
        onToggleOrientation={handleToggleOrientation}
        modeConfig={{ canvasType: "paged" }}
      />
    );
    const rotateBtn = screen.getByLabelText("Rotate Page Orientation");
    expect(rotateBtn).toBeDefined();
    expect(screen.getByText("Rotate Landscape")).toBeDefined();

    fireEvent.click(rotateBtn);
    expect(handleToggleOrientation).toHaveBeenCalledTimes(1);
  });

  it("7. renders multi-page sheets with Add Blank Page and page header mini-actions", () => {
    const handleAddPage = vi.fn();
    const handleAddPageBefore = vi.fn();
    const handleAddPageAfter = vi.fn();
    const handleDuplicatePage = vi.fn();
    const handleDeletePage = vi.fn();

    const mockPages = [
      { id: "page-1", name: "Page 1", items: [] },
      { id: "page-2", name: "Page 2", items: [] },
    ];

    render(
      <DocumentCanvas
        items={[]}
        pages={mockPages}
        pageSize="A4"
        orientation="Portrait"
        onAddPage={handleAddPage}
        onAddPageBefore={handleAddPageBefore}
        onAddPageAfter={handleAddPageAfter}
        onDuplicatePage={handleDuplicatePage}
        onDeletePage={handleDeletePage}
        modeConfig={{ canvasType: "paged" }}
      />
    );

    // Add Blank Page in secondary toolbar
    const addPageBtn = screen.getByLabelText("Add Blank Page");
    expect(addPageBtn).toBeDefined();
    fireEvent.click(addPageBtn);
    expect(handleAddPage).toHaveBeenCalledTimes(1);

    // Page header actions on Page 1
    const beforeBtns = screen.getAllByLabelText("Add blank page before");
    expect(beforeBtns.length).toBe(2);
    fireEvent.click(beforeBtns[0]);
    expect(handleAddPageBefore).toHaveBeenCalledWith(0);

    const duplicateBtns = screen.getAllByLabelText("Duplicate page");
    expect(duplicateBtns.length).toBe(2);
    fireEvent.click(duplicateBtns[1]);
    expect(handleDuplicatePage).toHaveBeenCalledWith(1);

    const deleteBtns = screen.getAllByLabelText("Delete page");
    expect(deleteBtns.length).toBe(2);
    fireEvent.click(deleteBtns[0]);
    expect(handleDeletePage).toHaveBeenCalledWith(0);
  });

  it("8. renders Visual Orientation Picker cards in LeftSidebar settings tab", () => {
    const handleOrientationChange = vi.fn();
    render(
      <LeftSidebar
        mode="estimate"
        pageSize="A4"
        orientation="Portrait"
        onOrientationChange={handleOrientationChange}
        library={[]}
      />
    );

    // Click Settings tab in LeftSidebar
    const settingsTab = screen.getByRole("button", { name: /settings/i });
    fireEvent.click(settingsTab);

    // Verify visual orientation cards
    const landscapeCard = screen.getByRole("radio", { name: /landscape/i });
    expect(landscapeCard).toBeDefined();

    fireEvent.click(landscapeCard);
    expect(handleOrientationChange).toHaveBeenCalledWith("Landscape");
  });

  it("9. renders Template Library Quick Shelf (X/25) with load and delete", () => {
    const handleLoad = vi.fn();
    const handleDelete = vi.fn();
    const mockLibrary = [
      { id: "tpl-1", name: "Express Moving Quote", settings: { category: "Moving" }, items: [] },
      { id: "tpl-2", name: "Commercial Freight Agreement", settings: { category: "Freight" }, items: [] },
    ];

    render(
      <LeftSidebar
        mode="estimate"
        pageSize="A4"
        orientation="Portrait"
        library={mockLibrary}
        onLoadFromLibrary={handleLoad}
        onDeleteFromLibrary={handleDelete}
      />
    );

    // Switch to Settings tab
    const settingsTab = screen.getByRole("button", { name: /settings/i });
    fireEvent.click(settingsTab);

    expect(screen.getByText("TEMPLATE LIBRARY")).toBeDefined();
    expect(screen.getByText("2/25")).toBeDefined();
    expect(screen.getByText("Express Moving Quote")).toBeDefined();

    // Click to load template
    fireEvent.click(screen.getByText("Express Moving Quote"));
    expect(handleLoad).toHaveBeenCalledWith(mockLibrary[0]);

    // Click to delete template
    const removeBtn = screen.getByLabelText("Delete Express Moving Quote");
    fireEvent.click(removeBtn);
    expect(handleDelete).toHaveBeenCalledWith("tpl-1");
  });

  it("10. creates and submits custom field with label, value, and variable in CustomFieldModal", () => {
    const handleAdd = vi.fn();
    const handleClose = vi.fn();

    render(
      <CustomFieldModal
        isOpen={true}
        mode="estimate"
        onClose={handleClose}
        onAdd={handleAdd}
      />
    );

    expect(screen.getByText("Add Custom Field")).toBeDefined();
    const labelInput = screen.getByPlaceholderText(/Customer Reference/i);
    const valueInput = screen.getByPlaceholderText(/PO-98421/i);

    fireEvent.change(labelInput, { target: { value: "PO Number" } });
    fireEvent.change(valueInput, { target: { value: "PO-778899" } });

    const submitBtn = screen.getByRole("button", { name: /add field/i });
    fireEvent.click(submitBtn);

    expect(handleAdd).toHaveBeenCalledWith({
      label: "PO Number",
      value: "PO-778899",
      variable: undefined,
    });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("11. sidebar widgets and variables are draggable with proper dataTransfer payload", () => {
    render(
      <LeftSidebar
        mode="estimate"
        pageSize="A4"
        orientation="Portrait"
        library={[]}
      />
    );

    // Document widget button is draggable
    const headingBtn = screen.getByText("Heading").closest("button");
    expect(headingBtn).toBeDefined();
    expect(headingBtn.getAttribute("draggable")).toBe("true");

    const setData = vi.fn();
    fireEvent.dragStart(headingBtn, {
      dataTransfer: { setData, effectAllowed: "" },
    });
    expect(setData).toHaveBeenCalledWith("widget", expect.stringContaining("heading"));

    // Switch to Variables/Tags tab
    const varsTab = screen.getByRole("button", { name: /tags/i });
    fireEvent.click(varsTab);

    // Variable row is draggable
    const varRow = screen.getByText("Customer Full Name").closest("[draggable='true']");
    expect(varRow).toBeDefined();
    expect(varRow.getAttribute("draggable")).toBe("true");

    const setVarData = vi.fn();
    fireEvent.dragStart(varRow, {
      dataTransfer: { setData: setVarData, effectAllowed: "" },
    });
    expect(setVarData).toHaveBeenCalledWith("variable", "{{customer.full_name}}");
  });

  it("12. canvas renders drop zones that handle dragOver and onDropInPage", () => {
    const handleDropInPage = vi.fn();
    const mockPages = [
      {
        id: "p1",
        name: "Page 1",
        items: [
          { id: "item-1", type: "heading", label: "Title" },
          { id: "item-2", type: "text", label: "Note" },
        ],
      },
    ];

    const { container } = render(
      <DocumentCanvas
        items={mockPages[0].items}
        pages={mockPages}
        pageSize="A4"
        orientation="Portrait"
        devicePreview="desktop"
        modeConfig={{ canvasType: "paged" }}
        onDropInPage={handleDropInPage}
      />
    );

    const dropZones = container.querySelectorAll(".drop-zone");
    // 2 items -> 2 before drop-zones + 1 end drop-zone = 3 drop zones
    expect(dropZones.length).toBe(3);

    // Drag over first drop zone activates active class
    fireEvent.dragOver(dropZones[0]);
    expect(dropZones[0].classList.contains("active")).toBe(true);

    // Drop on first drop zone triggers onDropInPage with pageIndex 0, itemIndex 0
    fireEvent.drop(dropZones[0], {
      dataTransfer: { getData: () => JSON.stringify({ type: "heading", label: "New Heading" }) },
    });
    expect(handleDropInPage).toHaveBeenCalledWith(expect.anything(), 0, 0);
  });

  it("13. canvas DocumentBlock renders draggable component-grip handle for reordering", () => {
    const mockItem = { id: "item-123", type: "heading", label: "Header Block" };
    render(
      <DocumentBlock
        item={mockItem}
        isSelected={false}
        preview={false}
      />
    );

    const gripBtn = screen.getByLabelText("Drag component");
    expect(gripBtn).toBeDefined();
    expect(gripBtn.getAttribute("draggable")).toBe("true");

    const setData = vi.fn();
    fireEvent.dragStart(gripBtn, {
      dataTransfer: { setData, effectAllowed: "" },
    });
    expect(setData).toHaveBeenCalledWith("itemId", "item-123");
  });

  it("14. RightPropertiesPanel renders complete typography controls, layout sliders, and variable bindings", () => {
    const handleUpdate = vi.fn();
    const mockItem = {
      id: "item-text",
      type: "text",
      label: "Custom Text Block",
      width: "full",
      padding: 12,
      style: {
        fontFamily: "Inter, sans-serif",
        fontSize: 16,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: 1,
        lineHeight: 1.6,
        color: "#0b2948",
        backgroundColor: "#ffffff",
        borderRadius: 8,
        borderStyle: "solid",
        borderWidth: 2,
        borderColor: "#cbd5e1",
      },
      fields: [
        { id: "f1", label: "Estimate Ref", value: "{{estimate.number}}", visible: true },
      ],
    };

    render(
      <RightPropertiesPanel
        selectedItem={mockItem}
        onUpdateItem={handleUpdate}
        mode="estimate"
      />
    );

    // Typography section
    expect(screen.getByText("Typography")).toBeDefined();
    expect(screen.getByDisplayValue("Custom Text Block")).toBeDefined();
    
    // Font family dropdown with grouped options
    const fontSelect = screen.getByDisplayValue("Inter");
    expect(fontSelect).toBeDefined();

    // Font size & weight inputs
    expect(screen.getByDisplayValue("16")).toBeDefined();
    expect(screen.getByDisplayValue("Semibold (600)")).toBeDefined();

    // Text transform
    expect(screen.getByDisplayValue("UPPERCASE")).toBeDefined();

    // Layout & Styling section
    expect(screen.getByText("Layout & Styling")).toBeDefined();
    expect(screen.getByDisplayValue("Full width (100%)")).toBeDefined();
    expect(screen.getByDisplayValue("12")).toBeDefined(); // padding
    expect(screen.getByDisplayValue("Solid")).toBeDefined();

    // Variable binding dropdown
    expect(screen.getByText("Estimate Number ({{estimate.number}})")).toBeDefined();
  });

  it("15. RightPropertiesPanel renders document settings with page size and orientation when no item selected", () => {
    const handleDocSettings = vi.fn();
    const handlePageSize = vi.fn();
    const handleOrientation = vi.fn();

    render(
      <RightPropertiesPanel
        selectedItem={null}
        documentSettings={{ currency: "USD", defaultTax: "8.25", validity: "30 days", category: "Estimate" }}
        onUpdateDocumentSettings={handleDocSettings}
        docName="Commercial Freight Quote"
        pageSize="A4"
        onPageSizeChange={handlePageSize}
        orientation="Portrait"
        onOrientationChange={handleOrientation}
      />
    );

    expect(screen.getByText("Document Settings")).toBeDefined();
    expect(screen.getByDisplayValue("Commercial Freight Quote")).toBeDefined();
    expect(screen.getByDisplayValue("30 days")).toBeDefined();
    expect(screen.getByDisplayValue("A4 (210×297)")).toBeDefined();
    expect(screen.getByDisplayValue("Portrait")).toBeDefined();
    expect(screen.queryByText("Currency")).toBeNull();
    expect(screen.queryByText("Default Tax (%)")).toBeNull();
  });

  it("16. DocumentBlock applies typography, layout, background, and border styling to outer element", () => {
    const mockItem = {
      id: "styled-block",
      type: "text",
      label: "Notice",
      content: "Terms and conditions apply.",
      width: "half",
      padding: 16,
      style: {
        fontFamily: "Roboto, sans-serif",
        fontSize: 14,
        fontWeight: 700,
        color: "#1e293b",
        backgroundColor: "#f8fafc",
        borderRadius: 12,
        borderStyle: "dashed",
        borderWidth: 2,
        borderColor: "#94a3b8",
        letterSpacing: 0.5,
        lineHeight: 1.6,
      },
    };

    const { container } = render(
      <DocumentBlock
        item={mockItem}
        isSelected={false}
        preview={false}
      />
    );

    const docComponent = container.querySelector(".doc-component");
    expect(docComponent).toBeDefined();
    expect(docComponent.style.width).toBe("50%");
    expect(docComponent.style.padding).toBe("16px");
    expect(docComponent.style.borderRadius).toBe("12px");
    expect(docComponent.style.border).toBe("2px dashed rgb(148, 163, 184)");
    expect(docComponent.style.fontFamily).toBe("Roboto, sans-serif");
  });

  it("17. SMS Canvas renders Desktop, Tablet, and Mobile device preview switcher and responds to clicks", () => {
    const handleDeviceChange = vi.fn();
    const handleSmsChange = vi.fn();

    const { rerender } = render(
      <DocumentCanvas
        mode="sms"
        modeConfig={{ canvasType: "sms" }}
        smsText="Your shipment KF-8291 is out for delivery today!"
        onSmsTextChange={handleSmsChange}
        devicePreview="desktop"
        onDevicePreviewChange={handleDeviceChange}
      />
    );

    // Verify all 3 device buttons exist in Header Row 2
    const desktopBtn = screen.getByLabelText("Desktop preview");
    const tabletBtn = screen.getByLabelText("Tablet preview");
    const mobileBtn = screen.getByLabelText("Mobile preview");

    expect(desktopBtn).toBeDefined();
    expect(tabletBtn).toBeDefined();
    expect(mobileBtn).toBeDefined();

    // Verify desktop preview header
    expect(screen.getByText(/Desktop \(600px\)/i)).toBeDefined();

    // Click tablet
    fireEvent.click(tabletBtn);
    expect(handleDeviceChange).toHaveBeenCalledWith("tablet");

    // Click mobile
    fireEvent.click(mobileBtn);
    expect(handleDeviceChange).toHaveBeenCalledWith("mobile");

    // Rerender with mobile view
    rerender(
      <DocumentCanvas
        mode="sms"
        modeConfig={{ canvasType: "sms" }}
        smsText="Your shipment KF-8291 is out for delivery today!"
        onSmsTextChange={handleSmsChange}
        devicePreview="mobile"
        onDevicePreviewChange={handleDeviceChange}
      />
    );
    expect(screen.getByText(/Mobile \(340px\)/i)).toBeDefined();

    // Rerender with tablet view
    rerender(
      <DocumentCanvas
        mode="sms"
        modeConfig={{ canvasType: "sms" }}
        smsText="Your shipment KF-8291 is out for delivery today!"
        onSmsTextChange={handleSmsChange}
        devicePreview="tablet"
        onDevicePreviewChange={handleDeviceChange}
      />
    );
    expect(screen.getByText(/Tablet \(560px\)/i)).toBeDefined();
  });
});
