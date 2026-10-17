import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import InlineEdit, { resolveVariableContent, SAMPLE_LOGISTICS_DATA } from "./components/InlineEdit";
import NotesRichTextEditor from "./components/NotesRichTextEditor";
import EditableHtmlBlock from "./components/EditableHtmlBlock";
import DocumentBlock from "./components/DocumentBlock";

describe("Phase 1: InlineEdit Component", () => {
  it("renders static value when not editing", () => {
    render(<InlineEdit value="Door-to-Door Freight" part="title" />);
    expect(screen.getByText("Door-to-Door Freight")).toBeInTheDocument();
  });

  it("resolves sample logistics data correctly when active", () => {
    const raw = "Estimate for {{customer_name}} at {{origin}}";
    const resolved = resolveVariableContent(raw, true);
    expect(resolved).toContain("Alex Mercer");
    expect(resolved).toContain("Chicago Terminal");
  });

  it("switches to input on double-click and commits change on Enter", () => {
    const onCommit = vi.fn();
    render(<InlineEdit value="Original Label" part="label" onCommit={onCommit} />);

    const textEl = screen.getByText("Original Label");
    fireEvent.doubleClick(textEl);

    const input = screen.getByDisplayValue("Original Label");
    fireEvent.change(input, { target: { value: "Updated Custom Title" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    fireEvent.blur(input);

    expect(onCommit).toHaveBeenCalledWith("Updated Custom Title");
  });

  it("cancels edits on Escape key without committing", () => {
    const onCommit = vi.fn();
    render(<InlineEdit value="Unchanged Text" part="txt" onCommit={onCommit} />);

    fireEvent.doubleClick(screen.getByText("Unchanged Text"));
    const input = screen.getByDisplayValue("Unchanged Text");
    fireEvent.change(input, { target: { value: "Temporary Draft" } });
    fireEvent.keyDown(input, { key: "Escape", code: "Escape" });
    fireEvent.blur(input);

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("applies inline style prop directly to rendered span and input", () => {
    const { container } = render(
      <InlineEdit
        value="Custom Styled Inline"
        part="lbl"
        style={{ fontSize: "28px", fontWeight: 300, color: "rgb(220, 38, 38)" }}
      />
    );

    const span = container.querySelector("span");
    expect(span).toBeInTheDocument();
    expect(span.style.fontSize).toBe("28px");
    expect(span.style.fontWeight).toBe("300");
    expect(span.style.color).toBe("rgb(220, 38, 38)");
  });
});

describe("Phase 1: DocumentBlock Header & Heading Typography", () => {
  it("renders Header company name with custom fontSize and fontWeight without Tailwind class collisions", () => {
    const headerItem = {
      id: "hdr-1",
      type: "header",
      label: "Official Quote",
      style: {
        fontSize: 34,
        fontWeight: 300,
        fontFamily: "Georgia, serif",
        color: "#1e3a8a",
      },
      fields: [
        { id: "companyName", label: "Company", value: "Acme Freight International" },
        { id: "estimateTitle", label: "Title", value: "ESTIMATE 2026" },
      ],
    };

    const { container } = render(
      <DocumentBlock
        item={headerItem}
        isSelected={true}
        preview={false}
        onSelect={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
      />
    );

    const companySpan = screen.getByText("Acme Freight International");
    expect(companySpan).toBeInTheDocument();
    expect(companySpan.style.fontSize).toBe("34px");
    expect(companySpan.style.fontWeight).toBe("300");
    expect(companySpan.style.fontFamily).toBe("Georgia, serif");
    expect(companySpan.className).not.toContain("text-xl");
    expect(companySpan.className).not.toContain("font-bold");
  });
});

describe("Phase 1: NotesRichTextEditor Component", () => {
  it("renders rich text content preview", () => {
    render(
      <NotesRichTextEditor
        value="<p>Standard payment terms are <strong>Net 30</strong> days.</p>"
        preview={true}
      />
    );
    expect(screen.getByText(/Standard payment terms are/i)).toBeInTheDocument();
    expect(screen.getByText("Net 30")).toBeInTheDocument();
  });

  it("shows toolbar when 'Format Tools' button is clicked", () => {
    render(
      <NotesRichTextEditor
        value="<p>Terms and Conditions</p>"
        preview={false}
        isSelected={true}
      />
    );

    const formatToolsBtn = screen.getByTitle("Show formatting toolbar");
    expect(formatToolsBtn).toBeInTheDocument();
    fireEvent.click(formatToolsBtn);

    // Now formatting buttons are visible
    expect(screen.getByTitle("Bold")).toBeInTheDocument();
    expect(screen.getByTitle("Italic")).toBeInTheDocument();
    expect(screen.getByTitle("Upload & Insert Image")).toBeInTheDocument();
  });

  it("applies page boundary containment, word break and overflow wrap to prevent overflowing page", () => {
    const { container } = render(
      <NotesRichTextEditor
        value="<p>UnbrokenVeryLongWordThatMustWrapInsideTheA4PageBoundaryWithoutOverflowingOutsideTheMargins123456789</p>"
        preview={false}
        isSelected={false}
      />
    );

    const wrapper = container.querySelector(".notes-rich-editor-wrapper");
    expect(wrapper).toBeInTheDocument();
    expect(wrapper.className).toContain("max-w-full");
    expect(wrapper.className).toContain("overflow-hidden");

    const contentDiv = container.querySelector(".notes-blank-editor-content");
    expect(contentDiv).toBeInTheDocument();
    expect(contentDiv.className).toContain("break-words");
    expect(contentDiv.style.wordBreak).toBe("break-word");
    expect(contentDiv.style.overflowWrap).toBe("anywhere");
    expect(contentDiv.style.maxWidth).toBe("100%");
  });
});

describe("Phase 1: EditableHtmlBlock Component", () => {
  it("renders sanitized HTML and scoped CSS container", () => {
    const item = {
      id: "html-block-test",
      type: "html",
      htmlContent: `<div class="hero"><h1>Custom Banner</h1></div>`,
      cssContent: `.hero { color: red; }`,
    };

    render(<EditableHtmlBlock item={item} preview={false} isSelected={false} />);
    expect(screen.getByText("Custom Banner")).toBeInTheDocument();
  });

  it("shows Edit HTML/CSS button when selected and triggers onOpenHtmlEditor", () => {
    const onOpenHtmlEditor = vi.fn();
    const item = {
      id: "html-block-test-2",
      type: "html",
      htmlContent: `<p>Interactive Box</p>`,
    };

    render(
      <EditableHtmlBlock
        item={item}
        preview={false}
        isSelected={true}
        onOpenHtmlEditor={onOpenHtmlEditor}
      />
    );

    const editBtn = screen.getByRole("button", { name: /Edit HTML\/CSS/i });
    expect(editBtn).toBeInTheDocument();
    fireEvent.click(editBtn);
    expect(onOpenHtmlEditor).toHaveBeenCalled();
  });
});
