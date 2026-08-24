/**
 * Unit tests for shared application error codes.
 */

import { describe, expect, it } from "vitest";

import { AppError, appError, systemError } from "@/lib/errors/app-error";
import {
  ERROR_CATALOG,
  isErrorKey,
  resolveErrorKeyFromMessage,
  type ErrorKey,
} from "@/lib/errors/catalog";
import { formatAppError } from "@/lib/errors/format";

describe("ERROR_CATALOG", () => {
  it("has unique numeric codes", () => {
    const codes = Object.values(ERROR_CATALOG).map((entry) => entry.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("uses 3-digit codes", () => {
    for (const entry of Object.values(ERROR_CATALOG)) {
      expect(entry.code).toBeGreaterThanOrEqual(100);
      expect(entry.code).toBeLessThanOrEqual(999);
    }
  });

  it("has unique keys", () => {
    const keys = Object.keys(ERROR_CATALOG);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("uses uppercase messages", () => {
    for (const [key, entry] of Object.entries(ERROR_CATALOG)) {
      expect(entry.message).toBe(entry.message.toUpperCase());
      expect(entry.message.length).toBeGreaterThan(0);
      expect(key).toMatch(/^[A-Z0-9_]+$/);
    }
  });
});

describe("resolveErrorKeyFromMessage", () => {
  it("maps legacy OpCo not found messages", () => {
    expect(resolveErrorKeyFromMessage("OpCo not found")).toBe("OPCO_NOT_FOUND");
    expect(resolveErrorKeyFromMessage("OpCo not found.")).toBe("OPCO_NOT_FOUND");
  });

  it("accepts catalog keys directly", () => {
    expect(isErrorKey("UNAUTHORIZED")).toBe(true);
    expect(resolveErrorKeyFromMessage("UNAUTHORIZED")).toBe("UNAUTHORIZED");
  });
});

describe("AppError", () => {
  it("builds payload from catalog", () => {
    const error = appError("OPCO_NOT_FOUND");
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe(ERROR_CATALOG.OPCO_NOT_FOUND.code);
    expect(error.message).toBe("OPCO NOT FOUND");
    expect(error.status).toBe(404);
    expect(error.statusCode).toBe(404);
    expect(error.toJSON()).toEqual({
      code: ERROR_CATALOG.OPCO_NOT_FOUND.code,
      key: "OPCO_NOT_FOUND",
      message: "OPCO NOT FOUND",
    });
  });

  it("systemError uses SYSTEM_ERROR", () => {
    const error = systemError(new Error("boom"));
    expect(error.key).toBe("SYSTEM_ERROR");
    expect(error.status).toBe(500);
  });
});

describe("formatAppError", () => {
  it("shows simple client message without codes", () => {
    expect(
      formatAppError({
        error: {
          code: ERROR_CATALOG.OPCO_NOT_FOUND.code,
          key: "OPCO_NOT_FOUND" as ErrorKey,
          message: "OPCO NOT FOUND",
        },
      }),
    ).toBe("Something went wrong. Please try again.");
  });

  it("prefers call-site fallback for uploads", () => {
    expect(
      formatAppError(
        {
          error: {
            code: ERROR_CATALOG.STORAGE_WRITE_FAILED.code,
            key: "STORAGE_WRITE_FAILED" as ErrorKey,
            message: "STORAGE WRITE FAILED",
          },
        },
        "Failed to upload report",
      ),
    ).toBe("Failed to upload report");
  });

  it("uses auth-specific copy for login failures", () => {
    expect(formatAppError("INVALID_CREDENTIALS")).toBe(
      "Login failed. Check your email and password.",
    );
    expect(
      formatAppError(
        { error: { key: "INVALID_CREDENTIALS", code: 100, message: "x" } },
        "Failed to sign in",
      ),
    ).toBe("Login failed. Check your email and password.");
  });

  it("formats legacy string errors via aliases", () => {
    expect(formatAppError({ error: "Unauthorized" })).toBe(
      "Please sign in to continue.",
    );
  });

  it("falls back for unknown input", () => {
    expect(formatAppError(null)).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("keeps free-text validation hints", () => {
    expect(
      formatAppError({
        error: "No Service–Partner map for service Music Streaming",
      }),
    ).toBe("No Service–Partner map for service Music Streaming");
  });
});
