/**
 * Format/parse in-app "Partner link request" notifications (OpCo → Admin/Dizlee).
 * First line is machine-readable so Admin can list requests per OpCo without a new table.
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

export function partnerLinkRequestBodyPrefix(opcoId: string): string {
  return `[opcoId=${opcoId}]`;
}

function joinNames(names: string[]): string {
  return names.length > 0 ? names.join(", ") : "—";
}

export function formatPartnerLinkRequestBody(
  record: PartnerLinkRequestRecord,
): string {
  const partners = [
    ...record.unlinkedPartnerNames,
    ...record.unknownPartnerNames,
  ].filter((name) => name.trim());
  return [
    partnerLinkRequestBodyPrefix(record.opcoId),
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
  const idLine = lines[0] ?? "";
  const match = /^\[opcoId=(\d+)\]$/.exec(idLine.trim());
  if (!match) {
    return null;
  }

  const periodLine = lines[1] ?? "";
  const periodLabel = periodLine.startsWith("Period: ")
    ? periodLine.slice("Period: ".length).trim()
    : "";
  const combined = namesFromLine(lines[2] ?? "", "Partners not linked");
  const unlinkedPartnerNames =
    combined.length > 0
      ? combined
      : namesFromLine(lines[2] ?? "", "Unlinked partners");
  const unknownPartnerNames =
    combined.length > 0
      ? []
      : namesFromLine(lines[3] ?? "", "Unknown names");
  const messageStart =
    combined.length > 0
      ? lines[3] === ""
        ? 4
        : 3
      : lines[4] === ""
        ? 5
        : 4;
  const message = lines.slice(messageStart).join("\n").trim();

  if (!periodLabel || !message) {
    return null;
  }

  return {
    opcoId: match[1],
    periodLabel,
    unlinkedPartnerNames,
    unknownPartnerNames,
    message,
  };
}
