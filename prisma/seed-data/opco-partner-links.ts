import { dedupeLinks, type SeedLink } from "./helpers";

const RAW_LINKS: SeedLink[] = [
  // zain-kuwait (11)
  ...[
    "apple",
    "google",
    "netflix",
    "spotify",
    "epic-games",
    "riot-games",
    "supercell",
    "adjust",
    "appsflyer",
    "infobip",
    "sinch",
  ].map((partnerSlug) => ({ opcoSlug: "zain-kuwait", partnerSlug })),

  // zain-ksa (20)
  ...[
    "apple",
    "google",
    "netflix",
    "spotify",
    "bytedance",
    "tencent-games",
    "garena",
    "supercell",
    "epic-games",
    "riot-games",
    "ubisoft",
    "electronic-arts",
    "unity",
    "adjust",
    "appsflyer",
    "braze",
    "infobip",
    "bango",
    "fortumo",
    "docomo-digital",
  ].map((partnerSlug) => ({ opcoSlug: "zain-ksa", partnerSlug })),

  // zain-iraq (8)
  ...[
    "apple",
    "google",
    "netflix",
    "anghami",
    "adjust",
    "infobip",
    "sinch",
    "tencent-cloud",
  ].map((partnerSlug) => ({ opcoSlug: "zain-iraq", partnerSlug })),

  // zain-jordan (14)
  ...[
    "apple",
    "google",
    "netflix",
    "spotify",
    "deezer",
    "anghami",
    "digital-virgo",
    "adjust",
    "appsflyer",
    "infobip",
    "sinch",
    "omantel",
    "aduna",
    "meta",
  ].map((partnerSlug) => ({ opcoSlug: "zain-jordan", partnerSlug })),

  // zain-bahrain (10)
  ...[
    "apple",
    "google",
    "netflix",
    "spotify",
    "adjust",
    "infobip",
    "sinch",
    "aduna",
    "stripe",
    "paypal",
  ].map((partnerSlug) => ({ opcoSlug: "zain-bahrain", partnerSlug })),

  // zain-sudan (6)
  ...["google", "netflix", "anghami", "infobip", "sinch", "fortumo"].map(
    (partnerSlug) => ({ opcoSlug: "zain-sudan", partnerSlug }),
  ),

  // zain-south-sudan (5)
  ...["google", "netflix", "infobip", "sinch", "onesignal"].map(
    (partnerSlug) => ({ opcoSlug: "zain-south-sudan", partnerSlug }),
  ),
];

export const OPCO_PARTNER_LINK_SEEDS = dedupeLinks(RAW_LINKS);
