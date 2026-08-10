/**
 * POST — Partner portal.
 * Upload and register a new partner invoice file.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { getPartnerSession } from "@/lib/partner/auth";
import { createPartnerInvoice } from "@/lib/partner/queries/upload-invoice";
import {
  partnerInvoiceUploadMetadataSchema,
  validateInvoiceUploadFile,
} from "@/lib/partner/validation/invoice-upload";
import { storageDiagnostics } from "@/lib/platform/storage/object-storage";

export async function POST(request: Request) {
  const session = await getPartnerSession();

  if (!session) {
    return unauthorized();
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    const metadataResult = partnerInvoiceUploadMetadataSchema.safeParse({
      year: formData.get("year"),
      month: formData.get("month"),
      invoiceNumber: formData.get("invoiceNumber") || undefined,
    });

    if (!metadataResult.success) {
      return NextResponse.json(
        {
          error: "Invalid upload details",
          details: metadataResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const fileError =
      file instanceof File
        ? validateInvoiceUploadFile(file)
        : "Invoice PDF is required";

    if (fileError) {
      return jsonError(appErrorFromUnknown(fileError, 400));
    }

    const uploadFile = file as File;
    const buffer = Buffer.from(await uploadFile.arrayBuffer());
    const result = await createPartnerInvoice({
      partnerId: BigInt(session.partnerId),
      userId: BigInt(session.userId),
      metadata: metadataResult.data,
      filename: uploadFile.name,
      mimeType: uploadFile.type || "application/pdf",
      buffer,
    });

    return NextResponse.json({
      invoiceId: result.invoiceId,
      message: "Invoice uploaded successfully",
    });
  } catch (error) {
    return jsonError(error, { storage: storageDiagnostics() });
  }
}
