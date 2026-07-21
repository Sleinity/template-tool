import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const output = await mkdtemp(path.join(os.tmpdir(), "template-sdk-pack-"));
const packages = ["template-core", "template-browser", "template-react"];
const forbidden = [
  /^package\/src\//,
  /^package\/fidelity\//,
  /^package\/fixtures\//,
  /^package\/tests?\//,
  /\.env(?:\.|$)/,
  /TemplatePackageQualityPanel/,
  /TemplatePackageFieldEditor/,
];

try {
  for (const packageName of packages) {
    const cwd = path.join(root, "packages", packageName);
    const packed = spawnSync(
      "pnpm",
      ["pack", "--pack-destination", output],
      { cwd, encoding: "utf8" },
    );
    if (packed.status !== 0) {
      throw new Error(`Packing ${packageName} failed:\n${packed.stderr || packed.stdout}`);
    }
  }
  const archives = (await readdir(output)).filter((file) => file.endsWith(".tgz"));
  if (archives.length !== packages.length) {
    throw new Error(`Expected ${packages.length} package archives, found ${archives.length}.`);
  }
  for (const archive of archives) {
    const listed = spawnSync("tar", ["-tzf", path.join(output, archive)], { encoding: "utf8" });
    if (listed.status !== 0) throw new Error(`Could not inspect ${archive}.`);
    const entries = listed.stdout.trim().split("\n").filter(Boolean);
    const bad = entries.filter((entry) => forbidden.some((pattern) => pattern.test(entry)));
    if (bad.length) throw new Error(`${archive} contains forbidden files:\n${bad.join("\n")}`);
    const packageJsonEntry = entries.find((entry) => entry === "package/package.json");
    if (!packageJsonEntry) throw new Error(`${archive} has no package.json.`);
  }
  console.log(`Verified ${archives.length} private SDK package archives.`);
} finally {
  await rm(output, { recursive: true, force: true });
}
