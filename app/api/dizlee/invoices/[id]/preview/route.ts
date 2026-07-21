import { NextResponse } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { prisma } from "@/lib/prisma";
import { readStoredObject } from "@/lib/platform/storage/object-storage";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: BigInt(id) },
      include: { file: true },
    });

    if (!invoice?.file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    try {
      const buffer = await readStoredObject(invoice.file.storageKey);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": invoice.file.mimeType ?? "application/octet-stream",
          "Content-Disposition": `inline; filename="${invoice.file.filename}"`,
        },
      });
    } catch {
      return NextResponse.json(
        { error: "Invoice file is not available in storage." },
        { status: 404 },
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load invoice preview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
