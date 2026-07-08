/** Active OpCo–Partner links only (BR-1). Import from any portal read path. */
export const ACTIVE_OPCO_PARTNER_LINK_FILTER = {
  isDeleted: false,
} as const;

export const RESERVED_OPCO_NAMES = ["opco_all", "opco all"] as const;

export function isLinkableOpcoName(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return !RESERVED_OPCO_NAMES.includes(
    normalized as (typeof RESERVED_OPCO_NAMES)[number],
  );
}

export type LinkDiffResult = {
  toActivate: string[];
  toSoftDelete: string[];
  added: number;
  removed: number;
};

export function computeLinkDiff(params: {
  allPartnerIds: string[];
  currentlyLinkedIds: string[];
  selectedPartnerIds: string[];
}): LinkDiffResult {
  const selected = new Set(params.selectedPartnerIds);
  const currentlyLinked = new Set(params.currentlyLinkedIds);

  const toActivate = params.allPartnerIds.filter((id) => selected.has(id));
  const toSoftDelete = [...currentlyLinked].filter((id) => !selected.has(id));

  const added = toActivate.filter((id) => !currentlyLinked.has(id)).length;
  const removed = toSoftDelete.length;

  return { toActivate, toSoftDelete, added, removed };
}
