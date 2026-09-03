# CD — Contabo VPS (handover)

**Audience:** Developers / ops taking over Contabo after production is live on Vercel.  
**When to use:** **Phase 2 only** — after [`PRODUCTION-CHECKLIST.md`](../PRODUCTION-CHECKLIST.md) for **Vercel + TiDB** is done and the app is stable there.  
**Do not** treat this as the current go-live path. Current path: [`CD_VERCEL_TIDB.md`](CD_VERCEL_TIDB.md).

**Target machine (planned):** Contabo Cloud VPS Core 6 — ~**6 vCPU / 12 GB RAM / 200 GB SSD**, **Ubuntu** (24‑month contract SKU as discussed). Specs are enough for this Next.js + Prisma app at small/medium OpCo–Partner volume.

---

## 1. What moves vs what can stay

| Concern | On Vercel (Phase 1) | On Contabo (Phase 2) |
|---------|---------------------|----------------------|
| App host | Vercel serverless / Node | Single Node process (`next start`) + systemd |
| HTTPS | Vercel | Caddy (or nginx + Let’s Encrypt) |
| Database | TiDB Cloud | **Keep TiDB** *or* MySQL 8 on the VPS |
| Files | Vercel Blob (`BLOB_READ_WRITE_TOKEN`) | Local disk under upload root (**no Blob required**) |
| Cron | `vercel.json` → reminder API | System **crontab** → same API + `CRON_SECRET` |
| Rate limits / cron ledger | Already DB-backed | Same tables; works on one instance |

App code already supports local uploads when Blob is unset and the process is **not** treated as Vercel Blob-required. On Contabo: **do not** set a fake `VERCEL=1` that forces Blob-only behavior; leave `BLOB_READ_WRITE_TOKEN` unset unless you intentionally keep Blob.

---

## 2. Recommended Contabo stack

```text
Internet → Caddy :443 → Next.js 127.0.0.1:3000
                ↓
         TiDB Cloud  OR  MySQL 8 on 127.0.0.1
                ↓
         /var/lib/dizlee/uploads   (private files)
crontab → curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/admin/cron/submission-reminders
```

| Piece | Choice |
|-------|--------|
| OS | Ubuntu 22.04 or 24.04 LTS |
| Runtime | **Node.js 22** |
| App process | **systemd** unit running `next start -H 127.0.0.1 -p 3000` |
| Reverse proxy / TLS | **Caddy** (auto HTTPS) |
| Firewall | **UFW**: allow `22`, `80`, `443` only; SSH key auth |
| DB | Prefer **reuse TiDB** for simpler cutover; optional **MySQL 8** on-box later |
| Uploads | `/var/lib/dizlee/uploads` (symlink or env mapping to app `.uploads` — see §5) |

---

## 3. Directory layout

```text
/opt/dizlee/app                 # git clone / release checkout
/etc/dizlee/dizlee.env          # secrets (root:640, app user readable)
/var/lib/dizlee/uploads         # private object files (reports, invoices, …)
/var/log/dizlee/                # optional app + cron logs
/var/backups/dizlee/            # mysqldump / upload tarballs
```

Suggested Linux user: `dizlee` (no sudo for day-to-day; deploy via sudo or CI SSH).

---

## 4. Environment variables (`/etc/dizlee/dizlee.env`)

```bash
NODE_ENV=production

# Exact public origin after DNS cutover (no trailing slash)
NEXTAUTH_URL=https://app.example.com
NEXTAUTH_SECRET=<openssl rand -base64 32>

# TiDB (keep) OR local MySQL
# TiDB example:
# DATABASE_URL="mysql://USER:PASS@HOST:4000/dizlee_production?sslaccept=strict&connection_limit=15"
# Local MySQL example:
# DATABASE_URL="mysql://dizlee:PASS@127.0.0.1:3306/dizlee?connection_limit=15"

CRON_SECRET=<openssl rand -base64 32>
SYSTEM_USER_ID=<bigint id of production system/admin user for cron actor>

# SMTP (same as Vercel; unset SMTP_REDIRECT_TO in production)
# SMTP_HOST=...
# SMTP_PORT=587
# SMTP_USER=...
# SMTP_PASSWORD=...
# Or use Admin → Email Settings for host/port/from; keep passwords in env

# Contabo: leave Blob unset for local disk uploads
# BLOB_READ_WRITE_TOKEN=
# Do not set VERCEL=1
```

