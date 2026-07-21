import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selectLifecycleZipFixture } from "./realistic-zip-fixture.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = [
  {
    label: "banner",
    path:
      process.env.TEMPLATE_PACKAGE_BANNER_ZIP ??
      "/Users/niels/Documents/Templates/template-package-deal-of-the-week-banner.zip",
    sizeBytes: 2_342_981,
    sha256: "b8ac9d2acf962de377114013ef91626b0426ef9645566917a6655ffb538b7e1b",
  },
  {
    label: "post",
    path:
      process.env.TEMPLATE_PACKAGE_POST_ZIP ??
      "/Users/niels/Documents/Templates/template-package-deal-of-the-week-post.zip",
    sizeBytes: 2_500_574,
    sha256: "96866712f10271407a182d3a905e112b2eb1b9170257c4d8fe6d05c9a7311b05",
  },
];

function runFixture(sourcePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(projectRoot, "scripts/run-tests.mjs"), "--realistic-zip-strict"],
      {
        cwd: projectRoot,
        env: {
          ...process.env,
          TEMPLATE_PACKAGE_LIFECYCLE_ZIP: sourcePath,
        },
        stdio: "inherit",
      },
    );
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Strict lifecycle exited with code ${code ?? "unknown"}.`));
    });
  });
}

for (const fixture of fixtures) {
  const selected = await selectLifecycleZipFixture({
    strict: true,
    env: { TEMPLATE_PACKAGE_LIFECYCLE_ZIP: fixture.path },
  });
  if (
    selected.kind !== "realistic" ||
    selected.sizeBytes !== fixture.sizeBytes ||
    selected.sha256 !== fixture.sha256
  ) {
    throw new Error(
      `[diagnostic-zips] ${fixture.label} fixture identity mismatch: ${fixture.path}. Expected size=${fixture.sizeBytes} sha256=${fixture.sha256}; received size=${selected.kind === "realistic" ? selected.sizeBytes : "unavailable"} sha256=${selected.kind === "realistic" ? selected.sha256 : "unavailable"}.`,
    );
  }
  console.log(
    `[diagnostic-zips] strict=true label=${fixture.label} file=${selected.sourceName} size=${selected.sizeBytes} sha256=${selected.sha256}`,
  );
  await runFixture(selected.sourcePath);
}

console.log("[diagnostic-zips] both strict fixtures passed.");
