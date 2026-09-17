/**
 * OpCo → Admin report-map request copy and subject helpers.
 */

export const REPORT_MAP_REQUEST_SUBJECT_PREFIX = "Report map request:";

export function reportMapRequestSubject(opcoName: string): string {
  return `${REPORT_MAP_REQUEST_SUBJECT_PREFIX} ${opcoName.trim()}`;
}

export function formatReportMapRequestBody(params: {
  opcoName: string;
  message?: string | null;
}): string {
  const lines = [
    `Report map is not configured for ${params.opcoName}.`,
    "They requested mapping so they can upload monthly reports.",
  ];
  const message = params.message?.trim();
  if (message) {
    lines.push("", `Note from OpCo: ${message}`);
  }
  return lines.join("\n");
}

export const REPORT_MAP_READY_SUBJECT = "Report mapping is ready";

export function formatReportMapReadyBody(opcoName: string): string {
  return [
    `Report map for ${opcoName} is configured.`,
    "You can upload your monthly report now.",
  ].join("\n");
}
