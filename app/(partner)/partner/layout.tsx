import { Sidebar } from "@/components/partner/Sidebar";
import { requirePartnerSession } from "@/lib/partner/auth";

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePartnerSession();

  return (
    <div className="flex min-h-screen">
      <Sidebar email={session.email} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
