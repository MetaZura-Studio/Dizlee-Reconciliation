/**
 * GET — Health portal.
 * Readiness check: process is up and database accepts a simple query.
 */

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { isBlobStorageConfigured } from "@/lib/platform/storage/object-storage";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return NextResponse.json(
      {
        status: "not_ready",
        checks: { database: "fail" },
      },
      { status: 503 },
    );
  }

  const onVercel = Boolean(process.env.VERCEL);
  const blobOk = !onVercel || isBlobStorageConfigured();

  if (!blobOk) {
    return NextResponse.json(
      {
        status: "not_ready",
        checks: { database: "ok", blob: "fail" },
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    status: "ready",
    checks: {
      database: "ok",
      blob: onVercel ? "ok" : "skipped",
    },
  });
}
