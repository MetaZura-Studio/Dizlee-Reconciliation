/**
 * POST — Admin portal.
 * Import Service–Partner mappings from Excel (upsert by service key).
 */

import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import { importServicePartnerMapsFromExcel } from "@/lib/admin/service-partner-maps";
import { jsonError, unauthorized } from "@/lib/errors/respond";

export async function POST(request: Request) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
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
    const result = await importServicePartnerMapsFromExcel(
      buffer,
      BigInt(user.id),
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    return jsonError(error);
  }
}
