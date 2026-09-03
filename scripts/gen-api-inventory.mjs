import fs from "fs";
import path from "path";

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name === "route.ts") acc.push(p);
  }
  return acc;
}

const files = walk("app/api");
const rows = files.map((f) => {
  const rel = f.replace(/\\/g, "/");
  const c = fs.readFileSync(f, "utf8");
  const methods = ["GET", "POST", "PATCH", "PUT", "DELETE"].filter((m) =>
    new RegExp(`export async function ${m}\\b`).test(c),
  );
  let auth = "session+middleware";
  if (/CRON_SECRET/.test(c)) auth = "cron-secret";
  else if (/requireAdmin|getAdminSession|requireAdminApiSession/.test(c))
    auth = "admin";
  else if (/requireDizlee|getDizleeSession/.test(c)) auth = "dizlee";
  else if (/requireOpco|getOpcoSession/.test(c)) auth = "opco";
  else if (/requirePartner|getPartnerSession/.test(c)) auth = "partner";
  else if (rel.includes("api/health")) auth = "public";
  else if (rel.includes("api/auth") || rel.includes("api/admin-auth"))
    auth = "auth-public";
  const rate = /assertRateLimit|consumeRateLimit/.test(c);
  const zod = /z\.|safeParse|\.parse\(/.test(c);
  const routePath =
    "/" +
    rel
      .replace(/^app/, "app")
      .replace(/\/route\.ts$/, "")
      .replace(/^app\//, "");
  return `| ${methods.join("/") || "?"} | \`/${routePath.replace(/^app\//, "")}\` | ${auth} | ${rate ? "Y" : "N"} | ${zod ? "Y" : "~"} |`;
});

const header = `| Method | Route | Auth | Rate limit | Zod/parse |
|--------|-------|------|------------|-----------|
`;
fs.writeFileSync("tmp-api-inventory.md", header + rows.sort().join("\n") + "\n");
console.log("routes", rows.length);
