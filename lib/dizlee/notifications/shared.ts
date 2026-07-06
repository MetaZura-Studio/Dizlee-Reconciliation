const BODY_PREVIEW_LENGTH = 120;

export function trimNotificationPreview(body: string): string {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (normalized.length <= BODY_PREVIEW_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, BODY_PREVIEW_LENGTH - 1)}…`;
}

export type RecipientTypeCode = "OPCO" | "PARTNER" | "USER";

export type RecipientSummary = {
  opcoCount: number;
  partnerCount: number;
  userCount: number;
  labels: string[];
};

export async function summarizeRecipients(
  recipients: Array<{
    recipientType: { code: string };
    recipientId: bigint;
  }>,
  loaders: {
    opcoNames: Map<string, string>;
    partnerNames: Map<string, string>;
    userNames: Map<string, string>;
  },
): Promise<RecipientSummary> {
  let opcoCount = 0;
  let partnerCount = 0;
  let userCount = 0;
  const labels: string[] = [];

  for (const recipient of recipients) {
    const id = recipient.recipientId.toString();
    const code = recipient.recipientType.code as RecipientTypeCode;

    if (code === "OPCO") {
      opcoCount += 1;
      const name = loaders.opcoNames.get(id);
      if (name) {
        labels.push(name);
      }
    } else if (code === "PARTNER") {
      partnerCount += 1;
      const name = loaders.partnerNames.get(id);
      if (name) {
        labels.push(name);
      }
    } else if (code === "USER") {
      userCount += 1;
      const name = loaders.userNames.get(id);
      if (name) {
        labels.push(name);
      }
    }
  }

  return { opcoCount, partnerCount, userCount, labels };
}

export function formatRecipientSummary(summary: RecipientSummary): string {
  if (summary.labels.length > 0) {
    return summary.labels.join(", ");
  }

  const parts: string[] = [];
  if (summary.opcoCount > 0) {
    parts.push(`${summary.opcoCount} OpCo${summary.opcoCount === 1 ? "" : "s"}`);
  }
  if (summary.partnerCount > 0) {
    parts.push(
      `${summary.partnerCount} Partner${summary.partnerCount === 1 ? "" : "s"}`,
    );
  }
  if (summary.userCount > 0) {
    parts.push(`${summary.userCount} user${summary.userCount === 1 ? "" : "s"}`);
  }

  return parts.join(", ") || "No recipients";
}
