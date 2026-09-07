# Zain KSA — matched sample reports

Built from **live OpCo-lane reports** in the DB for this period.
Partner files use the same service names and USD amounts as recon FX rounding.

## Period
- Upload month/year: **09/2026** (9/2026)
- OpCo currency: **SAR**
- Admin SAR → USD rate: **0.26**
- Partner **Gross amount (LC)** is already USD (same rounding as recon)

## How to use
1. If OpCo already uploaded this period, skip the OpCo file (or use Report History reupload after approval).
2. Otherwise upload `opco/opco-zain-ksa-matched-sep26.xlsx` as OpCo `zain-ksa@dizlee.com` / `Password123!` for **09/2026**
3. Upload each Partner file below for the same OpCo + period
4. Dizlee recon should show **MATCHED** for every service

## Files

### OpCo
- `opco/opco-zain-ksa-matched-sep26.xlsx` — 21 rows across 10 partners

### Partners (one file each)

- `partners/partner-arpuplus-zain-ksa-matched-sep26.xlsx` — `arpuplus@dizlee.com` / `Password123!` — 1 service(s), total USD 40129.29 — ShofhaPlus=154343.41 SAR
- `partners/partner-centili-zain-ksa-matched-sep26.xlsx` — `centili@dizlee.com` / `Password123!` — 1 service(s), total USD 11150.53 — Gamemine=42886.66 SAR
- `partners/partner-dharam-zain-ksa-matched-sep26.xlsx` — `dharam@dizlee.com` / `Password123!` — 2 service(s), total USD 12582.26 — RTST=48370.82 SAR; DocxBuddy=22.5 SAR
- `partners/partner-kgroup-zain-ksa-matched-sep26.xlsx` — `kgroup@dizlee.com` / `Password123!` — 2 service(s), total USD 158.60 — Salamati=6 SAR; Funzzy=604 SAR
- `partners/partner-klikomics-zain-ksa-matched-sep26.xlsx` — `klikomics@dizlee.com` / `Password123!` — 1 service(s), total USD 2734.68 — Klikomics=10518 SAR
- `partners/partner-marvel-media-zain-ksa-matched-sep26.xlsx` — `marvel-media@dizlee.com` / `Password123!` — 3 service(s), total USD 3320.73 — Olamovie=8993.68 SAR; ByteplayGames=1650.79 SAR; ByteplayMystery=2127.54 SAR
- `partners/partner-media-ranch-zain-ksa-matched-sep26.xlsx` — `media-ranch@dizlee.com` / `Password123!` — 3 service(s), total USD 1933.46 — FitnessStudio=1694.37 SAR; BrainBot=5712 SAR; Trivioo=30 SAR
- `partners/partner-mobilearts-zain-ksa-matched-sep26.xlsx` — `mobilearts@dizlee.com` / `Password123!` — 6 service(s), total USD 43177.10 — GamesFort=9807.94 SAR; FunFlix=9202.98 SAR; AppsFactory=104874.77 SAR; Pikaboo=894.22 SAR; DrApp=15796.81 SAR; Laki=25489.09 SAR
- `partners/partner-novustech-zain-ksa-matched-sep26.xlsx` — `novustech@dizlee.com` / `Password123!` — 1 service(s), total USD 489.60 — Premium Games=1883.06 SAR
- `partners/partner-zainsd-cp-zain-ksa-matched-sep26.xlsx` — `zainsd-cp@dizlee.com` / `Password123!` — 1 service(s), total USD 7.28 — 7adir=28 SAR

## Notes
- Values come from OpCo report line items already uploaded for this period (not synthetic).
- Centili should only include services present on the OpCo side (e.g. Gamemine), not invented rows.
- Re-run: `node --import tsx scripts/generate-ksa-matched-samples.ts --month=9 --year=2026`

