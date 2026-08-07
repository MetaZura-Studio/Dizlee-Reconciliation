/**
 * Partner list item DTO and status label helper for Admin organization screens.
 */
export type AdminEntityStatus = "ACTIVE" | "INACTIVE";

export type PartnerListItem = {
  id: string;
  name: string;
  status: AdminEntityStatus;
  statusLabel: string;
  userCount: number;
};

export function formatEntityStatusLabel(status: AdminEntityStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "INACTIVE":
      return "Inactive";
  }
}
