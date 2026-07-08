export type OpcoListItem = {
  id: string;
  name: string;
};

export type PartnerLinkItem = {
  id: string;
  name: string;
  linked: boolean;
};

export type OpcoPartnerLinksView = {
  opco: OpcoListItem;
  partners: PartnerLinkItem[];
  linkedCount: number;
  totalPartners: number;
};

export type OpcoPartnerLinksPageData = {
  opcos: OpcoListItem[];
  links: OpcoPartnerLinksView | null;
};
