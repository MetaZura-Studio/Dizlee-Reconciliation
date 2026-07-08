import type { Prisma } from "@prisma/client";

import { writeNotificationAuditLog } from "@/lib/admin/audit";
import type {
  EmailTemplateDetail,
  EmailTemplateListItem,
  EmailTemplateVersionItem,
} from "@/lib/admin/email-templates.shared";
import { getPlaceholdersForTemplate } from "@/lib/admin/email-templates.shared";
import {
  revertEmailTemplateSchema,
  saveEmailTemplateSchema,
  type RevertEmailTemplateInput,
  type SaveEmailTemplateInput,
} from "@/lib/admin/validation/email-templates";
import { prisma } from "@/lib/prisma";

export type {
  EmailTemplateDetail,
  EmailTemplateListItem,
  EmailTemplateVersionItem,
  EmailTemplatesPageData,
} from "@/lib/admin/email-templates.shared";

export { getPlaceholdersForTemplate } from "@/lib/admin/email-templates.shared";

export class EmailTemplateError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "EmailTemplateError";
    this.status = status;
  }
}

export function getNextTemplateVersion(currentMaxVersion: number): number {
  return currentMaxVersion + 1;
}

export function buildRevertChangeNote(version: number): string {
  return `Reverted to version ${version}`;
}

async function getTemplateRowByCode(code: string) {
  const template = await prisma.notificationTemplate.findFirst({
    where: { code, isDeleted: false },
    select: {
      id: true,
      code: true,
      name: true,
      subject: true,
      body: true,
    },
  });

  if (!template) {
    throw new EmailTemplateError("Email template not found", 404);
  }

  return template;
}

async function getMaxVersion(notificationTemplateId: number): Promise<number> {
  const latest = await prisma.emailTemplateVersion.findFirst({
    where: { notificationTemplateId },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  return latest?.version ?? 0;
}

function mapVersionRow(row: {
  version: number;
  subject: string;
  body: string;
  changeNote: string | null;
  createdAt: Date;
}): EmailTemplateVersionItem {
  return {
    version: row.version,
    subject: row.subject,
    body: row.body,
    changeNote: row.changeNote,
    createdAt: row.createdAt.toISOString(),
  };
}

async function buildTemplateDetail(template: {
  id: number;
  code: string;
  name: string;
  subject: string;
  body: string;
}): Promise<EmailTemplateDetail> {
  const versions = await prisma.emailTemplateVersion.findMany({
    where: { notificationTemplateId: template.id },
    orderBy: { version: "desc" },
    select: {
      version: true,
      subject: true,
      body: true,
      changeNote: true,
      createdAt: true,
    },
  });

  const currentVersion = versions[0]?.version ?? 0;

  return {
    code: template.code,
    name: template.name,
    subject: template.subject,
    body: template.body,
    currentVersion,
    placeholders: getPlaceholdersForTemplate(template.code),
    versions: versions.map(mapVersionRow),
  };
}

export async function listEmailTemplates(): Promise<EmailTemplateListItem[]> {
  const templates = await prisma.notificationTemplate.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      subject: true,
    },
  });

  const items = await Promise.all(
    templates.map(async (template) => {
      const currentVersion = await getMaxVersion(template.id);
      return {
        code: template.code,
        name: template.name,
        subject: template.subject,
        currentVersion,
      };
    }),
  );

  return items;
}

export async function getEmailTemplate(code: string): Promise<EmailTemplateDetail> {
  const template = await getTemplateRowByCode(code);
  return buildTemplateDetail(template);
}

async function persistTemplateVersion(params: {
  notificationTemplateId: number;
  templateCode: string;
  version: number;
  subject: string;
  body: string;
  changeNote: string | null;
  actorUserId: bigint;
  auditMessage: string;
  auditMetadata: Prisma.InputJsonValue;
}): Promise<EmailTemplateDetail> {
  await prisma.$transaction([
    prisma.emailTemplateVersion.create({
      data: {
        notificationTemplateId: params.notificationTemplateId,
        version: params.version,
        subject: params.subject,
        body: params.body,
        changeNote: params.changeNote,
        createdByUserId: params.actorUserId,
      },
    }),
    prisma.notificationTemplate.update({
      where: { id: params.notificationTemplateId },
      data: {
        subject: params.subject,
        body: params.body,
        updatedByUserId: params.actorUserId,
      },
    }),
  ]);

  await writeNotificationAuditLog({
    actorUserId: params.actorUserId,
    action: "EMAIL_TEMPLATE_UPDATED",
    notificationTemplateId: BigInt(params.notificationTemplateId),
    message: params.auditMessage,
    metadata: params.auditMetadata,
  });

  return getEmailTemplate(params.templateCode);
}

export async function saveEmailTemplate(
  code: string,
  rawInput: SaveEmailTemplateInput,
  actorUserId: bigint,
): Promise<EmailTemplateDetail> {
  const parsed = saveEmailTemplateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new EmailTemplateError(
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const template = await getTemplateRowByCode(code);
  const nextVersion = getNextTemplateVersion(await getMaxVersion(template.id));

  return persistTemplateVersion({
    notificationTemplateId: template.id,
    templateCode: template.code,
    version: nextVersion,
    subject: parsed.data.subject,
    body: parsed.data.body,
    changeNote: parsed.data.changeNote,
    actorUserId,
    auditMessage: `Email template ${template.code} updated.`,
    auditMetadata: {
      code: template.code,
      version: nextVersion,
      changeNote: parsed.data.changeNote,
    },
  });
}

export async function revertEmailTemplate(
  code: string,
  rawInput: RevertEmailTemplateInput,
  actorUserId: bigint,
): Promise<EmailTemplateDetail> {
  const parsed = revertEmailTemplateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new EmailTemplateError(
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const template = await getTemplateRowByCode(code);
  const sourceVersion = await prisma.emailTemplateVersion.findFirst({
    where: {
      notificationTemplateId: template.id,
      version: parsed.data.version,
    },
    select: {
      version: true,
      subject: true,
      body: true,
    },
  });

  if (!sourceVersion) {
    throw new EmailTemplateError("Template version not found", 404);
  }

  const nextVersion = getNextTemplateVersion(await getMaxVersion(template.id));
  const changeNote = buildRevertChangeNote(sourceVersion.version);

  return persistTemplateVersion({
    notificationTemplateId: template.id,
    templateCode: template.code,
    version: nextVersion,
    subject: sourceVersion.subject,
    body: sourceVersion.body,
    changeNote,
    actorUserId,
    auditMessage: `Email template ${template.code} reverted to version ${sourceVersion.version}.`,
    auditMetadata: {
      code: template.code,
      version: nextVersion,
      revertedFromVersion: sourceVersion.version,
      changeNote,
    },
  });
}

export async function getEmailTemplatesPageData(
  selectedCode?: string,
): Promise<{
  templates: EmailTemplateListItem[];
  selected: EmailTemplateDetail | null;
}> {
  const templates = await listEmailTemplates();
  if (templates.length === 0) {
    return { templates, selected: null };
  }

  const code = selectedCode?.trim() || templates[0]?.code;
  if (!code) {
    return { templates, selected: null };
  }

  const selected = await getEmailTemplate(code);
  return { templates, selected };
}
