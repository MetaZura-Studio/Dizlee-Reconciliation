import { redirect } from "next/navigation";

import { ADMIN_DEFAULT_ROUTE } from "@/lib/admin/navigation";

export default function AdminIndexPage() {
  redirect(ADMIN_DEFAULT_ROUTE);
}
