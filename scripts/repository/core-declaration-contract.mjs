/** Test-only protected contracts. Expected identities are reviewed constants, never learned from dist. */
import { createHash } from "node:crypto";

export const workspaceCoreDeclarationContracts = Object.freeze({
  // Patch retains the exact published 2.0.0 public declaration.
  "2.0.1": Object.freeze({ bytes: 105096, sha256: "dd5c66826747210ec52e39d662b0487f61e1926be05dc8602d812fac9ded6263" }),
  "2.0.0": Object.freeze({ bytes: 105096, sha256: "dd5c66826747210ec52e39d662b0487f61e1926be05dc8602d812fac9ded6263" }),
  // Retained unpublished V2-only draft identity; not the published 1.0 compatibility contract.
  "1.0.0": Object.freeze({ bytes: 105096, sha256: "dd5c66826747210ec52e39d662b0487f61e1926be05dc8602d812fac9ded6263" }),
  "0.8.0": Object.freeze({ bytes: 110540, sha256: "dbd67c76ff75a1c56e05413e53b73c49b44bba8f33d499dd5ce3f79e4d137e32" }),
});
// Historical published-artifact check remains separate from the current workspace contract.
export const historicalCoreDeclarationContract = Object.freeze({
  bytes: 108339, sha256: "c1cf61b25cd191a03bbd73d60bcc0085cc6d1fc10b50d91a08cc0d7bfdd4a9f1",
});
export function assertCoreDeclarationIdentity(version, identity) {
  const expected = Object.hasOwn(workspaceCoreDeclarationContracts, version) ? workspaceCoreDeclarationContracts[version] : null;
  if (!expected) throw new Error(`No protected workspace Core declaration contract for version ${version}.`);
  if (identity.bytes !== expected.bytes || identity.sha256 !== expected.sha256) {
    throw new Error(`Core ${version} public declaration drifted: ${identity.bytes} bytes / ${identity.sha256}; expected ${expected.bytes} / ${expected.sha256}.`);
  }
}
export function assertCoreDeclaration(version, bytes) {
  assertCoreDeclarationIdentity(version, { bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") });
}
