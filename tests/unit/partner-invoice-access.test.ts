import { beforeEach, describe, expect, it, vi } from "vitest";

const mockedPartnerFindFirst = vi.fn();
const mockedPartnerFindMany = vi.fn();
const mockedPartnerUpdate = vi.fn();
const mockedPartnerUpdateMany = vi.fn();
const mockedPartnerCount = vi.fn();
const mockedSendBroadcast = vi.fn();
const mockedWriteAudit = vi.fn();
const mockedGetCurrentPeriod = vi.fn(() => ({ month: 10, year: 2026 }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    partner: {
      findFirst: (...args: unknown[]) => mockedPartnerFindFirst(...args),
      findMany: (...args: unknown[]) => mockedPartnerFindMany(...args),
      update: (...args: unknown[]) => mockedPartnerUpdate(...args),
      updateMany: (...args: unknown[]) => mockedPartnerUpdateMany(...args),
      count: (...args: unknown[]) => mockedPartnerCount(...args),
    },
  },
}));

vi.mock("@/lib/dizlee/notifications/intimations", () => ({
  sendBroadcastNotification: (...args: unknown[]) =>
    mockedSendBroadcast(...args),
}));

vi.mock("@/lib/platform/audit-log", () => ({
  writePlatformAuditLog: (...args: unknown[]) => mockedWriteAudit(...args),
}));

vi.mock("@/lib/platform/period", () => ({
  getCurrentPeriod: () => mockedGetCurrentPeriod(),
}));

vi.mock("@/lib/platform/format-datetime", () => ({
  formatAppDateTime: () => "28 Oct 2026, 12:00",
}));

import {
  bulkSetPartnerInvoiceUploadEnabled,
  listPartnerInvoiceAccess,
  PARTNER_INVOICE_UPLOAD_OPEN_TEMPLATE_CODE,
  setPartnerInvoiceUploadEnabled,
} from "@/lib/dizlee/partner-invoice-access";
import { parsePartnerInvoiceAccessFilters } from "@/lib/dizlee/partner-invoice-access.shared";
import {
  filterPartnerIdsWithInvoiceUploadEnabled,
  getPartnerInvoiceUploadEnabled,
} from "@/lib/platform/partner-invoice-upload-access";

