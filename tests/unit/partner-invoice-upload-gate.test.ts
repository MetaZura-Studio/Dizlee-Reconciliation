import { beforeEach, describe, expect, it, vi } from "vitest";

const mockedPartnerFindFirst = vi.fn();
const mockedCurrencyFindFirst = vi.fn();
const mockedInvoiceFindFirst = vi.fn();
const mockedGetPartnerLookupId = vi.fn();

vi.mock("@/lib/prisma", () => ({
  default: {
    partner: {
      findFirst: (...args: unknown[]) => mockedPartnerFindFirst(...args),
    },
    currency: {
      findFirst: (...args: unknown[]) => mockedCurrencyFindFirst(...args),
    },
    invoice: {
      findFirst: (...args: unknown[]) => mockedInvoiceFindFirst(...args),
      create: vi.fn(),
    },
  },
  prisma: {
    partner: {
      findFirst: (...args: unknown[]) => mockedPartnerFindFirst(...args),
    },
    currency: {
      findFirst: (...args: unknown[]) => mockedCurrencyFindFirst(...args),
    },
    invoice: {
      findFirst: (...args: unknown[]) => mockedInvoiceFindFirst(...args),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/partner/lookups", () => ({
  getPartnerLookupId: (...args: unknown[]) => mockedGetPartnerLookupId(...args),
}));

vi.mock("@/lib/partner/storage/save-invoice-file", () => ({
  saveInvoiceFileLocally: vi.fn(),
}));

vi.mock("@/lib/platform/audit-log", () => ({
  writePlatformAuditLog: vi.fn(),
}));

vi.mock("@/lib/platform/notify-dizlee", () => ({
  notifyDizleeUsers: vi.fn(),
}));

import {
  createPartnerInvoice,
  InvoiceUploadError,
} from "@/lib/partner/queries/upload-invoice";

describe("createPartnerInvoice invoice-upload gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetPartnerLookupId.mockResolvedValue(1);
    mockedCurrencyFindFirst.mockResolvedValue({ id: 1 });
  });

  it("rejects when invoice upload is disabled", async () => {
    mockedPartnerFindFirst.mockResolvedValue({
      name: "Acme",
      invoiceUploadEnabled: false,
    });

    await expect(
      createPartnerInvoice({
        partnerId: BigInt(1),
        userId: BigInt(2),
        metadata: { year: 2026, month: 10 },
        filename: "inv.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4"),
      }),
    ).rejects.toMatchObject({
      name: "InvoiceUploadError",
      key: "PARTNER_INVOICE_UPLOAD_DISABLED",
      status: 403,
    });

    expect(mockedInvoiceFindFirst).not.toHaveBeenCalled();
  });

  it("continues past gate when enabled (fails later on missing lookups if stubbed)", async () => {
    mockedPartnerFindFirst.mockResolvedValue({
      name: "Acme",
      invoiceUploadEnabled: true,
    });
    mockedInvoiceFindFirst.mockResolvedValue({ id: BigInt(99) });

    await expect(
      createPartnerInvoice({
        partnerId: BigInt(1),
        userId: BigInt(2),
        metadata: { year: 2026, month: 10 },
        filename: "inv.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4"),
      }),
    ).rejects.toBeInstanceOf(InvoiceUploadError);

    expect(mockedInvoiceFindFirst).toHaveBeenCalled();
  });
});
