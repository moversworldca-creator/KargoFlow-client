import { describe, expect, it } from "vitest";
import { chargeMatches, prebuiltSectionHtml } from "../../../../../../../shared/template-builder/model/prebuiltSections.js";
import { compileDocumentToHtml } from "./htmlCompiler";
import { createBackendWidget } from "../core/documentAdapter";

const compile = (blockType, props) => compileDocumentToHtml({
  items: [{ id: "w", type: "builder_block", blockType, props }],
}, "estimate");

describe("prebuilt sections", () => {
  it("draws a SmartMoving-style header with company and document details", () => {
    const html = prebuiltSectionHtml("doc_header", { title: "Estimate" }, "estimate");
    for (const text of ["KargoFlow Moving", "Licence #BC-MV-20418", "Estimate", "EST-00042", "Prepared for", "Alex Customer"]) {
      expect(html).toContain(text);
    }
    expect(prebuiltSectionHtml("doc_header", { title: "Bill", show_customer: false, show_license: false }, "invoice"))
      .not.toMatch(/Prepared for|Licence/);
  });

  it("shows the move overview with access details that can be hidden", () => {
    const html = prebuiltSectionHtml("move_overview", {});
    for (const text of ["Customer", "Arrival window", "8:00 AM – 9:00 AM", "Origin", "Loading dock", "Destination", "Driveway"]) {
      expect(html).toContain(text);
    }
    expect(prebuiltSectionHtml("move_overview", { show_access: false })).not.toContain("Loading dock");
  });

  it("draws the timeline, footer and paid stamp, and nothing for other widgets", () => {
    expect(prebuiltSectionHtml("job_timeline", {})).toContain("Schedule");
    expect(prebuiltSectionHtml("doc_footer", { text: "Thanks, {{customer.first_name}} <3" })).toContain("Thanks, Alex &lt;3");
    expect(prebuiltSectionHtml("paid_stamp", {})).toContain("PAID");
    expect(prebuiltSectionHtml("charges", {})).toBeNull();
    expect(compile("doc_header", { title: "Moving estimate" })).toContain("Moving estimate");
  });

  it("filters charge tables by category and supports the narrow layout", () => {
    const fees = compile("charges", { title: "Fees", filter: "fees", layout: "narrow", show_total: true });
    expect(fees).toContain("Moving truck");
    expect(fees).not.toContain("Moving labor");
    expect(fees).not.toContain(">Rate<");
    expect(fees).toContain("$350.00");
    expect(compile("charges", { filter: "services" })).toContain("No items.");
    expect(chargeMatches("Materials", "materials")).toBe(true);
    expect(chargeMatches("fuel", "fees")).toBe(true);
    expect(chargeMatches("discount", "fees")).toBe(false);
  });

  it("titles a new header after the template kind", () => {
    expect(createBackendWidget({ type: "doc_header" }, "invoice").props.title).toBe("Invoice");
    expect(createBackendWidget({ type: "doc_header" }, "estimate_portal").props.title).toBe("Estimate");
    expect(createBackendWidget({ type: "charges" }, "estimate_portal").props).toMatchObject({ layout: "wide", filter: "all" });
  });
});
