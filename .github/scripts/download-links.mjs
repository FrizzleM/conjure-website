/*
 * Points downloads.js at the files of one release.
 *
 *   node .github/scripts/download-links.mjs <release.json> <downloads.js>
 *
 * release.json is GitHub's JSON for a release, as printed by
 * `gh api repos/<owner>/<repo>/releases/latest`. Every link in downloads.js
 * that names an `asset` gets the download URL of the release file it matches,
 * or "" when the release has no such file. `version`, `releaseNotes` and
 * `checksums` come from the release too. Nothing else in the file changes,
 * comments included.
 *
 * If the release has none of the files the page links to, it stops and leaves
 * the file alone. That usually means the release was published before its
 * files were uploaded, and going ahead would turn every button into
 * "Coming soon".
 */
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";

const fail = (message) => {
  console.error(`::error::${message}`);
  process.exit(1);
};
const warn = (message) => console.log(`::warning::${message}`);

const [releasePath, downloadsPath] = process.argv.slice(2);
if (!releasePath || !downloadsPath) {
  fail("usage: node download-links.mjs <release.json> <downloads.js>");
}

const release = JSON.parse(readFileSync(releasePath, "utf8"));
const source = readFileSync(downloadsPath, "utf8");
const tag = String(release.tag_name || "");
if (!tag) fail(`${releasePath} is not a release: it has no tag_name.`);

// "open" is an upload that never finished, so there is nothing to download.
const files = (release.assets || [])
  .filter((asset) => !asset.state || asset.state === "uploaded")
  .map((asset) => ({ name: asset.name, url: asset.browser_download_url }))
  .sort((a, b) => a.name.localeCompare(b.name));

/** The object downloads.js assigns to window.CONJURE_DOWNLOADS. */
function evaluate(text) {
  const sandbox = { window: {} };
  vm.runInNewContext(text, sandbox, { filename: downloadsPath });
  const config = sandbox.window.CONJURE_DOWNLOADS;
  if (!config || typeof config !== "object") {
    fail(`${downloadsPath} does not set window.CONJURE_DOWNLOADS.`);
  }
  return config;
}

/** Every link that names an asset, in the order the file lists them. */
function linksIn(config) {
  const links = [];
  const walk = (value) => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== "object") return;
    if (typeof value.asset === "string") links.push(value);
    Object.values(value).forEach(walk);
  };
  walk(config);
  return links;
}

/** The release file a pattern names: * is any run of characters, any case. */
function fileFor(pattern) {
  const body = pattern
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  const re = new RegExp(`^${body}$`, "i");
  const hits = files.filter((file) => re.test(file.name));
  if (hits.length > 1) {
    warn(`"${pattern}" matches ${hits.map((f) => f.name).join(", ")}. Linking ${hits[0].name}.`);
  }
  return hits[0];
}

const links = linksIn(evaluate(source));
if (!links.length) fail(`No link in ${downloadsPath} names an asset, so there is nothing to fill in.`);

// Rewrite each link's url on the line that carries its asset.
const ASSET = /\basset:\s*"([^"]*)"/;
const URL_FIELD = /\burl:\s*"[^"]*"/;
const plan = [];
let text = source
  .split("\n")
  .map((line, i) => {
    const asset = line.match(ASSET);
    if (!asset) return line;
    if (!URL_FIELD.test(line)) {
      fail(`${downloadsPath}:${i + 1}: keep this link's asset and url on one line.`);
    }
    const file = fileFor(asset[1]);
    plan.push({ pattern: asset[1], file });
    return line.replace(URL_FIELD, () => `url: ${JSON.stringify(file ? file.url : "")}`);
  })
  .join("\n");

if (plan.length !== links.length) {
  fail(
    `${downloadsPath} has ${links.length} links that name an asset, but ${plan.length} lines ` +
      "with one. Keep each link on one line.",
  );
}
if (!plan.some((step) => step.file)) {
  fail(
    `${tag} has none of the files the site links to (it has: ${files.map((f) => f.name).join(", ") || "nothing"}). ` +
      "Upload them to the release, then run this workflow again from the Actions tab.",
  );
}

const checksums = files.find((file) => file.name.toLowerCase() === "sha256sums");
const fields = {
  version: tag.replace(/^v/i, ""),
  releaseNotes: release.html_url || "",
  checksums: checksums ? checksums.url : "",
};
for (const [key, value] of Object.entries(fields)) {
  const re = new RegExp(`^(\\s*${key}:\\s*)"[^"]*"`, "m");
  if (!re.test(text)) fail(`${downloadsPath} has no line starting ${key}: "…".`);
  text = text.replace(re, (_, lead) => lead + JSON.stringify(value));
}

// Read the result back the way the page will, and check it says what was meant.
const after = evaluate(text);
linksIn(after).forEach((link, i) => {
  const want = plan[i].file ? plan[i].file.url : "";
  if (link.asset !== plan[i].pattern || link.url !== want) {
    fail(`Rewriting ${downloadsPath} went wrong at the link for "${plan[i].pattern}".`);
  }
});
for (const [key, value] of Object.entries(fields)) {
  if (after[key] !== value) fail(`Rewriting ${downloadsPath} went wrong at ${key}.`);
}

writeFileSync(downloadsPath, text);

// Say what went where.
const rows = plan.map((step, i) => [links[i].label || step.pattern, step.pattern, step.file ? step.file.name : ""]);
const linked = new Set(plan.filter((s) => s.file).map((s) => s.file.name));
if (checksums) linked.add(checksums.name);
const unlinked = files.filter((file) => !linked.has(file.name)).map((file) => file.name);

console.log(`${tag}, ${release.html_url || ""}`);
for (const [label, pattern, name] of rows) {
  console.log(`  ${label.padEnd(26)} ${pattern.padEnd(18)} ${name || "(not in this release)"}`);
}
console.log(`  ${"Checksums".padEnd(26)} ${"SHA256SUMS".padEnd(18)} ${checksums ? checksums.name : "(not in this release)"}`);
if (unlinked.length) console.log(`Not linked from the site: ${unlinked.join(", ")}`);

if (process.env.GITHUB_STEP_SUMMARY) {
  const summary = [
    `### Download links for [${tag}](${release.html_url || ""})`,
    "",
    "| Link | Asset | File |",
    "| --- | --- | --- |",
    ...rows.map(([label, pattern, name]) => `| ${label} | \`${pattern}\` | ${name || "not in this release"} |`),
    `| Checksums | \`SHA256SUMS\` | ${checksums ? checksums.name : "not in this release"} |`,
    "",
    unlinked.length ? `Not linked from the site: ${unlinked.map((n) => `\`${n}\``).join(", ")}` : "",
    "",
  ];
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary.join("\n"));
}
