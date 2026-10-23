import React from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import PreviewModal from "./PreviewModal";

describe("PreviewModal server-rendered toolbar", () => {
  it("provides working device, zoom, edit, sample data, export, print, and close controls", () => {
    const onClose = vi.fn();
    const onExportJson = vi.fn();
    const onUseLocalPreview = vi.fn();
    render(
      <PreviewModal
        isOpen
        doc={{ name: "Server preview", settings: { pageSize: "Letter" }, items: [] }}
        remotePreview={{ data: { html: "<html><body>Rendered document</body></html>" } }}
        onClose={onClose}
        onExportJson={onExportJson}
        onUseLocalPreview={onUseLocalPreview}
      />
    );

    const frame = screen.getByTitle("Server rendered sample preview");
    expect(frame).toBeInTheDocument();
    const frameFocus = vi.spyOn(frame.contentWindow, "focus").mockImplementation(() => {});
    const framePrint = vi.spyOn(frame.contentWindow, "print").mockImplementation(() => {});
    fireEvent.load(frame);
    expect(screen.getByRole("button", { name: "Print preview" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Desktop preview" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Tablet preview" }));
    expect(frame).toHaveStyle({ width: "768px" });
    expect(screen.getByRole("button", { name: "Tablet preview" })).toHaveAttribute("aria-pressed", "true");

    const viewport = screen.getByTestId("preview-canvas-viewport");
    Object.defineProperty(viewport, "clientWidth", { configurable: true, value: 900 });
    Object.defineProperty(viewport, "clientHeight", { configurable: true, value: 700 });
    fireEvent.click(screen.getByTitle("Fit full page on screen"));
    expect(screen.getByLabelText("Zoom level")).toHaveTextContent("58%");

    const zoomBefore = Number.parseInt(screen.getByLabelText("Zoom level").textContent, 10);
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(Number.parseInt(screen.getByLabelText("Zoom level").textContent, 10)).toBe(zoomBefore + 10);
    fireEvent.click(screen.getByTitle("Reset Zoom (100%)"));
    expect(screen.getByLabelText("Zoom level")).toHaveTextContent("100%");

    fireEvent.click(screen.getByRole("button", { name: /Edit & Drag Mode/i }));
    expect(onUseLocalPreview).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Show raw variables" }));
    expect(onUseLocalPreview).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: /Export JSON/i }));
    expect(onExportJson).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Print preview" }));
    expect(frameFocus).toHaveBeenCalledTimes(1);
    expect(framePrint).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    frameFocus.mockRestore();
    framePrint.mockRestore();
  });

  it("wraps narrow-screen controls while keeping print and close actions available", () => {
    const onClose = vi.fn();
    render(
      <PreviewModal
        isOpen
        doc={{ name: "Narrow preview", settings: { pageSize: "Letter" }, items: [] }}
        remotePreview={{ data: { html: "<html><body>Rendered document</body></html>" } }}
        onClose={onClose}
      />
    );

    const header = screen.getByRole("dialog").querySelector("header");
    expect(header).toHaveClass("grid-cols-[minmax(0,1fr)_auto]", "sm:flex");
    expect(screen.getByRole("button", { name: "Close preview" })).toBeInTheDocument();
    const frame = screen.getByTitle("Server rendered sample preview");
    vi.spyOn(frame.contentWindow, "focus").mockImplementation(() => {});
    vi.spyOn(frame.contentWindow, "print").mockImplementation(() => {});
    fireEvent.load(frame);
    fireEvent.click(screen.getByRole("button", { name: "Print preview" }));
    fireEvent.click(screen.getByRole("button", { name: "Close preview" }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("PreviewModal widget editing", () => {
  it("uses the selected paper dimensions for the printable iframe", () => {
    render(
      <PreviewModal
        isOpen
        doc={{ name: "Print test", settings: { pageSize: "Letter", orientation: "Portrait" }, items: [] }}
        onClose={() => {}}
      />
    );

    const frame = screen.getByTitle("Document Print Frame");
    vi.spyOn(frame.contentWindow, "focus").mockImplementation(() => {});
    vi.spyOn(frame.contentWindow, "print").mockImplementation(() => {});
    fireEvent.click(screen.getByTitle("Save as PDF or Print document"));

    expect(frame).not.toHaveClass("hidden");
    expect(frame).toHaveStyle({ width: "816px", height: "1056px", display: "block" });
  });

  it("applies a screen-only gutter after server styles so they cannot override it", () => {
    const html = "<!doctype html><html><head><title>Preview</title><style>body { padding: 0 !important; }</style></head><body><main>Document</main></body></html>";
    render(
      <PreviewModal
        isOpen
        doc={{ name: "Preview test", settings: {}, items: [] }}
        remotePreview={{ data: { html } }}
        onClose={() => {}}
      />
    );

    const iframe = screen.getByTitle("Server rendered sample preview");
    const srcdoc = iframe.getAttribute("srcdoc");
    expect(srcdoc).toContain('margin: 0;');
    expect(srcdoc).toContain('padding: 8mm !important;');
    expect(srcdoc).toContain('html { padding: 0 !important; }');
    expect(srcdoc).toContain('body { padding: 8mm !important; }');
    expect(srcdoc).toContain('box-sizing: border-box !important;');
    expect(srcdoc).toContain('size: A4 portrait;');
    expect(srcdoc.indexOf('padding: 8mm !important;')).toBeGreaterThan(
      srcdoc.indexOf('body { padding: 0 !important; }')
    );
    expect(srcdoc).toContain('max-width: 100% !important;');
    expect(srcdoc).toContain(
      "@media screen { html, body { width: 100%; max-width: 100%; overflow-x: hidden; } body { box-sizing: border-box; padding: 24px !important; } .kf-document { width: 100%; max-width: 860px; margin: 0 auto; } }"
    );
    expect(srcdoc.indexOf("@media screen")).toBeGreaterThan(srcdoc.indexOf("body { padding: 0 !important; }"));
    expect(iframe.getAttribute("srcdoc")).toContain("<main>Document</main>");
  });

  it("opens widget settings when a backend document widget is selected", () => {
    const onUpdateItem = vi.fn();
    const item = {
      id: "heading-1",
      type: "builder_block",
      blockType: "heading",
      label: "Heading",
      props: { text: "Existing heading", level: 2, align: "left" },
      propsSchema: {
        type: "object",
        properties: {
          text: { type: "string" },
          level: { type: "integer" },
          align: { type: "string", enum: ["left", "center", "right"] },
        },
        required: ["text"],
      },
    };

    render(
      <PreviewModal
        isOpen
        doc={{ name: "Preview test", settings: {}, items: [item] }}
        onClose={() => {}}
        onUpdateItem={onUpdateItem}
        onUpdateDoc={() => {}}
      />
    );

    fireEvent.click(screen.getByText("Existing heading"));
    expect(screen.getByText("heading settings")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("text *"), { target: { value: "Updated heading" } });
    expect(onUpdateItem).toHaveBeenCalledWith({
      ...item,
      props: { ...item.props, text: "Updated heading" },
    });
  });

  it("selects a form widget when its preview input is clicked", () => {
    const item = {
      id: "form-field-1",
      type: "builder_block",
      blockType: "form_field",
      label: "Customer response",
      props: { label: "Delivery instructions", field_type: "text", field_key: "delivery", signer_role: "customer" },
      propsSchema: {
        type: "object",
        properties: {
          label: { type: "string" },
          field_type: { type: "string", enum: ["text", "checkbox", "date"] },
          field_key: { type: "string" },
          signer_role: { type: "string" },
          required: { type: "boolean" },
        },
        required: ["label", "field_type", "field_key", "signer_role"],
      },
    };

    render(
      <PreviewModal
        isOpen
        doc={{ name: "Preview test", settings: {}, items: [item] }}
        onClose={() => {}}
        onUpdateItem={() => {}}
        onUpdateDoc={() => {}}
      />
    );

    const responseInput = screen.getByPlaceholderText("Customer response");
    expect(responseInput).not.toBeDisabled();
    fireEvent.click(responseInput);
    expect(screen.getByText("form field settings")).toBeInTheDocument();
  });

  it("opens the full HTML editor for a selected live-preview block", () => {
    const onOpenHtmlEditor = vi.fn();
    const item = {
      id: "html-1",
      type: "html",
      label: "Custom HTML",
      htmlContent: "<p>Editable preview content</p>",
    };

    render(
      <PreviewModal
        isOpen
        doc={{ name: "Preview test", settings: {}, items: [item] }}
        onClose={() => {}}
        onUpdateItem={() => {}}
        onUpdateDoc={() => {}}
        onOpenHtmlEditor={onOpenHtmlEditor}
      />
    );

    fireEvent.click(screen.getByText("Editable preview content"));
    fireEvent.click(screen.getByRole("button", { name: "Edit HTML/CSS" }));

    expect(onOpenHtmlEditor).toHaveBeenCalledWith(item);
  });

  it("selects a payment widget instead of triggering a payment action", () => {
    const item = {
      id: "payment-1",
      type: "builder_block",
      blockType: "payment",
      label: "Payment",
      props: { amount_source: "deposit", label: "Pay deposit" },
      propsSchema: {
        type: "object",
        properties: {
          amount_source: { type: "string", enum: ["deposit", "balance"] },
          label: { type: "string" },
          show_qr: { type: "boolean" },
        },
      },
    };

    render(
      <PreviewModal
        isOpen
        doc={{ name: "Preview test", settings: {}, items: [item] }}
        onClose={() => {}}
        onUpdateItem={() => {}}
        onUpdateDoc={() => {}}
      />
    );

    const paymentButton = screen.getByRole("button", { name: "Pay deposit" });
    expect(paymentButton).not.toBeDisabled();
    fireEvent.click(paymentButton);
    expect(screen.getByText("payment settings")).toBeInTheDocument();
  });

  it("selects package options when a choice is clicked in edit mode", () => {
    const item = {
      id: "options-1",
      type: "builder_block",
      blockType: "options",
      label: "Package options",
      props: { selection: "single", required: false },
      propsSchema: {
        type: "object",
        properties: {
          selection: { type: "string", enum: ["single", "multiple"] },
          required: { type: "boolean" },
        },
      },
    };

    render(
      <PreviewModal
        isOpen
        doc={{ name: "Preview test", settings: {}, items: [item] }}
        onClose={() => {}}
        onUpdateItem={() => {}}
        onUpdateDoc={() => {}}
      />
    );

    const packageChoice = screen.getByLabelText(/Standard Move/);
    expect(packageChoice).not.toBeDisabled();
    fireEvent.click(packageChoice);
    expect(screen.getByText("options settings")).toBeInTheDocument();
  });

  it("toggles page orientation from live preview and updates landscape sheet dimensions", () => {
    const onUpdateDoc = vi.fn();
    const portraitDoc = {
      name: "Orientation preview",
      settings: { pageSize: "A4", orientation: "Portrait" },
      pages: [{ id: "page-1", name: "Page 1", items: [] }],
      items: [],
    };
    const { container, rerender } = render(
      <PreviewModal
        isOpen
        doc={portraitDoc}
        onClose={() => {}}
        onUpdateDoc={onUpdateDoc}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Rotate page to Landscape" }));
    expect(onUpdateDoc).toHaveBeenCalledWith({
      ...portraitDoc,
      settings: { ...portraitDoc.settings, orientation: "Landscape" },
    });

    const landscapeDoc = {
      ...portraitDoc,
      settings: { ...portraitDoc.settings, orientation: "Landscape" },
    };
    rerender(
      <PreviewModal
        isOpen
        doc={landscapeDoc}
        onClose={() => {}}
        onUpdateDoc={onUpdateDoc}
      />
    );

    const sheet = screen.getByTestId("preview-sheet-1");
    expect(sheet).toHaveAttribute("data-page-orientation", "Landscape");
    expect(sheet).toHaveAttribute("data-page-width", "1123");
    expect(sheet).toHaveAttribute("data-page-height", "794");
    expect(sheet.style.padding).toBe("40px");
    expect(screen.getByRole("button", { name: "Rotate page to Portrait" })).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("Mobile 375px View"));
    expect(sheet.style.width).toBe("375px");
    expect(sheet.style.padding).toBe("40px");
    expect(sheet).toHaveAttribute("data-page-orientation", "Landscape");
    expect(screen.getByText(/Mobile 375px/)).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("Tablet 768px View"));
    expect(sheet.style.width).toBe("768px");
    expect(sheet.style.padding).toBe("40px");
  });

  it("fits landscape pages to the available preview width and recalculates on resize", () => {
    let observer;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback) {
          this.callback = callback;
        }

        observe(target) {
          if (target.dataset.testid !== "preview-canvas-viewport") {
            this.callback();
            return;
          }
          observer = this;
          this.target = target;
          Object.defineProperty(target, "clientWidth", { configurable: true, value: 900 });
          Object.defineProperty(target, "clientHeight", { configurable: true, value: 700 });
          this.callback();
        }

        disconnect() {}
      }
    );

    try {
      render(
        <PreviewModal
          isOpen
          doc={{ name: "Landscape preview", settings: { pageSize: "A4", orientation: "Landscape" }, items: [] }}
          onClose={() => {}}
        />
      );

      expect(screen.getByText("74%")).toBeInTheDocument();

      Object.defineProperty(observer.target, "clientWidth", { configurable: true, value: 700 });
      Object.defineProperty(observer.target, "clientHeight", { configurable: true, value: 500 });
      act(() => observer.callback());

      expect(screen.getByText("57%")).toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("renders each page using its inherited paper format in preview", () => {
    render(
      <PreviewModal
        isOpen
        doc={{
          name: "Multi-page preview",
          settings: { pageSize: "A4", orientation: "Landscape" },
          pages: [
            { id: "page-1", name: "Page 1", items: [] },
            {
              id: "page-2",
              name: "Page 2",
              pageSize: "A4",
              orientation: "Landscape",
              items: [],
            },
          ],
          items: [],
        }}
        onClose={() => {}}
      />
    );

    const secondSheet = screen.getByTestId("preview-sheet-2");
    expect(secondSheet).toHaveAttribute("data-page-orientation", "Landscape");
    expect(secondSheet).toHaveAttribute("data-page-width", "1123");
    expect(secondSheet).toHaveAttribute("data-page-height", "794");
    expect(screen.getByText(/Page 2 of 2.*A4 \(Landscape\)/)).toBeInTheDocument();
  });

  it("keeps a fixed live-preview page gap and reserves scaled height for each page", () => {
    const { container } = render(
      <PreviewModal
        isOpen
        doc={{
          name: "Multi-page gap",
          settings: { pageSize: "A4", orientation: "Landscape" },
          pages: [{ id: "page-1", name: "Page 1", items: [] }],
          items: [],
        }}
        onClose={() => {}}
      />
    );

    const pageStack = screen.getByTestId("preview-page-stack");
    const frame = document.querySelector(".preview-page-scale-frame");
    const initialScale = Number.parseFloat(frame.style.width) / 1123;

    expect(pageStack.style.gap).toBe("96px");
    expect(pageStack.style.transform).toBe("");
    expect(Number.parseFloat(frame.style.height)).toBeCloseTo(820 * initialScale, 4);

    fireEvent.click(screen.getByTitle("Zoom In"));
    const zoomedFrame = document.querySelector(".preview-page-scale-frame");
    const zoomedScale = Number.parseFloat(zoomedFrame.style.width) / 1123;
    expect(zoomedScale).toBeCloseTo(initialScale + 0.1, 4);
    expect(Number.parseFloat(zoomedFrame.style.height)).toBeCloseTo(820 * zoomedScale, 4);
    expect(container.querySelector(".flex.flex-1.flex-col.min-w-0.min-h-0.overflow-hidden")).not.toBeNull();
    expect(screen.getByTestId("preview-canvas-viewport")).toHaveClass("overflow-y-auto");
  });

  it("keeps the orientation action out of email and SMS previews", () => {
    const doc = { name: "Communication preview", settings: {}, items: [] };
    const { container, rerender } = render(
      <PreviewModal isOpen doc={doc} mode="email" onClose={() => {}} />
    );
    expect(screen.queryByRole("button", { name: /Rotate page to/ })).toBeNull();
    expect(screen.getByTestId("preview-canvas-viewport")).toHaveClass(
      "min-h-0",
      "overflow-auto",
      "overscroll-contain"
    );
    const emailFrame = container.querySelector(".preview-page-scale-frame");
    const initialEmailWidth = Number.parseFloat(emailFrame.style.width);
    fireEvent.click(screen.getByTitle("Zoom In"));
    expect(Number.parseFloat(container.querySelector(".preview-page-scale-frame").style.width))
      .toBeCloseTo(initialEmailWidth + 60, 4);

    rerender(
      <PreviewModal isOpen doc={doc} mode="sms" onClose={() => {}} />
    );
    expect(screen.queryByRole("button", { name: /Rotate page to/ })).toBeNull();
    expect(screen.getByTestId("preview-canvas-viewport")).toHaveClass(
      "min-h-0",
      "overflow-auto",
      "overscroll-contain"
    );
    const smsFrame = container.querySelector(".preview-page-scale-frame");
    const initialSmsWidth = Number.parseFloat(smsFrame.style.width);
    fireEvent.click(screen.getByTitle("Zoom In"));
    expect(Number.parseFloat(container.querySelector(".preview-page-scale-frame").style.width))
      .toBeCloseTo(initialSmsWidth + 60, 4);
  });
});
