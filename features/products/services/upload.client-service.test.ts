import { afterEach, describe, expect, it, vi } from "vitest";

import { uploadProductImage } from "./upload.client-service";

function mockFetchSequence(responses: Array<Partial<Response>>) {
  const spy = vi.spyOn(globalThis, "fetch");
  for (const res of responses) {
    spy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
      ...res,
    } as Response);
  }
  return spy;
}

function fakeFile(name = "image.png", type = "image/png"): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type });
}

describe("uploadProductImage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("happy path -> returns publicUrl and issues PUT to presigned URL", async () => {
    // Arrange
    const spy = mockFetchSequence([
      {
        ok: true,
        json: async () => ({
          presignedUrl: "https://s3.test/upload?sig=x",
          publicUrl: "https://cdn.test/image.png",
        }),
      } as Response,
      { ok: true } as Response,
    ]);

    // Act
    const result = await uploadProductImage(fakeFile());

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.publicUrl).toBe("https://cdn.test/image.png");

    expect(spy).toHaveBeenNthCalledWith(1, "/api/admin/upload/presign", expect.objectContaining({ method: "POST" }));
    expect(spy).toHaveBeenNthCalledWith(
      2,
      "https://s3.test/upload?sig=x",
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("presign non-200 with problem body -> returns problem from API", async () => {
    // Arrange
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        type: "/problems/validation-error",
        status: 400,
        title: "File too large",
      }),
    } as Response);

    // Act
    const result = await uploadProductImage(fakeFile());

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problem.title).toBe("File too large");
  });

  it("S3 PUT failure -> returns internal problem", async () => {
    // Arrange
    mockFetchSequence([
      {
        ok: true,
        json: async () => ({
          presignedUrl: "https://s3.test/upload",
          publicUrl: "https://cdn.test/image.png",
        }),
      } as Response,
      { ok: false, status: 500 } as Response,
    ]);

    // Act
    const result = await uploadProductImage(fakeFile());

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problem.status).toBe(500);
  });
});
