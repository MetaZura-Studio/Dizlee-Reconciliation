/**
 * DTOs for Admin OpCo per-service regulatory fee screens.
 */

export type OpcoRegulatoryFeeRow = {
  id: string;
  serviceName: string;
  serviceKey: string;
  partnerId: string;
  partnerName: string;
  regulatoryFeePercent: number;
};

export type OpcoRegulatoryFeesPage = {
  opcoId: string;
  opcoName: string;
  rows: OpcoRegulatoryFeeRow[];
};

export type OpcoRegulatoryFeeImportIssue = {
  rowNumber: number;
  message: string;
};
