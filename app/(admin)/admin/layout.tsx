import { AdminAuthProvider } from "@/components/admin/admin-auth-provider";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
