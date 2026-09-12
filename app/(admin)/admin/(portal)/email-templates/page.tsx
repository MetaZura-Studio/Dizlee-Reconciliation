import { EmailTemplatesView } from "@/components/admin/email-templates-view";
import {
  EmailTemplateError,
  getEmailTemplatesPageData,
} from "@/lib/admin/email-templates";

export default async function AdminEmailTemplatesPage() {
  let pageData: Awaited<ReturnType<typeof getEmailTemplatesPageData>> | null =
    null;
  let errorMessage: string | null = null;

  try {
    pageData = await getEmailTemplatesPageData();
  } catch (error) {
    console.error("[admin/email-templates]", error);
    errorMessage =
      error instanceof EmailTemplateError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Email templates could not be loaded.";
  }

  if (errorMessage) {
    return (
      <div className="w-full space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Email templates</h1>
        <p className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
          {errorMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <EmailTemplatesView
        initialData={{
          templates: pageData!.templates,
          selected: pageData!.selected,
        }}
      />
    </div>
  );
}
