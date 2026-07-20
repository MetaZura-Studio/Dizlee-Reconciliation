import type { Prisma } from "@prisma/client";

import { writeNotificationAuditLog } from "@/lib/admin/audit";
import type {
  EmailTemplateCategory,
  EmailTemplateDetail,
  EmailTemplateListItem,
  EmailTemplateVersionItem,
} from "@/lib/admin/email-templates.shared";
import {
  getPlaceholdersForTemplate,
  normalizeEmailTemplateCategory,
} from "@/lib/admin/email-templates.shared";
import {
  createEmailTemplateSchema,
  revertEmailTemplateSchema,
  saveEmailTemplateSchema,
  type CreateEmailTemplateInput,
  type RevertEmailTemplateInput,
  type SaveEmailTemplateInput,
} from "@/lib/admin/validation/email-templates";
import { prisma } from "@/lib/prisma";

export type {
  EmailTemplateCategory,
  EmailTemplateDetail,
  EmailTemplateListItem,
  EmailTemplateVersionItem,
  EmailTemplatesPageData,
} from "@/lib/admin/email-templates.shared";

export {
  categoryLabel,
  getPlaceholdersForTemplate,
} from "@/lib/admin/email-templates.shared";

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
      category: true,
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
  category: string;
  subject: string;
  body: string;
}): Promise<EmailTemplateDetail> {
  const category = normalizeEmailTemplateCategory(template.category, template.code);
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
    category,
    subject: template.subject,
    body: template.body,
    currentVersion,
    placeholders: getPlaceholdersForTemplate(template.code, category),
    versions: versions.map(mapVersionRow),
  };
}

export async function listEmailTemplates(): Promise<EmailTemplateListItem[]> {
  const templates = await prisma.notificationTemplate.findMany({
    where: { isDeleted: false },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      category: true,
      subject: true,
    },
  });

  const items = await Promise.all(
    templates.map(async (template) => {
      const category = normalizeEmailTemplateCategory(
        template.category,
        template.code,
      );
      const currentVersion = await getMaxVersion(template.id);
      return {
        code: template.code,
        name: template.name,
        category,
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

async function resolveActiveStatusId(): Promise<number> {
  const status = await prisma.lookup.findFirst({
    where: {
      code: "ACTIVE",
      lookupType: { code: "USER_STATUS" },
    },
    select: { id: true },
  });

  if (!status) {
    throw new EmailTemplateError("Active status lookup is missing", 500);
  }

  return status.id;
}

export async function createEmailTemplate(
  rawInput: CreateEmailTemplateInput,
  actorUserId: bigint,
): Promise<EmailTemplateDetail> {
  const parsed = createEmailTemplateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new EmailTemplateError(
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const { name, code, category, subject, body, changeNote } = parsed.data;

  const existing = await prisma.notificationTemplate.findFirst({
    where: { code },
    select: { id: true, isDeleted: true },
  });

  if (existing && !existing.isDeleted) {
    throw new EmailTemplateError(
      `A template with code ${code} already exists.`,
      409,
    );
  }

  if (existing?.isDeleted) {
    throw new EmailTemplateError(
      `Template code ${code} was previously retired and cannot be reused.`,
      409,
    );
  }

  const statusId = await resolveActiveStatusId();

  const template = await prisma.notificationTemplate.create({
    data: {
      code,
      name,
      category: category as EmailTemplateCategory,
      subject,
      body,
      statusId,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
    },
  });

  await prisma.emailTemplateVersion.create({
    data: {
      notificationTemplateId: template.id,
      version: 1,
      subject,
      body,
      changeNote: changeNote ?? "Initial version",
      createdByUserId: actorUserId,
    },
  });

  await writeNotificationAuditLog({
    actorUserId,
    action: "EMAIL_TEMPLATE_UPDATED",
    notificationTemplateId: BigInt(template.id),
    message: `Email template ${code} created.`,
    metadata: {
      code,
      category,
      version: 1,
      changeNote: changeNote ?? "Initial version",
    },
  });

  return getEmailTemplate(code);
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
  const currentVersion = await getMaxVersion(template.id);

  if (parsed.data.version === currentVersion) {
    throw new EmailTemplateError("That version is already live.");
  }

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

  await prisma.$transaction([
    prisma.notificationTemplate.update({
      where: { id: template.id },
      data: {
        subject: sourceVersion.subject,
        body: sourceVersion.body,
        updatedByUserId: actorUserId,
      },
    }),
    prisma.emailTemplateVersion.deleteMany({
      where: {
        notificationTemplateId: template.id,
        version: { gt: sourceVersion.version },
      },
    }),
  ]);

  await writeNotificationAuditLog({
    actorUserId,
    action: "EMAIL_TEMPLATE_UPDATED",
    notificationTemplateId: BigInt(template.id),
    message: `Email template ${template.code} reverted to version ${sourceVersion.version}.`,
    metadata: {
      code: template.code,
      version: sourceVersion.version,
      revertedFromVersion: currentVersion,
      changeNote: buildRevertChangeNote(sourceVersion.version),
    },
  });

  return getEmailTemplate(template.code);
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
