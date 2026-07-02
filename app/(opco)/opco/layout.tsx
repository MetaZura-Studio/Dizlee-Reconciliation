import { Sidebar } from "@/components/opco/Sidebar";
import { requireOpcoSession } from "@/lib/opco/auth";

export default async function OpcoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireOpcoSession();

  return (
    <div className="flex min-h-screen">
      <Sidebar email={session.email} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
