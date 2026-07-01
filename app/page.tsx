import Link from "next/link";

const portals = [
  {
    name: "Admin Portal",
    href: "/admin",
    owner: "Hussnain",
    description: "Users, settings, audit logs, and platform configuration.",
  },
  {
    name: "Partner Portal",
    href: "/partner",
    owner: "Hussnain",
    description: "Report uploads, invoices, and partner dashboard.",
  },
  {
    name: "OpCo Portal",
    href: "/opco",
    owner: "Shahrukh",
    description: "OpCo reconciliation workflows.",
  },
  {
    name: "Dizlee Portal",
    href: "/dizlee",
    owner: "Haseeb",
    description: "Dizlee reconciliation workflows.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-3xl space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Dizlee Reconciliation Platform
          </h1>
          <p className="text-zinc-600">
            Multi-portal reconciliation platform. Select a portal to continue.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {portals.map((portal) => (
            <Link
              key={portal.href}
              href={portal.href}
              className="rounded-lg border border-zinc-200 p-5 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
            >
              <h2 className="font-medium">{portal.name}</h2>
              <p className="mt-1 text-sm text-zinc-500">{portal.description}</p>
              <p className="mt-3 text-xs text-zinc-400">Owned by {portal.owner}</p>
            </Link>
          ))}
        </div>

        <p className="text-center text-sm text-zinc-500">
          <Link href="/login" className="underline hover:text-zinc-800">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
