# Client requested changes

Format for each item: **Before** → **After** (what we changed).

---

### 1. File upload size limit
- **Before:** Excel / report upload capped at **20 MB**.
- **After:** Cap raised to **100 MB** (app check + server body limit aligned).

### 2. Partner report currency
- **Before:** Partner reports treated as USD.
- **After:** Partner reports uploaded and processed in **local currency**; system converts to USD using period FX.

### 3. Reconciliation confirmed amount
- **Before:** Confirmed value followed the OpCo amount.
- **After:** Confirmed value = the **lesser** of OpCo vs Partner amount (for the matched service).

### 4. Service name spacing
- **Before:** Extra spaces made the same service look like two different names.
- **After:** Spaces are trimmed/collapsed so names match as one service.

### 5. Partner upload — same services combined
- **Before:** Duplicate Partner service rows stayed separate and often did not line up with OpCo.
- **After:** Same service names on Partner upload are **combined (summed)** before matching OpCo.

### 6. Exchange rate display / direction
- **Before:** Shown as 1 local = ? USD.
- **After:** Shown as **1 USD = ? local** (e.g. 1 USD = 3.76 SAR).

### 7. Dizlee RS report — Revenue Share amount column
- **Before:** RS report did not clearly show the share **amount** column as requested.
- **After:** Dizlee RS Excel includes a **Revenue Share amount** column per service line.

### 8. Admin Report mapping — filters
- **Before:** Only **one** row filter.
- **After:** **Multiple** row filters (AND) can be set per OpCo report map.

### 9. Generate RS without Partner report
- **Before:** RS generation required Partner report upload.
- **After:** Dizlee can generate OpCo RS report **without** a Partner report for that period.

### 10. Dizlee RS report — OpCo amount in local currency
- **Before:** OpCo amount in local currency was not shown as a dedicated column.
- **After:** RS report includes an **OpCo amount (local currency)** column.

### 11. OpCo VAT removed → service-wise regulatory fee
- **Before:** One **VAT %** on the OpCo record applied broadly.
- **After:** OpCo VAT removed; **regulatory fee %** set **per service** (Service–Partner map) via Admin UI or Excel import.

### 12. RS calculation when regulatory fee exists
- **Before:** RS used OpCo gross (no per-service fee netting).
- **After:** If service fee **> 0%** → RS on **Net Revenue** (gross − fee); if **0%** → still on **gross OpCo USD**.

### 13. Partner RS% on Service–Partner map
- **Before:** No per-service Partner share % on the map.
- **After:** **Partner RS%** column on each Partner–service row (Admin-configurable).

### 14. Partner RS report send + 3-month retention
- **Before:** No Dizlee→Partner RS report send/history with retention.
- **After:** Dizlee sends Partner RS **PDF** after recon; Partner sees it under **RS Reports**; reports older than **3 months** are purged.

### 15. Partner invoice after Dizlee report
- **Before:** Partner could invoice without that Dizlee Partner RS handoff.
- **After:** Partner invoices only **after** receiving the relevant Partner RS report from Dizlee.

### 16. Partner RS report itself
- **Before:** Partners had no dedicated Partner RS PDF from Dizlee for the period.
- **After:** PDF lists services, gross (LC), Partner RS%, RS amount, totals, FX, retention, net to Partner (USD).
