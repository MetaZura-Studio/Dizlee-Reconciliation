import prisma from "@/lib/prisma";

export type OpcoReportListItem = {
  id: string;
  partnerName: string;
  year: number;
  month: number;
  statusLabel: string;
  statusCode: string;
  uploadedAt: string;
  hasPendingChangeRequest: boolean;
};

export async function listReportsForOpco(
  opcoId: bigint,
): Promise<OpcoReportListItem[]> {
  const reports = await prisma.report.findMany({
    where: { opcoId },
    orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
    include: {
      partner: { select: { name: true } },
      status: { select: { code: true, label: true } },
      changeRequests: {
        where: { decidedAt: null },
        select: { id: true },
        take: 1,
      },
    },
  });

  return reports.map((report) => ({
    id: report.id.toString(),
    partnerName: report.partner.name,
    year: report.year,
    month: report.month,
    statusLabel: report.status.label,
    statusCode: report.status.code,
    uploadedAt: report.createdAt.toISOString(),
    hasPendingChangeRequest: report.changeRequests.length > 0,
  }));
}
