# How to use these files

Three files, one job each:

| File | Who uses it | When |
|---|---|---|
| `01_HUSSNAIN_BOOTSTRAP_PROMPT.md` | You (Hussnain) | Now — paste into Cursor in an empty folder to scaffold the repo, CI/CD, and your own Admin + Partner portal work |
| `02_SHAHRUKH_HANDOFF_PROMPT.md` | Shahrukh | After you push to GitHub — send him this whole file |
| `03_HASEEB_HANDOFF_PROMPT.md` | Haseeb | After you push to GitHub — send him this whole file |

## What you do, step by step

1. Create an empty GitHub repo manually (e.g. `dizlee-reconciliation-platform`), don't initialize it with a README/license/.gitignore from GitHub's UI — Cursor will create those.
2. Open an empty local folder in Cursor.
3. Copy everything below the `---` line in `01_HUSSNAIN_BOOTSTRAP_PROMPT.md` and paste it into Cursor's Composer/Agent chat.
4. Let Cursor build the scaffold, CI/CD config, and your Admin + Partner portal work.
5. When Cursor stops and prints the `git push` commands, review the diff yourself, then run those commands manually (the prompt deliberately does not let Cursor push for you).
6. Add `<REPO_URL>` you now have to the top of `02_SHAHRUKH_HANDOFF_PROMPT.md` and `03_HASEEB_HANDOFF_PROMPT.md` (replace the placeholder), or just tell them the URL verbally/in Slack — either works.
7. On GitHub: Settings → Branches → add the protection rules described in the bootstrap prompt for `main` and `develop`.
8. On GitHub: Settings → Secrets and variables → Actions → add `DATABASE_URL` (your staging/prod TiDB connection string), `NEXTAUTH_SECRET`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `BLOB_READ_WRITE_TOKEN`, SMTP secrets.
9. Send Shahrukh the full contents of `02_SHAHRUKH_HANDOFF_PROMPT.md`. Send Haseeb the full contents of `03_HASEEB_HANDOFF_PROMPT.md`.

## What Shahrukh and Haseeb each do

Each file has two parts:
- A short shell block at the top they run in their terminal first (clone, checkout `develop`, spin up their own local MySQL via Docker, install, migrate, run dev server) — this confirms their local environment works before they touch Cursor at all.
- Everything below that, which they paste into Cursor's chat the same way you did.

Each of their prompts is scoped only to their own folders (`app/(opco)/` for Shahrukh, `app/(dizlee)/` for Haseeb) and their own block inside the shared `prisma/schema.prisma`. Neither of them needs anything from you to be finished first — they can start the moment they clone the repo, because your bootstrap session already created the empty placeholder folders and the three-way split schema file.

## Local databases — how this actually works

Each of the three of you runs `docker compose up -d` in your own clone. That gives each of you your **own private local MySQL** — not shared, not synced between you. You each build and test against your own data. Nobody touches a shared cloud database during development.

The only "shared" things are:
- The GitHub repo itself (via PRs into `develop`)
- The `prisma/schema.prisma` file's three comment-block sections, where each of you only ever edits your own block
- CI, which spins up a brand-new throwaway MySQL container per pipeline run just to validate migrations — this also isn't a database any of you connect to directly

TiDB Cloud only enters the picture for staging and production, once code merges to `develop` (staging) or `main` (production). You'll need to provision a TiDB Cloud Serverless cluster (free tier is enough for staging) and put its connection string in GitHub's repo secrets — that's step 8 above.

## If anyone gets stuck

The handoff prompts are scoped tightly on purpose, including an explicit "don't touch other folders" instruction baked into the Cursor prompt itself. If Cursor in someone's session tries to wander into another developer's folder or into the shared `lib/`/`components/` root, that's a sign the prompt needs a reminder — just tell Cursor "stay inside your own folders as instructed" and it should course-correct.
