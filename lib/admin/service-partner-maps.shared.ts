/**
 * Service–Partner map list DTO for Admin screens.
 */
export type ServicePartnerMapListItem = {
  id: string;
  opcoId: string;
  opcoName: string;
  serviceName: string;
  serviceKey: string;
  partnerId: string;
  partnerName: string;
  regulatoryFeePercent: number;
  partnerRsPercent: number;
};

export type ServicePartnerMapImportIssue = {
  rowNumber: number;
  message: string;
};
