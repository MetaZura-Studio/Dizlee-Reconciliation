import { redirect } from "next/navigation";

import { DizleeWorkspace } from "@/components/dizlee/dizlee-workspace";
import { requireDizleeSession } from "@/lib/dizlee/auth";
import { getUnreadInboxCount } from "@/lib/dizlee/notifications/inbox";

export default async function DizleeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireDizleeSession();
  if (!user) {
    redirect("/login?callbackUrl=/dizlee");
  }

  const unreadCount = await getUnreadInboxCount(user.id);

  return (
    <DizleeWorkspace
      name={user.name ?? null}
      email={user.email}
      unreadCount={unreadCount}
    >
      {children}
    </DizleeWorkspace>
  );
}
