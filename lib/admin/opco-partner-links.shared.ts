/**
 * OpCo–Partner link editor view types for Admin organization screens.
 */
export type OpcoListItem = {
  id: string;
  name: string;
};

export type PartnerLinkItem = {
  id: string;
  name: string;
  linked: boolean;
};

export type PartnerLinkRequestItem = {
  id: string;
  createdAt: string;
  periodLabel: string;
  message: string;
  unlinkedPartnerNames: string[];
  unknownPartnerNames: string[];
};

export type OpcoPartnerLinksView = {
  opco: OpcoListItem;
  partners: PartnerLinkItem[];
  linkedCount: number;
  totalPartners: number;
  recentLinkRequests: PartnerLinkRequestItem[];
};

export type OpcoPartnerLinksPageData = {
  opcos: OpcoListItem[];
  links: OpcoPartnerLinksView | null;
};
