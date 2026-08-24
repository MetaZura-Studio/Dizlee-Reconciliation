/**
 * Path traversal guards for local object storage keys.
 */

import { describe, expect, it } from "vitest";

import { ObjectStorageError } from "@/lib/platform/storage/object-storage";

// Test the guard indirectly via readStoredObject when not on Vercel/Blob.
// Force local path by ensuring blob is disabled in this unit environment.

describe("object storage path safety", () => {
  it("rejects traversal keys before touching disk", async () => {
    const { readStoredObject } = await import(
      "@/lib/platform/storage/object-storage"
    );

    await expect(readStoredObject("../etc/passwd")).rejects.toBeInstanceOf(
      ObjectStorageError,
    );
    await expect(
      readStoredObject("reports/../../etc/passwd"),
    ).rejects.toBeInstanceOf(ObjectStorageError);
    await expect(readStoredObject("/etc/passwd")).rejects.toBeInstanceOf(
      ObjectStorageError,
    );
    await expect(
      readStoredObject("not-a-folder/uuid/file.xlsx"),
    ).rejects.toBeInstanceOf(ObjectStorageError);
  });
});
