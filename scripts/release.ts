import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BUMP = (process.argv[2] ?? "patch") as "patch" | "minor" | "major";

if (!["patch", "minor", "major"].includes(BUMP)) {
  console.error("Usage: node --experimental-strip-types scripts/release.ts [patch|minor|major]");
  process.exit(1);
}

function run(cmd: string): string {
  return execSync(cmd, { encoding: "utf-8" }).trim();
}

// Ensure working directory is clean
const status = run("git status --porcelain");
if (status) {
  console.error("Error: Working directory is not clean. Commit or stash changes first.");
  process.exit(1);
}

// Ensure we're on main
const branch = run("git branch --show-current");
if (branch !== "main") {
  console.error(`Error: Must be on main branch (currently on ${branch})`);
  process.exit(1);
}

// Read and bump version
const pkgPath = new URL("../package.json", import.meta.url);
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
const [major, minor, patch] = pkg.version.split(".").map(Number);

const newVersion =
  BUMP === "major" ? `${major + 1}.0.0` :
  BUMP === "minor" ? `${major}.${minor + 1}.0` :
  `${major}.${minor}.${patch + 1}`;

console.log(`Bumping version: ${pkg.version} → ${newVersion}`);

pkg.version = newVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

// Commit, tag, push
run("git add package.json");
run(`git commit -m "v${newVersion}"`);
run(`git tag v${newVersion}`);

console.log("Pushing to origin...");
run("git push");
run(`git push origin v${newVersion}`);

// Build release notes from commits since last tag
const lastTag = (() => {
  try { return run("git describe --tags --abbrev=0 HEAD~1"); } catch { return ""; }
})();
const commitRange = lastTag ? `${lastTag}..HEAD` : "HEAD";
const log = run(`git log ${commitRange} --pretty=format:"- %s" --no-merges`)
  .split("\n")
  .filter((line) => !line.includes("Co-Authored-By") && !line.startsWith(`- v${newVersion}`))
  .join("\n");

const body = `## What's Changed\n\n${log}\n\n**Full Changelog**: https://github.com/${run("gh repo view --json nameWithOwner -q .nameWithOwner")}/compare/${lastTag || "initial"}...v${newVersion}`;

// Create GitHub release
console.log("Creating GitHub release...");
const notesFile = join(tmpdir(), `release-notes-${newVersion}.md`);
writeFileSync(notesFile, body);
try {
  run(`gh release create v${newVersion} --title "v${newVersion}" --notes-file "${notesFile}"`);
} finally {
  unlinkSync(notesFile);
}

console.log(`\nRelease v${newVersion} created!`);
console.log("The publish workflow will now build and push to npm.");
console.log("Watch progress: gh run watch");