**Notes for Contabo**

- Single Node process: Prisma `connection_limit=10–20` is fine (unlike Vercel serverless `5`).
- `NEXTAUTH_URL` **must** match the Contabo domain after cutover (cookies / Secure).
- Generate a **new** `CRON_SECRET` or reuse the Vercel one; crontab must match.

---

## 5. Local uploads path

Default code resolves storage under `process.cwd()/.uploads` ([`lib/platform/storage/object-storage.ts`](../lib/platform/storage/object-storage.ts)).

**Recommended production approach**

```bash
sudo mkdir -p /var/lib/dizlee/uploads
sudo chown -R dizlee:dizlee /var/lib/dizlee/uploads
# From the app directory after clone:
ln -sfn /var/lib/dizlee/uploads /opt/dizlee/app/.uploads
```

Ensure the systemd `WorkingDirectory` is `/opt/dizlee/app` so `.uploads` resolves correctly. Permissions: app user read/write; **not** world-readable; never expose `/var/lib/dizlee` via Caddy static files.

Folders used by the app: `reports`, `invoices`, `notifications`, `opco-report-samples`, `revenue-share`.

---

## 6. First-time Contabo install (summary)

Run as a sudo-capable operator. Adjust versions/domains as needed.

1. **Harden SSH** — key-only login; disable password auth; create `dizlee` user.  
2. **UFW** — `ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable`.  
3. **Node 22** — NodeSource or nvm for the `dizlee` user; verify `node -v`.  
4. **Caddy** — install from official docs; site block reverse_proxies to `127.0.0.1:3000`.  
5. **DB** — either confirm TiDB URL from Phase 1, or install MySQL 8, bind `127.0.0.1`, create DB/user, set `innodb_buffer_pool_size` ~ **2–3 GB** (leave RAM for Node + Excel).  
6. **Clone** repo to `/opt/dizlee/app`, checkout production tag/branch, `npm ci`.  
7. **Env** — install `/etc/dizlee/dizlee.env`; load it in the systemd unit (`EnvironmentFile=`).  
8. **Migrate + build**

   ```bash
   cd /opt/dizlee/app
   set -a && source /etc/dizlee/dizlee.env && set +a
   npx prisma migrate deploy
   npm run build
   ```

   Do **not** run `prisma db seed` on production.

9. **systemd** example unit `/etc/systemd/system/dizlee.service`:

   ```ini
   [Unit]
   Description=Dizlee Reconciliation Next.js
   After=network.target

   [Service]
   Type=simple
   User=dizlee
   Group=dizlee
   WorkingDirectory=/opt/dizlee/app
   EnvironmentFile=/etc/dizlee/dizlee.env
   ExecStart=/usr/bin/npm run start -- -H 127.0.0.1 -p 3000
   Restart=on-failure
   RestartSec=5

   [Install]
   WantedBy=multi-user.target
   ```

   Then: `systemctl daemon-reload && systemctl enable --now dizlee`.

10. **Caddy** — `reverse_proxy 127.0.0.1:3000` for your hostname; obtain TLS.  
11. **Cron** (08:00 UTC, same schedule as `vercel.json`):

    ```cron
    0 8 * * * . /etc/dizlee/dizlee.env; curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" "https://app.example.com/api/admin/cron/submission-reminders" >> /var/log/dizlee/cron.log 2>&1
    ```

    Install under root or a user that can read the env file. Confirm HTTP **200** and that duplicate runs skip via `cron_job_runs` ledger.

---

## 7. Cutover from Vercel → Contabo (ordered)

Do this only after Phase 1 checklist is green.

1. **Lower DNS TTL** (e.g. 300s) a day before.  
2. **Provision Contabo** and complete §6 on a staging hostname if possible.  
3. **Database**  
   - **Keep TiDB:** set Contabo `DATABASE_URL` to the **same** production TiDB URL (brief dual-write risk only if both app hosts write — prefer maintenance window).  
   - **Move to MySQL on Contabo:** `mysqldump` / TiDB export → import; verify row counts; freeze Vercel writes during cutover.  
