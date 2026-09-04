/**
 * Format/parse in-app "Partner link request" notifications (OpCo → Admin/Dizlee).
 * Prefer `metadataJson` (`PARTNER_LINK_REQUEST`) for opcoId; body is human-readable only.
 */

import type { UnlinkedPartnersInFile } from "@/lib/opco/unlinked-partners-in-file.shared";

export const PARTNER_LINK_REQUEST_SUBJECT_PREFIX = "Partner link request:";

export type PartnerLinkRequestRecord = UnlinkedPartnersInFile & {
  opcoId: string;
  periodLabel: string;
  message: string;
};

export type PartnerLinkRequestView = PartnerLinkRequestRecord & {
  id: string;
  createdAt: string;
  subject: string;
};

export function partnerLinkRequestSubject(opcoName: string): string {
  return `${PARTNER_LINK_REQUEST_SUBJECT_PREFIX} ${opcoName.trim()}`;
}

/** @deprecated Kept for parsing older notification bodies. */
export function partnerLinkRequestBodyPrefix(opcoId: string): string {
  return `[opcoId=${opcoId}]`;
}

/** Hide machine markers (e.g. `[opcoId=2]`) from inbox previews and detail. */
export function stripPartnerLinkRequestMachinePrefix(body: string): string {
  return body.replace(/^\s*\[opcoId=\d+\]\s*\n?/, "").trim();
}

function joinNames(names: string[]): string {
  if (names.length === 0) {
    return "—";
  }
  const previewLimit = 40;
  if (names.length <= previewLimit) {
    return names.join(", ");
  }
  const rest = names.length - previewLimit;
  return `${names.slice(0, previewLimit).join(", ")} … and ${rest} more`;
}

export function formatPartnerLinkRequestBody(
  record: PartnerLinkRequestRecord,
): string {
  const partners = [
    ...record.unlinkedPartnerNames,
    ...record.unknownPartnerNames,
  ].filter((name) => name.trim());
  return [
    `Period: ${record.periodLabel}`,
    `Partners not linked: ${joinNames(partners)}`,
    "",
    record.message.trim(),
  ].join("\n");
}

function namesFromLine(line: string, label: string): string[] {
  const prefix = `${label}: `;
  if (!line.startsWith(prefix)) {
    return [];
  }
  const rest = line.slice(prefix.length).trim();
  if (!rest || rest === "—") {
    return [];
  }
  return rest
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

export function parsePartnerLinkRequestBody(
  body: string,
): PartnerLinkRequestRecord | null {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  let offset = 0;
  let opcoId = "";
  const idMatch = /^\[opcoId=(\d+)\]$/.exec((lines[0] ?? "").trim());
  if (idMatch) {
    opcoId = idMatch[1] ?? "";
    offset = 1;
  }

  const periodLine = lines[offset] ?? "";
  const periodLabel = periodLine.startsWith("Period: ")
    ? periodLine.slice("Period: ".length).trim()
    : "";
  const combined = namesFromLine(lines[offset + 1] ?? "", "Partners not linked");
  const unlinkedPartnerNames =
    combined.length > 0
      ? combined
      : namesFromLine(lines[offset + 1] ?? "", "Unlinked partners");
  const unknownPartnerNames =
    combined.length > 0
      ? []
      : namesFromLine(lines[offset + 2] ?? "", "Unknown names");
  const messageStart =
    combined.length > 0
      ? lines[offset + 2] === ""
        ? offset + 3
        : offset + 2
      : lines[offset + 3] === ""
        ? offset + 4
        : offset + 3;
  const message = lines.slice(messageStart).join("\n").trim();

  if (!periodLabel || !message) {
    return null;
  }

  return {
    opcoId,
    periodLabel,
    unlinkedPartnerNames,
    unknownPartnerNames,
    message,
  };
}
