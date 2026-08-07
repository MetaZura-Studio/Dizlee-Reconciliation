/**
 * Placeholder content for partner routes not yet built.
 * Maintains consistent layout inside the partner workspace.
 */

type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-foreground-muted">{description}</p>
      <p className="text-sm text-foreground-subtle">Coming soon.</p>
    </div>
  );
}
