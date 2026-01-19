import { existsSync, rmSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const rootDir = process.cwd();
const distDir = join(rootDir, "dist");
const packageDir = join(distDir, "plugin_package");
const outFile = join(distDir, "plugin_package.zip");

if (!existsSync(packageDir)) {
  console.error('JQ: dist/plugin_package not found. Run `bun run build` first.');
  process.exit(1);
}

// Copy documentation and license to the package directory.
const docs = ["README.md", "LICENSE"];
for (const doc of docs) {
  const src = join(rootDir, doc);
  if (existsSync(src)) {
    copyFileSync(src, join(packageDir, doc));
  }
}

if (existsSync(outFile)) {
  rmSync(outFile);
}

// Ensure the zip command is available.
try {
  execSync("zip -v", { stdio: "ignore" });
} catch {
  console.error("JQ: zip command not available on this system.");
  process.exit(1);
}

// Zip the CONTENTS of dist/plugin_package/ so manifest.json is at the zip root.
execSync(`cd "${packageDir}" && zip -r "${outFile}" .`, { stdio: "inherit" });

console.log(`JQ: created ${outFile}`);

