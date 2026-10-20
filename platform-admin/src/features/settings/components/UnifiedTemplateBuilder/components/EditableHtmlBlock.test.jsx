import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import EditableHtmlBlock from "./EditableHtmlBlock";

describe("EditableHtmlBlock", () => {
  it("includes the original item identity when saving edited HTML", () => {
    const item = {
      id: "html-1",
      type: "html",
      label: "Custom HTML",
      htmlContent: "<p>Original content</p>",
      cssContent: ".title { color: blue; }",
    };
    const onItem = vi.fn();
    const { container } = render(<EditableHtmlBlock item={item} onItem={onItem} />);
    const editor = container.querySelector('[contenteditable="true"]');

    editor.innerHTML = "<p>Updated content</p>";
    fireEvent.input(editor);

    expect(onItem).toHaveBeenCalledWith({
      ...item,
      htmlContent: "<p>Updated content</p>",
      content: "<p>Updated content</p>",
    });
  });
});
