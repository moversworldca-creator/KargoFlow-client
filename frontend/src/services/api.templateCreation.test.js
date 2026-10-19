import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  delete: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}));

vi.mock("./axios", () => ({ default: apiMock }));

import {
  createCommunicationTemplate,
  createDocumentTemplate,
  createEstimatePortalTemplate,
} from "./api";

describe("template creation draft conversion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.delete.mockResolvedValue({ data: {} });
    apiMock.post.mockResolvedValue({
      data: { id: 42, name: "Created Template", draft_revision: { lock_version: 2 } },
    });
    apiMock.put.mockResolvedValue({ data: { lock_version: 2 } });
  });

  it.each([
    ["document", createDocumentTemplate, "contract"],
    ["estimate", createEstimatePortalTemplate, "estimate_portal"],
  ])("includes preset HTML in the initial %s builder draft", async (_kind, createTemplate, subtype) => {
    const presetHtml = "<section><h1>Starting layout</h1></section>";

    const response = await createTemplate({
      name: "Created Template",
      template_type: subtype === "estimate_portal" ? "binding" : "contract",
      subtype: subtype === "estimate_portal" ? "binding" : undefined,
      content: { docSettings: { format: "Letter", margin: "40px" }, blocks: [] },
      html_content: presetHtml,
    });

    expect(apiMock.post).toHaveBeenCalledWith(
      "/tenant/builder/templates/",
      expect.objectContaining({
        document: expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              blocks: expect.arrayContaining([
                expect.objectContaining({ type: "text", props: { html: presetHtml } }),
              ]),
            }),
          ]),
        }),
      })
    );
    expect(apiMock.put).not.toHaveBeenCalled();
    expect(response.data.lock_version).toBe(2);
  });

  it("maps communication create fields to the tenant API schema for SMS", async () => {
    await createCommunicationTemplate({
      name: "Booking Confirmation SMS",
      channel: "sms",
      template_key: "booking_confirmation_sms",
      subject: "",
      body: "Your move is confirmed.",
      branch: 5,
      is_active: true,
    });

    expect(apiMock.post).toHaveBeenCalledWith(
      "/tenant/communications/templates/",
      expect.objectContaining({
        name: "Booking Confirmation SMS",
        channel: "sms",
        body_text: "Your move is confirmed.",
        branch_id: 5,
        is_active: true,
      })
    );
    expect(apiMock.post.mock.calls[0][1]).not.toHaveProperty("body");
    expect(apiMock.post.mock.calls[0][1]).not.toHaveProperty("branch");
  });

  it("preserves email content and maps its branch to the tenant API schema", async () => {
    await createCommunicationTemplate({
      name: "Estimate Follow-up",
      channel: "email",
      subject: "Your estimate",
      body_html: "<p>Thanks for requesting an estimate.</p>",
      branch: 8,
      is_active: true,
    });

    expect(apiMock.post).toHaveBeenCalledWith(
      "/tenant/communications/templates/",
      expect.objectContaining({
        name: "Estimate Follow-up",
        channel: "email",
        subject: "Your estimate",
        body_html: "<p>Thanks for requesting an estimate.</p>",
        branch_id: 8,
        is_active: true,
      })
    );
  });

  it("creates generic invoice documents with the backend invoice kind, subtype, and required blocks", async () => {
    const html = "<p>Invoice details</p>";

    await createDocumentTemplate({
      name: "New Invoice",
      scope_type: "opportunity",
      template_type: "invoice",
      content: { docSettings: { format: "Letter", margin: "40px" }, blocks: [] },
      html_content: html,
    });

    expect(apiMock.post).toHaveBeenCalledWith(
      "/tenant/builder/templates/",
      expect.objectContaining({ kind: "invoice", subtype: "final", name: "New Invoice" })
    );
    expect(apiMock.post).toHaveBeenCalledWith(
      "/tenant/builder/templates/",
      expect.objectContaining({
        document: expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              blocks: expect.arrayContaining([
                expect.objectContaining({ type: "line_items" }),
                expect.objectContaining({ type: "totals" }),
              ]),
            }),
          ]),
        }),
      })
    );
    expect(apiMock.put).not.toHaveBeenCalled();
  });

  it("maps the legacy credit-card authorization type to a signed Builder document subtype", async () => {
    await createDocumentTemplate({
      name: "Card Authorization",
      scope_type: "opportunity",
      template_type: "credit_card_authorization",
      html_content: "<p>Authorization</p>",
    });

    expect(apiMock.post).toHaveBeenCalledWith(
      "/tenant/builder/templates/",
      expect.objectContaining({ kind: "document", subtype: "cc_authorization" })
    );
    expect(apiMock.post).toHaveBeenCalledWith(
      "/tenant/builder/templates/",
      expect.objectContaining({
        document: expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              blocks: expect.arrayContaining([
                expect.objectContaining({ type: "signature" }),
              ]),
            }),
          ]),
        }),
      })
    );
  });

  it("normalizes legacy document preset merge tokens to backend variable names", async () => {
    await createDocumentTemplate({
      name: "Legacy BOL",
      template_type: "bol",
      html_content: "{{Company.primary_phone}} {{Opportunity.sales_number}} {{OriginAddress.full_address}}",
    });

    expect(apiMock.post).toHaveBeenCalledWith(
      "/tenant/builder/templates/",
      expect.objectContaining({
        document: expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              blocks: expect.arrayContaining([
                expect.objectContaining({
                  type: "text",
                  props: {
                    html: "{{company.phone}} {{opportunity.number}} {{move.origin_address}}",
                  },
                }),
              ]),
            }),
          ]),
        }),
      })
    );
    expect(apiMock.put).not.toHaveBeenCalled();
  });

  it("surfaces template creation errors without converting them to a draft conflict", async () => {
    apiMock.post.mockRejectedValueOnce({
      response: { status: 422, data: { detail: "Invalid draft" } },
    });

    await expect(
      createDocumentTemplate({
        name: "Invalid Contract",
        template_type: "contract",
        html_content: "<p>Contract</p>",
      })
    ).rejects.toMatchObject({
      response: { status: 422 },
    });

    expect(apiMock.put).not.toHaveBeenCalled();
    expect(apiMock.delete).not.toHaveBeenCalled();
  });
});
