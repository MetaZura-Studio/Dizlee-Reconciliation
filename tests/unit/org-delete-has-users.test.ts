import { beforeEach, describe, expect, it, vi } from "vitest";

const mockedOpcoFindFirst = vi.fn();
const mockedOpcoUpdate = vi.fn();
const mockedPartnerFindFirst = vi.fn();
const mockedPartnerUpdate = vi.fn();
const mockedUserCount = vi.fn();
const mockedWriteOpcoAuditLog = vi.fn();
const mockedWritePartnerAuditLog = vi.fn();

vi.mock("@/lib/prisma", () => ({
  default: {
    opco: {
      findFirst: (...args: unknown[]) => mockedOpcoFindFirst(...args),
      update: (...args: unknown[]) => mockedOpcoUpdate(...args),
    },
    partner: {
      findFirst: (...args: unknown[]) => mockedPartnerFindFirst(...args),
      update: (...args: unknown[]) => mockedPartnerUpdate(...args),
    },
    user: {
      count: (...args: unknown[]) => mockedUserCount(...args),
    },
  },
  prisma: {
    opco: {
      findFirst: (...args: unknown[]) => mockedOpcoFindFirst(...args),
      update: (...args: unknown[]) => mockedOpcoUpdate(...args),
    },
    partner: {
      findFirst: (...args: unknown[]) => mockedPartnerFindFirst(...args),
      update: (...args: unknown[]) => mockedPartnerUpdate(...args),
    },
    user: {
      count: (...args: unknown[]) => mockedUserCount(...args),
    },
  },
}));

vi.mock("@/lib/admin/audit", () => ({
  writeOpcoAuditLog: (...args: unknown[]) => mockedWriteOpcoAuditLog(...args),
  writePartnerAuditLog: (...args: unknown[]) =>
    mockedWritePartnerAuditLog(...args),
}));

import { deleteOpco, OpcoActionError } from "@/lib/admin/opcos";
import { deletePartner, PartnerActionError } from "@/lib/admin/partners";
import { formatAppError } from "@/lib/errors/format";

describe("deleteOpco user gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedOpcoFindFirst.mockResolvedValue({ id: BigInt(1), name: "Zain JO" });
  });

  it("rejects delete when the OpCo has users", async () => {
    mockedUserCount.mockResolvedValueOnce(2);

    await expect(deleteOpco("1", BigInt(99))).rejects.toMatchObject({
      name: "OpcoActionError",
      key: "OPCO_HAS_USERS",
      status: 409,
    });
    expect(mockedOpcoUpdate).not.toHaveBeenCalled();
    expect(mockedWriteOpcoAuditLog).not.toHaveBeenCalled();
  });

  it("allows delete when the OpCo has no users", async () => {
    mockedUserCount.mockResolvedValueOnce(0);
    mockedOpcoUpdate.mockResolvedValueOnce({});

    await expect(deleteOpco("1", BigInt(99))).resolves.toBeUndefined();
    expect(mockedOpcoUpdate).toHaveBeenCalled();
    expect(mockedWriteOpcoAuditLog).toHaveBeenCalled();
  });
});

describe("deletePartner user gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPartnerFindFirst.mockResolvedValue({
      id: BigInt(2),
      name: "Spotify",
    });
  });

  it("rejects delete when the Partner has users", async () => {
    mockedUserCount.mockResolvedValueOnce(1);

    await expect(deletePartner("2", BigInt(99))).rejects.toMatchObject({
      name: "PartnerActionError",
      key: "PARTNER_HAS_USERS",
      status: 409,
    });
    expect(mockedPartnerUpdate).not.toHaveBeenCalled();
  });

  it("allows delete when the Partner has no users", async () => {
    mockedUserCount.mockResolvedValueOnce(0);
    mockedPartnerUpdate.mockResolvedValueOnce({});

    await expect(deletePartner("2", BigInt(99))).resolves.toBeUndefined();
    expect(mockedPartnerUpdate).toHaveBeenCalled();
    expect(mockedWritePartnerAuditLog).toHaveBeenCalled();
  });
});

describe("org has-users client message", () => {
  it("surfaces a clear message for delete modals", () => {
    expect(
      formatAppError(
        { error: { key: "OPCO_HAS_USERS", message: "OPCO HAS USERS", code: 163 } },
        "Failed to delete OpCo",
      ),
    ).toBe("This organization has users and cannot be deleted.");

    expect(
      formatAppError(
        {
          error: {
            key: "PARTNER_HAS_USERS",
            message: "PARTNER HAS USERS",
            code: 164,
          },
        },
        "Failed to delete Partner",
      ),
    ).toBe("This organization has users and cannot be deleted.");
  });

  it("maps free-text OpCo delete errors", () => {
    expect(() => {
      throw new OpcoActionError(
        "This organization has users and cannot be deleted.",
      );
    }).toThrow(OpcoActionError);

    try {
      throw new OpcoActionError(
        "This OpCo has users and cannot be deleted.",
      );
    } catch (error) {
      expect(error).toMatchObject({ key: "OPCO_HAS_USERS", status: 409 });
    }

    try {
      throw new PartnerActionError(
        "This Partner has users and cannot be deleted.",
      );
    } catch (error) {
      expect(error).toMatchObject({ key: "PARTNER_HAS_USERS", status: 409 });
    }
  });
});
