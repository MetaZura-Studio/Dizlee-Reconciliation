/**
 * OpCo list item DTO and status label helper for Admin organization screens.
 */
export type AdminEntityStatus = "ACTIVE" | "INACTIVE";

export type OpcoListItem = {
  id: string;
  name: string;
  status: AdminEntityStatus;
  statusLabel: string;
  defaultCurrencyId: string;
  defaultCurrencyIso: string;
  vatPercent: number;
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
