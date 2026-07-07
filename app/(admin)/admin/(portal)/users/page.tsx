import { UsersView } from "@/components/admin/users-view";
import { listUsers, parseUserListFilters } from "@/lib/admin/users";

type AdminUsersPageProps = {
  searchParams: Promise<{
    search?: string;
    role?: string;
    status?: string;
    sortBy?: string;
    sortDir?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      query.set(key, value);
    }
  }

  const initialResult = await listUsers(parseUserListFilters(query));

  return <UsersView initialResult={initialResult} />;
}
