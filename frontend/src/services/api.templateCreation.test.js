import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  delete: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}));

vi.mock("./axios", () => ({ default: apiMock }));

import {
  createCommunicationTemplate,
  updateCommunicationTemplate,
  createDocumentTemplate,
  createEstimatePortalTemplate,
  deleteDocumentTemplate,
  getBuilderCatalog,
  getDocumentTemplates,
  getDocumentVariableRegistry,
  installBuilderCatalogTemplate,
  previewDocumentTemplate,
  updateDocumentTemplate,
} from "./api";

describe("template creation draft conversion", () => {
  it.each([
    [createDocumentTemplate, 'document', 'contract'],
    [createDocumentTemplate, 'invoice', 'progress'],
  ])('uses the supported Builder create contract for %s metadata', async (create, kind, subtype) => {
    await create({ name: 'Copy', kind, subtype, branch_id: 3, catalog_template_key: 'platform.custom', content: { items: [] } });
    expect(apiMock.post).toHaveBeenCalledWith('/tenant/builder/templates/', expect.objectContaining({ kind, subtype, branch_id: 3 }));
    expect(apiMock.post.mock.calls[0][1]).not.toHaveProperty('catalog_template_key');
    expect(apiMock.post.mock.calls[0][1]).not.toHaveProperty('document');
  });
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

    if (_kind === "document") {
      expect(apiMock.post).toHaveBeenCalledWith(
        "/tenant/builder/templates/",
        expect.objectContaining({ kind: "document", subtype: "contract", name: "Created Template" })
      );
      expect(apiMock.put).toHaveBeenCalledWith(
        "/tenant/builder/templates/42/draft/",
        expect.objectContaining({
          lock_version: 2,
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
    } else {
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
    }
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
      subject: "Your estimate from {{Company.name}}",
      body_html: "<p>Hello {{Customer.first_name}}</p>",
      body: "Contact {{Customer.email}}",
      branch: 8,
      is_active: true,
    });

    expect(apiMock.post).toHaveBeenCalledWith(
      "/tenant/communications/templates/",
      expect.objectContaining({
        name: "Estimate Follow-up",
        channel: "email",
        subject: "Your estimate from {{company.name}}",
        body_html: "<p>Hello {{customer.first_name}}</p>",
        body_text: "Contact {{customer.email}}",
        branch_id: 8,
        is_active: true,
      })
    );
  });

  it("normalizes legacy company tokens when updating a communication template", async () => {
    await updateCommunicationTemplate(17, {
      channel: "email",
      subject: "Welcome {{Company.name}}",
      body_html: "<p>{{Company.name}}: {{Customer.name}}</p>",
      body: "Call {{Company.phone}}",
    });

    expect(apiMock.patch).toHaveBeenCalledWith(
      "/tenant/communications/templates/17/",
      expect.objectContaining({
        subject: "Welcome {{company.name}}",
        body_html: "<p>{{company.name}}: {{customer.name}}</p>",
        body_text: "Call {{branch.phone}}",
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
    expect(apiMock.put).toHaveBeenCalledWith(
      "/tenant/builder/templates/42/draft/",
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
    expect(apiMock.put).toHaveBeenCalledWith(
      "/tenant/builder/templates/42/draft/",
      expect.objectContaining({
        document: expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              blocks: expect.arrayContaining([expect.objectContaining({ type: "signature" })]),
            }),
          ]),
        }),
      })
    );
  });

  it.each([
    ["unexpected legacy value", "unrecognized_document_kind", "custom"],
    ["case and whitespace variations", "  VALUATION_WAIVER  ", "valuation_waiver"],
  ])("sends an accepted Builder subtype for %s", async (_label, templateType, expectedSubtype) => {
    await createDocumentTemplate({
      name: "Subtype normalization",
      template_type: templateType,
    });

    expect(apiMock.post).toHaveBeenCalledWith(
      "/tenant/builder/templates/",
      expect.objectContaining({ kind: "document", subtype: expectedSubtype })
    );
  });

  it("normalizes legacy document preset merge tokens to backend variable names", async () => {
    await createDocumentTemplate({
      name: "Legacy BOL",
      template_type: "bol",
      html_content: "{{Company.primary_phone}} {{Opportunity.sales_number}} {{OriginAddress.full_address}}",
    });

    expect(apiMock.put).toHaveBeenCalledWith(
      "/tenant/builder/templates/42/draft/",
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

  it("archives a newly-created empty template when its initial content save fails", async () => {
    apiMock.post.mockResolvedValueOnce({ data: { id: 42, draft_revision: { lock_version: 1 } } });
    apiMock.put.mockRejectedValueOnce({ response: { status: 422, data: { detail: "Invalid document." } } });
    apiMock.delete.mockResolvedValueOnce({ status: 204 });

    await expect(createDocumentTemplate({
      name: "Invalid Contract", kind: "document", subtype: "contract", content: { sections: [] },
    })).rejects.toMatchObject({ response: { status: 422 } });
    expect(apiMock.delete).toHaveBeenCalledWith("/tenant/builder/templates/42/");
  });

  it("loads Builder document templates with the registered branch_id filter", async () => {
    apiMock.get.mockResolvedValue({
      data: { count: 1, results: [{ id: 6, kind: "document", subtype: "contract", state: "active", branch_id: 3 }] },
    });
    const response = await getDocumentTemplates({ kind: "document", branch: "3", state: "active" });
    expect(apiMock.get).toHaveBeenCalledWith("/tenant/builder/templates/", {
      params: { kind: "document", branch_id: "3", state: "active" },
    });
    expect(response.data.results[0]).toMatchObject({ template_type: "contract", branch: 3, is_active: true });
  });

  it("adapts legacy sales template filters to the Builder list contract", async () => {
    apiMock.get.mockResolvedValue({ data: { count: 0, results: [] } });
    await getDocumentTemplates({ template_type: "credit_card_authorization", is_active: "true", branch: 3 });
    expect(apiMock.get).toHaveBeenCalledWith("/tenant/builder/templates/", {
      params: { kind: "document", subtype: "cc_authorization", state: "active", branch_id: 3 },
    });
  });

  it("starts a missing draft before saving content and passes branch context", async () => {
    apiMock.patch.mockResolvedValue({ data: { id: 42, name: "Updated", subtype: "contract", state: "active" } });
    apiMock.get.mockRejectedValue({ response: { status: 404 } });
    apiMock.post.mockResolvedValue({ data: { revision: { lock_version: 1 } } });
    apiMock.put.mockResolvedValue({ data: { revision: { lock_version: 2 } } });

    await updateDocumentTemplate(42, {
      name: "Updated",
      kind: "document",
      subtype: "contract",
      content: { items: [] },
      lock_version: 1,
      branch: 3,
    });

    expect(apiMock.patch).toHaveBeenCalledWith("/tenant/builder/templates/42/", {
      name: "Updated", subtype: "contract",
    });
    expect(apiMock.get).toHaveBeenCalledWith("/tenant/builder/templates/42/draft/", { params: { branch_id: 3 } });
    expect(apiMock.post).toHaveBeenCalledWith("/tenant/builder/templates/42/draft/", {}, { params: { branch_id: 3 } });
    expect(apiMock.put).toHaveBeenCalledWith("/tenant/builder/templates/42/draft/", {
      lock_version: 1, document: expect.any(Object),
    });
  });

  it("reuses the existing draft and optimistic lock version", async () => {
    apiMock.patch.mockResolvedValue({ data: { id: 42, name: "Updated", subtype: "contract", state: "active" } });
    apiMock.get.mockResolvedValue({ data: { revision: { lock_version: 7 } } });
    apiMock.put.mockResolvedValue({ data: { revision: { lock_version: 8 } } });
    await updateDocumentTemplate(42, {
      name: "Updated", kind: "document", subtype: "contract", document: { sections: [] },
    });
    expect(apiMock.post).not.toHaveBeenCalled();
    expect(apiMock.put).toHaveBeenCalledWith("/tenant/builder/templates/42/draft/", {
      lock_version: 7, document: { sections: [] },
    });
  });

  it("uses registered Builder archive, variable, preview, and catalog endpoints", async () => {
    apiMock.delete.mockResolvedValue({ status: 204 });
    apiMock.get.mockResolvedValue({ data: [] });
    apiMock.post.mockResolvedValue({ data: { id: 42 } });
    await deleteDocumentTemplate(42);
    await getDocumentVariableRegistry("document", 3);
    await getBuilderCatalog({ kind: "document", branch_id: 3 });
    await getBuilderCatalog({ kind: "communication", branch_id: 3 });
    await installBuilderCatalogTemplate("starter.contract", { kind: "document", branch_id: 3, name: "Copy" });
    await previewDocumentTemplate(42, {
      source: { type: "opportunity", id: 55 }, format: "both", branch_id: 3,
    });
    expect(apiMock.delete).toHaveBeenCalledWith("/tenant/builder/templates/42/");
    expect(apiMock.get).toHaveBeenCalledWith("/tenant/builder/variables/", {
      params: { kind: "document", branch_id: 3 },
    });
    expect(apiMock.get).toHaveBeenCalledWith("/tenant/builder/catalog/", {
      params: { kind: "document", branch_id: 3 },
    });
    expect(apiMock.get).toHaveBeenCalledWith("/tenant/communications/catalog/", {
      params: { kind: "communication", branch_id: 3 },
    });
    expect(apiMock.post).toHaveBeenCalledWith("/tenant/builder/catalog/starter.contract/install/", {
      kind: "document", branch_id: 3, name: "Copy",
    });
    expect(apiMock.post).toHaveBeenCalledWith("/tenant/builder/templates/42/preview/", {
      document: undefined,
      source: { type: "opportunity", id: 55 },
      audience: "customer",
      format: "both",
    }, { params: { branch_id: 3 } });
  });

  it("infers invoice kind from invoice scope when the subtype is a specific invoice type", async () => {
    await createDocumentTemplate({ name: "Deposit", scope_type: "invoice", subtype: "deposit" });
    expect(apiMock.post).toHaveBeenCalledWith("/tenant/builder/templates/", expect.objectContaining({
      kind: "invoice", subtype: "deposit",
    }));
  });
});
