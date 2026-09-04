import { beforeEach, describe, expect, it, vi } from "vitest";

const mockedPartnerCreate = vi.fn();
const mockedPartnerUpdate = vi.fn();
const mockedGetLookupId = vi.fn();
const mockedWritePartnerAuditLog = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    partner: {
      create: (...args: unknown[]) => mockedPartnerCreate(...args),
      update: (...args: unknown[]) => mockedPartnerUpdate(...args),
    },
  },
}));

vi.mock("@/lib/admin/lookups", () => ({
  getLookupId: (...args: unknown[]) => mockedGetLookupId(...args),
}));

vi.mock("@/lib/admin/audit", () => ({
  writePartnerAuditLog: (...args: unknown[]) =>
    mockedWritePartnerAuditLog(...args),
  writeServicePartnerMapAuditLog: vi.fn(),
}));

import {
  ensurePartnerForMapImport,
  type ImportPartnerRef,
} from "@/lib/admin/service-partner-maps";

describe("ensurePartnerForMapImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetLookupId.mockResolvedValue(1);
    mockedWritePartnerAuditLog.mockResolvedValue(undefined);
  });

  it("reuses an existing active partner without writing", async () => {
    const partners: ImportPartnerRef[] = [
      { id: BigInt(10), name: "AlHorizon", isDeleted: false },
    ];

    const result = await ensurePartnerForMapImport(
      "AlHorizon",
      partners,
      BigInt(1),
    );

    expect(result).toEqual({
      partner: partners[0],
      created: false,
      restored: false,
    });
    expect(mockedPartnerCreate).not.toHaveBeenCalled();
    expect(mockedPartnerUpdate).not.toHaveBeenCalled();
  });

  it("creates a missing partner and appends it to the list", async () => {
    mockedPartnerCreate.mockResolvedValue({
      id: BigInt(42),
      name: "AlHorizon",
    });
    const partners: ImportPartnerRef[] = [];

    const result = await ensurePartnerForMapImport(
      "AlHorizon",
      partners,
      BigInt(7),
    );

    expect(result.created).toBe(true);
    expect(result.restored).toBe(false);
    expect(result.partner.id).toBe(BigInt(42));
    expect(partners).toHaveLength(1);
    expect(partners[0]?.name).toBe("AlHorizon");
    expect(mockedPartnerCreate).toHaveBeenCalled();
    expect(mockedWritePartnerAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PARTNER_CREATED",
        partnerId: BigInt(42),
      }),
    );
  });

  it("restores a soft-deleted partner match", async () => {
    mockedPartnerUpdate.mockResolvedValue({});
    const partners: ImportPartnerRef[] = [
      { id: BigInt(5), name: "AlHorizon", isDeleted: true },
    ];

    const result = await ensurePartnerForMapImport(
      "AlHorizon",
      partners,
      BigInt(3),
    );

    expect(result.created).toBe(false);
    expect(result.restored).toBe(true);
    expect(partners[0]?.isDeleted).toBe(false);
    expect(mockedPartnerUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: BigInt(5) },
        data: expect.objectContaining({
          isDeleted: false,
          deletedAt: null,
        }),
      }),
    );
    expect(mockedWritePartnerAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PARTNER_UPDATED",
        partnerId: BigInt(5),
      }),
    );
  });

  it("reuses a created partner on a later call in the same list", async () => {
    mockedPartnerCreate.mockResolvedValue({
      id: BigInt(42),
      name: "AlHorizon",
    });
    const partners: ImportPartnerRef[] = [];

    await ensurePartnerForMapImport("AlHorizon", partners, BigInt(1));
    const second = await ensurePartnerForMapImport(
      "AlHorizon",
      partners,
      BigInt(1),
    );

    expect(mockedPartnerCreate).toHaveBeenCalledTimes(1);
    expect(second.created).toBe(false);
    expect(second.partner.id).toBe(BigInt(42));
  });
});
