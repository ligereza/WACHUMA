import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const policy = await readFile(
  resolve(root, "docs/governance/release-readiness-v0.1.md"),
  "utf8",
);
const takedown = await readFile(
  resolve(root, "docs/governance/review-and-takedown.md"),
  "utf8",
);

const requiredPolicyTerms = [
  /not-ready-for-broad-public-release/i,
  /no constituye\s+asesor[ií]a legal/i,
  /SBOM/i,
  /CC BY-NC/i,
  /CC BY-SA/i,
  /community-controlled/i,
  /sensitive/i,
  /restricted/i,
  /aprobaci[oó]n legal/i,
  /revisi[oó]n comunitaria/i,
  /rollback|reversi[oó]n/i,
];
for (const term of requiredPolicyTerms) {
  assert.match(policy, term, `Release policy is missing ${term}`);
}

for (const term of [
  /Solicitud de revisi[oó]n o retiro/i,
  /Respuesta operativa/i,
  /historial\s+de\s+cambios/i,
  /fuera de la API\s+p[uú]blica/i,
]) {
  assert.match(takedown, term, `Takedown policy is missing ${term}`);
}

assert.match(
  policy,
  /- \[ \] .*aprobaci[oó]n legal/i,
  "Legal approval must remain an explicit manual gate",
);
assert.match(
  policy,
  /- \[ \] .*revisi[oó]n comunitaria/i,
  "Community review must remain an explicit manual gate",
);

console.log(
  JSON.stringify({
    releaseStatus: "not-ready-for-broad-public-release",
    automatedPolicyDocument: true,
    legalApprovalRequired: true,
    communityReviewRequired: true,
    takedownPolicyPresent: true,
  }),
);
