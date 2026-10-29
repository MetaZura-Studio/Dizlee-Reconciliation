/**
 * Shared Partner invoice-upload gate reads (Dizlee toggle on partners.invoice_upload_enabled).
 */

import "server-only";

import { prisma } from "@/lib/prisma";

export async function getPartnerInvoiceUploadEnabled(
  partnerId: bigint,
): Promise<boolean> {
  const row = await prisma.partner.findFirst({
    where: { id: partnerId, isDeleted: false },
    select: { invoiceUploadEnabled: true },
  });
  return row?.invoiceUploadEnabled === true;
}

/** Keep only partners that currently allow invoice upload. */
export async function filterPartnerIdsWithInvoiceUploadEnabled(
  partnerIds: string[],
): Promise<string[]> {
  if (partnerIds.length === 0) {
    return [];
  }

  const ids = partnerIds
    .filter((id) => /^\d+$/.test(id))
    .map((id) => BigInt(id));
  if (ids.length === 0) {
    return [];
  }

  const rows = await prisma.partner.findMany({
    where: {
      id: { in: ids },
      isDeleted: false,
      invoiceUploadEnabled: true,
    },
    select: { id: true },
  });

  return rows.map((row) => row.id.toString());
}
