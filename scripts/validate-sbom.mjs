import assert from "node:assert/strict";
import { readdir, readFile, unlink, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("..", import.meta.url));
const outputDirectory = resolve(root, ".local/release");
const outputPattern = resolve(outputDirectory, "wachuma-%s.cdx.json");
const packageManager = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function runPnpm(args) {
  const command =
    process.platform === "win32" ? process.env.ComSpec : packageManager;
  const commandArgs =
    process.platform === "win32"
      ? [
          "/d",
          "/c",
          `${packageManager} ${args
            .map((argument) =>
              /\s/.test(argument)
                ? `"${argument.replaceAll('"', '\\"')}"`
                : argument,
            )
            .join(" ")}`,
        ]
      : args;
  return spawnSync(command, commandArgs, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    shell: false,
  });
}

await mkdir(outputDirectory, { recursive: true });
const previousFiles = await readdir(outputDirectory);
await Promise.all(
  previousFiles
    .filter((file) => file.endsWith(".cdx.json"))
    .map((file) => unlink(resolve(outputDirectory, file))),
);

const sbomResult = runPnpm([
  "sbom",
  "--sbom-format",
  "cyclonedx",
  "--lockfile-only",
  "--sbom-spec-version",
  "1.5",
  "--sbom-type",
  "application",
  "--sbom-supplier",
  "WACHUMA contributors",
  "--out",
  outputPattern,
]);
if (sbomResult.error) throw sbomResult.error;
assert.equal(sbomResult.status, 0, "pnpm sbom failed");

const sbomFiles = (await readdir(outputDirectory))
  .filter((file) => file.endsWith(".cdx.json"))
  .sort();
assert.ok(
  sbomFiles.length > 0,
  "pnpm sbom did not generate any CycloneDX file",
);

const sboms = await Promise.all(
  sbomFiles.map(async (file) => {
    const document = JSON.parse(
      await readFile(resolve(outputDirectory, file), "utf8"),
    );
    assert.equal(document.bomFormat, "CycloneDX", `${file} is not CycloneDX`);
    assert.equal(document.specVersion, "1.5", `${file} must use CycloneDX 1.5`);
    assert.match(
      document.serialNumber,
      /^urn:uuid:/,
      `${file} needs a serial number`,
    );
    assert.ok(
      document.metadata?.component?.name,
      `${file} needs a root component`,
    );
    assert.ok(Array.isArray(document.components), `${file} needs components`);
    for (const component of document.components) {
      assert.ok(component.name, `${file} contains a component without a name`);
      assert.ok(
        component.version,
        `${file} contains ${component.name} without a version`,
      );
    }
    return document;
  }),
);

const licenseResult = runPnpm(["licenses", "list", "--json"]);
if (licenseResult.error) throw licenseResult.error;
assert.equal(licenseResult.status, 0, "pnpm licenses list failed");
const licensesByExpression = JSON.parse(licenseResult.stdout);
const unresolvedLicenses = Object.keys(licensesByExpression).filter((license) =>
  /unknown|unlicensed|no license|missing/i.test(license),
);
assert.deepEqual(
  unresolvedLicenses,
  [],
  `Dependencies with unresolved licenses: ${unresolvedLicenses.join(", ")}`,
);

console.log(
  JSON.stringify({
    sbomFormat: "CycloneDX",
    specVersion: "1.5",
    files: sbomFiles,
    packageComponents: sboms.reduce(
      (count, document) => count + document.components.length,
      0,
    ),
    licenseExpressions: Object.keys(licensesByExpression).length,
    outputDirectory: ".local/release",
  }),
);
