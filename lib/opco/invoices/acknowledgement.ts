/**
 * OpCo auto-acknowledgment rule for Dizlee-issued CLIENT_TO_OPCO invoices.
 *
 * Portal: OpCo. First view of a SENT invoice triggers acknowledgment in invoice queries.
 */

/** True when opening the invoice detail should transition SENT → ACKNOWLEDGED. */
export function shouldAutoAcknowledgeOpcoInvoice(
  invoiceTypeCode: string,
  invoiceStatusCode: string,
): boolean {
  return invoiceTypeCode === "CLIENT_TO_OPCO" && invoiceStatusCode === "SENT";
}