4. **Files**  
   - Export/copy Vercel Blob objects into `/var/lib/dizlee/uploads` preserving key layout (`reports/…`, `invoices/…`, …), **or** accept that only new uploads live on Contabo and old files stay on Blob until copied.  
   - Smoke-test download/preview for an existing report and invoice.  
5. **Build/start** Contabo app with production env; verify `/api/health` and `/api/health/ready`.  
6. **Point DNS A/AAAA** to Contabo IP; wait for propagation.  
7. **Update** `NEXTAUTH_URL` if the hostname changed; restart `dizlee`.  
8. **Enable Contabo cron**; **disable** Vercel Cron / pause Vercel production deploy.  
9. **Smoke tests** (§8).  
10. **Backups** — Contabo snapshots + DB dump + upload-dir tarball; document restore.  
11. Keep Vercel project around briefly for rollback; then decommission.

---

## 8. Smoke tests after Contabo cutover

- [ ] `GET /api/health` → 200  
- [ ] `GET /api/health/ready` → 200 (`database: ok`; Blob check skipped when not on Vercel)  
- [ ] Admin login `/admin/login` and portal login `/login` (role separation)  
- [ ] OpCo + Partner report upload and download  
- [ ] Dizlee open one reconciliation / invoice  
- [ ] Cron with correct Bearer → 200; second fire same day does not double-send  
- [ ] Cron without Bearer → 401  
- [ ] Uploads land under `/var/lib/dizlee/uploads` and are not publicly listed by Caddy  

Full security matrix: [`PRE_PRODUCTION_SECURITY_CHECKLIST.md`](PRE_PRODUCTION_SECURITY_CHECKLIST.md).

---

## 9. Backups & capacity

| Item | Suggestion |
|------|------------|
| Contabo snapshots | Use included snapshots on a schedule |
| DB | Daily `mysqldump` (if on-box) **or** TiDB Cloud backup/PITR |
| Uploads | Daily `tar` of `/var/lib/dizlee/uploads` to off-box storage |
| Disk | 200 GB — monitor upload growth; extend storage if needed |
| RAM | Watch swap during concurrent Excel parses; upgrade Contabo plan if OOMs |

Restore drill once before calling Contabo “primary production.”

---

## 10. Common failures

| Symptom | Likely cause |
|---------|----------------|
| Upload fails / storage error | `.uploads` missing, wrong owner, or accidental Blob/Vercel-only config |
| Cron 401 | `CRON_SECRET` mismatch or env not loaded in crontab |
| Cron 503 | `CRON_SECRET` missing in app env |
| Ready 503 | DB unreachable; check `DATABASE_URL` / firewall |
| Login cookie issues | `NEXTAUTH_URL` wrong host or HTTP vs HTTPS |
| 502 from Caddy | `dizlee` service down — `systemctl status dizlee` |
| Duplicate reminders | Cron hitting both Vercel and Contabo — disable one |

---

## 11. Related docs

| Doc | Role |
|-----|------|
| [`PRODUCTION-CHECKLIST.md`](../PRODUCTION-CHECKLIST.md) | **Phase 1** Vercel + TiDB go-live gate |
| [`CD_VERCEL_TIDB.md`](CD_VERCEL_TIDB.md) | Current CD |
| [`PRODUCTION-READINESS-REPORT.md`](../PRODUCTION-READINESS-REPORT.md) | Audit gate / remaining risks |
| [`PRE_PRODUCTION_SECURITY_CHECKLIST.md`](PRE_PRODUCTION_SECURITY_CHECKLIST.md) | Security smoke tests |

---

## 12. Handover checklist (for the Contabo developer)

- [ ] Read this doc + Phase 1 checklist status  
- [ ] Contabo VPS access (SSH keys) and DNS control  
- [ ] Decide: **keep TiDB** vs **MySQL on VPS**  
- [ ] Plan Blob → disk copy (or dual-read period)  
- [ ] Maintenance window + rollback (re-point DNS to Vercel)  
- [ ] Env secrets generated and stored in password manager (not git)  
- [ ] Post-cutover smoke + backups confirmed  
