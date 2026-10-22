import { afterEach, describe, expect, it, vi } from "vitest";
import { createSmsPrintHtml, printHtmlInIsolatedFrame } from "./printUtils";

describe("template print utilities", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.querySelectorAll('iframe[title="Template print frame"]').forEach((frame) => frame.remove());
  });

  it("escapes SMS template text and preserves line breaks", () => {
    const html = createSmsPrintHtml("<Hi & welcome>\n{{customer.name}}");

    expect(html).toContain("&lt;Hi &amp; welcome&gt;\n{{customer.name}}");
    expect(html).toContain("white-space: pre-wrap");
  });

  it("prints only the isolated content frame, not the builder page", () => {
    vi.useFakeTimers();
    const parentPrint = vi.spyOn(window, "print").mockImplementation(() => {});
    printHtmlInIsolatedFrame("<!doctype html><html><body>Template only</body></html>");

    const frame = document.querySelector('iframe[title="Template print frame"]');
    expect(frame).not.toBeNull();
    expect(frame.contentDocument.body.textContent).toBe("Template only");
    const frameFocus = vi.spyOn(frame.contentWindow, "focus").mockImplementation(() => {});
    const framePrint = vi.spyOn(frame.contentWindow, "print").mockImplementation(() => {});

    vi.advanceTimersByTime(150);

    expect(frameFocus).toHaveBeenCalledOnce();
    expect(framePrint).toHaveBeenCalledOnce();
    expect(parentPrint).not.toHaveBeenCalled();
    frame.contentWindow.dispatchEvent(new Event("afterprint"));
    expect(document.querySelector('iframe[title="Template print frame"]')).toBeNull();
  });
});
