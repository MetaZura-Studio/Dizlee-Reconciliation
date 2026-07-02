type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-zinc-600">{description}</p>
      <p className="text-sm text-zinc-500">Coming soon.</p>
    </div>
  );
}
