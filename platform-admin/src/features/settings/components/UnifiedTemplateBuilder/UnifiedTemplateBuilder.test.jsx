import { describe, it, expect } from "vitest";
import {
  calculateCharge,
  calculateSubtotal,
  calculateTaxTotal,
  parseNumeric,
  validateTemplateDocument,
} from "./model/templateModel";
import { analyzeSmsText } from "./core/smsCalculator";
import { sanitizeHtml, scopeCss } from "./core/htmlSanitizer";
import { buildLogicalGrid, insertRows } from "./core/tableOperations";

describe("Unified Template Builder Core Tests", () => {
  it("parses numeric values correctly", () => {
    expect(parseNumeric("150.00")).toBe(150);
    expect(parseNumeric("$1,250.50")).toBe(1250.5);
    expect(parseNumeric("{{rate}}")).toBeNull();
  });

  it("calculates charges accurately with discounts and tax", () => {
    const row = {
      description: "Hourly Labor",
      quantity: "4",
      unitPrice: "100.00",
      discount: "10",
      tax: "5",
      amount: "",
    };
    const result = calculateCharge(row);
    expect(result).not.toBeNull();
    expect(result.base).toBe(360); // 400 - 10%
    expect(result.discount).toBe(40);
    expect(result.tax).toBe(18); // 5% of 360
    expect(result.total).toBe(378);
  });

  it("calculates telecom GSM-7 SMS segments accurately", () => {
    const singleGsm = "Hello, your move is scheduled for tomorrow at 9 AM!";
    const analysis = analyzeSmsText(singleGsm);
    expect(analysis.encoding).toBe("GSM-7");
    expect(analysis.segments).toBe(1);

    const unicodeEmoji = "Your move is confirmed! 🚚📦";
    const unicodeAnalysis = analyzeSmsText(unicodeEmoji);
    expect(unicodeAnalysis.encoding).toBe("UCS-2 (Unicode)");
    expect(unicodeAnalysis.nonGsmChars.length).toBeGreaterThan(0);
  });

  it("sanitizes dangerous HTML tags while preserving layout", () => {
    const dirty = '<div>Hello</div><script>alert("xss")</script><iframe src="evil.com"></iframe>';
    const clean = sanitizeHtml(dirty).cleanHtml;
    expect(clean).not.toContain("<script>");
    expect(clean).not.toContain("<iframe>");
    expect(clean).toContain("Hello");
  });

  it("scopes user CSS to unique block classnames", () => {
    const css = "h1 { color: red; } .badge { font-weight: bold; }";
    const scoped = scopeCss(css, "my-block-1");
    expect(scoped).toContain(".my-block-1 h1");
    expect(scoped).toContain(".my-block-1 .badge");
  });

  it("manipulates 2D table grid accurately", () => {
    const initialRows = [
      {
        id: "r1",
        cells: [
          { id: "c1", content: "A" },
          { id: "c2", content: "B" },
        ],
      },
    ];
    const { matrix, maxCols } = buildLogicalGrid(initialRows);
    expect(maxCols).toBe(2);
    expect(matrix.length).toBe(1);

    const withInserted = insertRows(initialRows, 0, "below", 1);
    expect(withInserted.length).toBe(2);
  });
});
