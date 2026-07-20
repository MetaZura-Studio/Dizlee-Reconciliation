type StatusTone = "success" | "warning" | "info" | "danger" | "neutral";

export function reportStatusTone(code: string): StatusTone {
  switch (code.toUpperCase()) {
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "danger";
    case "PENDING":
    case "CHANGE_REQUESTED":
      return "warning";
    case "SUBMITTED":
    case "RESUBMITTED":
      return "info";
    default:
      return "neutral";
  }
}

export function invoiceStatusTone(code: string): StatusTone {
  switch (code.toUpperCase()) {
    case "ACKNOWLEDGED":
    case "PAID":
    case "SETTLED":
      return "success";
    case "SENT":
      return "info";
    case "DRAFT":
      return "warning";
    default:
      return "neutral";
  }
}

export function paymentLabelTone(label: string): StatusTone {
  const normalized = label.toLowerCase();
  if (normalized === "paid") {
    return "success";
  }
  if (normalized === "unpaid" || normalized === "overdue" || normalized === "pending") {
    return "warning";
  }
  return "neutral";
}

export function submissionStatusTone(
  status: "submitted" | "missing" | "change_requested" | "pending",
): StatusTone {
  switch (status) {
    case "submitted":
      return "success";
    case "missing":
      return "danger";
    case "change_requested":
    case "pending":
      return "warning";
    default:
      return "neutral";
  }
}
