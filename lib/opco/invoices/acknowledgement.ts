export function shouldAutoAcknowledgeOpcoInvoice(
  invoiceTypeCode: string,
  invoiceStatusCode: string,
): boolean {
  return invoiceTypeCode === "CLIENT_TO_OPCO" && invoiceStatusCode === "SENT";
}
