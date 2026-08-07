/**
 * OpCo–partner lane matrix from the Zain OpCo/Partner roster.
 * Raw pairs are deduped before export as `OPCO_PARTNER_LINK_SEEDS`.
 */

import { dedupeLinks, type SeedLink } from "./helpers";

const RAW_LINKS: SeedLink[] = [
  // zain-kuwait (30)
  ...[
    "arpuplus",
    "boku",
    "constantconcept",
    "dharam",
    "digitalvirgo",
    "dotconvertecs",
    "dv-amea",
    "eklectic",
    "futuratechnologies",
    "infomedia",
    "intech",
    "marvel-media",
    "mdg",
    "media-ranch",
    "mediaworld",
    "mobibase",
    "mobilearts",
    "mobimind",
    "newry",
    "nextboom",
    "numbase",
    "nxtvas",
    "onmobile",
    "qadisha-group",
    "renxo",
    "sammedia",
    "sigma",
    "tangerine",
    "teliacom",
    "track-mobile",
  ].map((partnerSlug) => ({ opcoSlug: "zain-kuwait", partnerSlug })),

  // zain-ksa (23)
  ...[
    "anghami",
    "arpuplus",
    "centili",
    "ddp",
    "dharam",
    "digitalvirgo",
    "ebtikar",
    "eklectic",
    "futuratechnologies",
    "gamemine",
    "google",
    "infomedia",
    "intech",
    "kgroup",
    "marvel-media",
    "media-ranch",
    "mobilearts",
    "newry",
    "nextboom",
    "novustech",
    "osn",
    "playhera",
    "starzplay",
  ].map((partnerSlug) => ({ opcoSlug: "zain-ksa", partnerSlug })),

  // zain-jordan (8)
  ...[
    "arpuplus",
    "digitalvirgo",
    "dotconvertecs",
    "futuratechnologies",
    "gamemine",
    "marvel-media",
    "nxtvas",
    "qadisha-group",
  ].map((partnerSlug) => ({ opcoSlug: "zain-jordan", partnerSlug })),

  // zain-iraq (25)
  ...[
    "albawaba",
    "alhorizon",
    "blackbox",
    "centili",
    "constantconcept",
    "crosure",
    "ddp",
    "digitalizehub",
    "digitalvirgo",
    "docomo-digital",
    "dotconvertecs",
    "gamemine",
    "infomedia",
    "jivamob",
    "marvel-media",
    "mdg",
    "media-ranch",
    "mobibase",
    "mobibox",
    "mobimind",
    "nextboom",
    "parajoy",
    "qadisha-group",
    "sammedia",
    "tangerine",
  ].map((partnerSlug) => ({ opcoSlug: "zain-iraq", partnerSlug })),

  // zain-bahrain (20)
  ...[
    "arpuplus",
    "boku",
    "crowdmedia",
    "digitalvirgo",
    "dotconvertecs",
    "eklectic",
    "futuratechnologies",
    "gamemine",
    "infomedia",
    "intech",
    "marvel-media",
    "mobibase",
    "newry",
    "numbase",
    "nxtvas",
    "osn",
    "qadisha-group",
    "sammedia",
    "sigma",
    "tangerine",
  ].map((partnerSlug) => ({ opcoSlug: "zain-bahrain", partnerSlug })),

  // zain-sudan (3)
  ...[
    "arpuplus",
    "digitalvirgo",
    "mobibox",
  ].map((partnerSlug) => ({ opcoSlug: "zain-sudan", partnerSlug })),

  // zain-south-sudan (0)
  // no partners yet
];

export const OPCO_PARTNER_LINK_SEEDS = dedupeLinks(RAW_LINKS);
