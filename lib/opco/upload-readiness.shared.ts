/**
 * Client-safe OpCo upload readiness DTO.
 */

export type OpcoUploadReadiness = {
  mappingConfigured: boolean;
  pendingRequest: boolean;
};
