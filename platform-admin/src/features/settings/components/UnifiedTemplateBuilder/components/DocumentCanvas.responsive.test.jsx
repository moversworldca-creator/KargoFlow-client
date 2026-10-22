import React from "react";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DocumentCanvas from "./DocumentCanvas";

function renderLetterCanvas(orientation = "Portrait", zoom = 100, items = []) {
  return render(
    <DocumentCanvas
      items={items}
      pages={[{ id: "page-1", name: "Page 1", items }]}
      pageSize="Letter"
      orientation={orientation}
      zoom={zoom}
      devicePreview="desktop"
      mode="estimate"
      modeConfig={{ canvasType: "paged" }}
    />
  );
}

describe("DocumentCanvas physical page sizing", () => {
  it("uses the shared Letter portrait dimensions while keeping viewport zoom separate", () => {
    const { container } = renderLetterCanvas("Portrait", 50);
    const frame = container.querySelector(".page-sheet-scale-frame");
    const wrapper = container.querySelector(".page-sheet-wrapper");
    const sheet = wrapper.querySelector(".bg-white");

    expect(frame.style.width).toBe("408px");
    expect(wrapper.style.width).toBe("816px");
    expect(wrapper.style.transform).toBe("scale(0.5)");
    expect(sheet.style.width).toBe("816px");
    expect(sheet.style.minHeight).toBe("1056px");
    expect(screen.getByText(/Letter · Portrait \(Page 1 of 1\)/)).toBeInTheDocument();
  });

  it("uses the shared Letter landscape dimensions without scaling the logical sheet", () => {
    const { container } = renderLetterCanvas("Landscape", 75);
    const frame = container.querySelector(".page-sheet-scale-frame");
    const wrapper = container.querySelector(".page-sheet-wrapper");
    const sheet = wrapper.querySelector(".bg-white");

    expect(frame.style.width).toBe("792px");
    expect(wrapper.style.width).toBe("1056px");
    expect(wrapper.style.transform).toBe("scale(0.75)");
    expect(sheet.style.width).toBe("1056px");
    expect(sheet.style.minHeight).toBe("816px");
  });

  it("keeps long content visible and marks the physical page boundary", () => {
    let pageObserver;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback) {
          this.callback = callback;
        }

        observe(target) {
          if (target.classList?.contains("page-sheet-wrapper")) pageObserver = this;
          if (target.classList?.contains("page-sheet-wrapper") || target.classList?.contains("bg-white")) {
            Object.defineProperty(target, "getBoundingClientRect", {
              configurable: true,
              value: () => ({
                top: 0,
                bottom: 800,
                left: 0,
                right: 408,
                width: 408,
                height: 800,
              }),
            });
          }
        }

        disconnect() {}
      }
    );

    try {
      const { container } = renderLetterCanvas("Portrait", 50);
      act(() => pageObserver.callback());

      const frame = container.querySelector(".page-sheet-scale-frame");
      const sheet = container.querySelector(".page-sheet-wrapper .bg-white");
      expect(screen.getByTestId("page-overflow-boundary")).toHaveTextContent(
        "Content continues beyond page"
      );
      expect(screen.getByText(/Page 1 of 1/)).toBeInTheDocument();
      expect(frame.style.height).toBe("800px");
      expect(sheet.style.minHeight).toBe("1056px");
      expect(sheet).toHaveClass("overflow-x-hidden");
      expect(sheet).not.toHaveClass("overflow-hidden");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