describe("partner invoice upload access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("notifies partner only on false → true", async () => {
    mockedPartnerFindFirst.mockResolvedValue({
      id: BigInt(7),
      name: "Acme",
      invoiceUploadEnabled: false,
      updatedAt: new Date("2026-10-28T00:00:00.000Z"),
    });
    mockedPartnerUpdate.mockResolvedValue({
      id: BigInt(7),
      name: "Acme",
      invoiceUploadEnabled: true,
      updatedAt: new Date("2026-10-28T12:00:00.000Z"),
    });
    mockedSendBroadcast.mockResolvedValue({ id: "1" });

    const result = await setPartnerInvoiceUploadEnabled({
      partnerId: "7",
      enabled: true,
      actorUserId: "1",
    });

    expect(result.invoiceUploadEnabled).toBe(true);
    expect(mockedSendBroadcast).toHaveBeenCalledTimes(1);
    expect(mockedSendBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          audience: "partner",
          partnerIds: ["7"],
          messageSource: PARTNER_INVOICE_UPLOAD_OPEN_TEMPLATE_CODE,
        }),
      }),
    );
    expect(mockedWriteAudit).toHaveBeenCalledTimes(1);
  });

  it("does not notify when already enabled", async () => {
    mockedPartnerFindFirst.mockResolvedValue({
      id: BigInt(7),
      name: "Acme",
      invoiceUploadEnabled: true,
      updatedAt: new Date("2026-10-28T00:00:00.000Z"),
    });

    await setPartnerInvoiceUploadEnabled({
      partnerId: "7",
      enabled: true,
      actorUserId: "1",
    });

    expect(mockedPartnerUpdate).not.toHaveBeenCalled();
    expect(mockedSendBroadcast).not.toHaveBeenCalled();
    expect(mockedWriteAudit).not.toHaveBeenCalled();
  });

  it("does not notify when disabling", async () => {
    mockedPartnerFindFirst.mockResolvedValue({
      id: BigInt(7),
      name: "Acme",
      invoiceUploadEnabled: true,
      updatedAt: new Date("2026-10-28T00:00:00.000Z"),
    });
    mockedPartnerUpdate.mockResolvedValue({
      id: BigInt(7),
      name: "Acme",
      invoiceUploadEnabled: false,
      updatedAt: new Date("2026-10-28T12:00:00.000Z"),
    });

    await setPartnerInvoiceUploadEnabled({
      partnerId: "7",
      enabled: false,
      actorUserId: "1",
    });

    expect(mockedSendBroadcast).not.toHaveBeenCalled();
    expect(mockedWriteAudit).toHaveBeenCalledTimes(1);
  });

  it("getPartnerInvoiceUploadEnabled reads flag", async () => {
    mockedPartnerFindFirst.mockResolvedValue({
      invoiceUploadEnabled: false,
    });
    await expect(getPartnerInvoiceUploadEnabled(BigInt(3))).resolves.toBe(
      false,
    );

    mockedPartnerFindFirst.mockResolvedValue({
      invoiceUploadEnabled: true,
    });
    await expect(getPartnerInvoiceUploadEnabled(BigInt(3))).resolves.toBe(true);
  });

  it("filterPartnerIdsWithInvoiceUploadEnabled keeps enabled only", async () => {
    mockedPartnerFindMany.mockResolvedValue([{ id: BigInt(2) }]);
    const result = await filterPartnerIdsWithInvoiceUploadEnabled([
      "1",
      "2",
      "bad",
    ]);
    expect(result).toEqual(["2"]);
    expect(mockedPartnerFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          invoiceUploadEnabled: true,
        }),
      }),
    );
  });

  it("parses status and sort filters", () => {
    expect(
      parsePartnerInvoiceAccessFilters(
        new URLSearchParams("status=closed&sortBy=updatedAt&sortDir=desc"),
      ),
    ).toEqual({
      search: undefined,
      status: "closed",
      sortBy: "updatedAt",
      sortDir: "desc",
      page: 1,
    });
  });

  it("lists with status filter and updatedAt sort", async () => {
    mockedPartnerCount.mockResolvedValue(1);
    mockedPartnerFindMany.mockResolvedValue([
      {
        id: BigInt(3),
        name: "Acme",
        invoiceUploadEnabled: false,
        updatedAt: new Date("2026-10-28T00:00:00.000Z"),
      },
    ]);

    const result = await listPartnerInvoiceAccess({
      page: 1,
      status: "closed",
      sortBy: "updatedAt",
      sortDir: "desc",
    });

    expect(result.totalCount).toBe(1);
    expect(result.filters.status).toBe("closed");
    expect(mockedPartnerFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isDeleted: false,
          invoiceUploadEnabled: false,
        }),
        orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      }),
    );
  });

  it("bulk opens closed partners and notifies once", async () => {
    mockedPartnerFindMany.mockResolvedValue([
      { id: BigInt(1), name: "A" },
      { id: BigInt(2), name: "B" },
    ]);
    mockedPartnerUpdateMany.mockResolvedValue({ count: 2 });
    mockedSendBroadcast.mockResolvedValue({ id: "1" });

    const result = await bulkSetPartnerInvoiceUploadEnabled({
      enabled: true,
      status: "closed",
      actorUserId: "9",
    });

    expect(result).toEqual({
      enabled: true,
      updatedCount: 2,
      notifiedCount: 2,
    });
    expect(mockedPartnerUpdateMany).toHaveBeenCalled();
    expect(mockedSendBroadcast).toHaveBeenCalledTimes(1);
    expect(mockedSendBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          partnerIds: ["1", "2"],
          messageSource: PARTNER_INVOICE_UPLOAD_OPEN_TEMPLATE_CODE,
        }),
      }),
    );
  });

  it("bulk close does not notify", async () => {
    mockedPartnerFindMany.mockResolvedValue([{ id: BigInt(1), name: "A" }]);
    mockedPartnerUpdateMany.mockResolvedValue({ count: 1 });

    const result = await bulkSetPartnerInvoiceUploadEnabled({
      enabled: false,
      actorUserId: "9",
    });

    expect(result.updatedCount).toBe(1);
    expect(result.notifiedCount).toBe(0);
    expect(mockedSendBroadcast).not.toHaveBeenCalled();
  });
});
