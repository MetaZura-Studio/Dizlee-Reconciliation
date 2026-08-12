/**
 * GET — Admin portal.
 * Download Excel template for Service–Partner map import.
 */

import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import { buildServicePartnerMapsTemplateBuffer } from "@/lib/admin/service-partner-maps-excel";
import { jsonError, unauthorized } from "@/lib/errors/respond";

export async function GET() {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const buffer = await buildServicePartnerMapsTemplateBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="service-partner-maps-template.xlsx"',
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
