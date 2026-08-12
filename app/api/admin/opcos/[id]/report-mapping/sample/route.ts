/**
 * POST — Admin portal.
 * Upload sample Excel for an OpCo and extract column headers.
 */

import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import { uploadOpcoReportMappingSample } from "@/lib/admin/opco-report-mappings";
import { jsonError, unauthorized } from "@/lib/errors/respond";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { id } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Upload an Excel file in the file field" },
        { status: 400 },
      );
    }
    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      return NextResponse.json(
        { error: "File must be an Excel workbook (.xlsx)" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mapping = await uploadOpcoReportMappingSample({
      opcoIdRaw: id,
      actorUserId: BigInt(user.id),
      filename: file.name,
      mimeType:
        file.type ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer,
    });

    return NextResponse.json({ data: mapping });
  } catch (error) {
    return jsonError(error);
  }
}
