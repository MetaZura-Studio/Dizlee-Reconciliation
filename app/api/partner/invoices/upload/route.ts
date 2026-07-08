import { NextResponse } from "next/server";

import { getPartnerSession } from "@/lib/partner/auth";
import {
  InvoiceUploadError,
  createPartnerInvoice,
} from "@/lib/partner/queries/upload-invoice";
import {
  parseInvoiceLineItemsJson,
  partnerInvoiceUploadMetadataSchema,
  validateInvoiceUploadFile,
} from "@/lib/partner/validation/invoice-upload";

export async function POST(request: Request) {
  const session = await getPartnerSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    let lineItems: unknown = [];
    const lineItemsRaw = formData.get("lineItems");

    if (typeof lineItemsRaw === "string" && lineItemsRaw.length > 0) {
      try {
        lineItems = parseInvoiceLineItemsJson(lineItemsRaw);
      } catch {
        return NextResponse.json({ error: "Invalid line items JSON" }, { status: 400 });
      }
    }

    const metadataResult = partnerInvoiceUploadMetadataSchema.safeParse({
      opcoId: formData.get("opcoId"),
      year: formData.get("year"),
      month: formData.get("month"),
      invoiceNumber: formData.get("invoiceNumber") || undefined,
      lineItems,
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
      file instanceof File ? validateInvoiceUploadFile(file) : "Invoice PDF is required";

    if (fileError) {
      return NextResponse.json({ error: fileError }, { status: 400 });
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
    if (error instanceof InvoiceUploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Partner invoice upload failed", error);
    return NextResponse.json({ error: "Failed to upload invoice" }, { status: 500 });
  }
}
