import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  delete: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("./axios", () => ({ default: apiMock }));

import {
  createBuilderRender,
  discardBuilderBlockDraft,
  getBuilderBlock,
  getBuilderCustomVariable,
  previewBuilderTemplate,
} from "./api";

describe("builder endpoint API wrappers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads one custom variable and one saved block", async () => {
    await getBuilderCustomVariable(17);
    await getBuilderBlock(23);

    expect(apiMock.get).toHaveBeenNthCalledWith(
      1,
      "/tenant/builder/variables/17/"
    );
    expect(apiMock.get).toHaveBeenNthCalledWith(
      2,
      "/tenant/builder/blocks/23/"
    );
  });

  it("discards a saved-block draft with DELETE", async () => {
    await discardBuilderBlockDraft(23);

    expect(apiMock.delete).toHaveBeenCalledWith(
      "/tenant/builder/blocks/23/draft/"
    );
  });

  it("requests PDF previews as blobs", async () => {
    const payload = { format: "pdf" };
    const config = { params: { branch_id: 3 } };

    await previewBuilderTemplate(42, payload, config);

    expect(apiMock.post).toHaveBeenCalledWith(
      "/tenant/builder/templates/42/preview/",
      payload,
      { params: { branch_id: 3 }, responseType: "blob" }
    );
  });

  it("accepts Axios request config for render idempotency headers", async () => {
    const payload = { template_id: 42, source: { type: "estimate", id: 9 } };
    const config = { headers: { "Idempotency-Key": "render-retry-key" } };

    await createBuilderRender(payload, config);

    expect(apiMock.post).toHaveBeenCalledWith(
      "/tenant/builder/renders/",
      payload,
      config
    );
  });
});
