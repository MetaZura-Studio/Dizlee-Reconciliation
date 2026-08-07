/**
 * Generic placeholder screen for admin routes not yet implemented.
 * Shows a consistent empty or coming-soon state within the admin shell.
 */

type AdminPlaceholderPageProps = {
  title: string;
  description: string;
};

export function AdminPlaceholderPage({
  title,
  description,
}: AdminPlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-foreground-muted">{description}</p>
      <p className="text-sm text-foreground-subtle">Module coming soon.</p>
    </div>
  );
}
