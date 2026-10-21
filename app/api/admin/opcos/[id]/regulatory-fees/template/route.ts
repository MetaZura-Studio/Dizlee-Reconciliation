/**
 * GET — Admin portal.
 * Download Excel template (current services + fee %) for an OpCo.
 */

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import { buildOpcoRegulatoryFeesTemplate } from "@/lib/admin/opco-regulatory-fees";
import { jsonError, unauthorized } from "@/lib/errors/respond";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { id } = await context.params;
    const { filename, buffer } = await buildOpcoRegulatoryFeesTemplate(id);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
