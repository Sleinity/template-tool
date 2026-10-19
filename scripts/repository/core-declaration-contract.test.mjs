import assert from "node:assert/strict";
import { assertCoreDeclaration, assertCoreDeclarationIdentity, workspaceCoreDeclarationContracts, historicalCoreDeclarationContract } from "./core-declaration-contract.mjs";
const expected = workspaceCoreDeclarationContracts["0.8.0"];
assert.doesNotThrow(() => assertCoreDeclarationIdentity("0.8.0", expected));
assert.throws(() => assertCoreDeclarationIdentity("0.8.1", expected), /No protected/);
assert.throws(() => assertCoreDeclarationIdentity("__proto__", expected), /No protected/);
assert.throws(() => assertCoreDeclarationIdentity("0.8.0", { ...expected, bytes: expected.bytes - 1 }), /drifted/);
assert.throws(() => assertCoreDeclarationIdentity("0.8.0", { ...expected, sha256: "0".repeat(64) }), /drifted/);
assert.throws(() => assertCoreDeclarationIdentity("0.8.0", historicalCoreDeclarationContract), /drifted/);
assert.throws(() => assertCoreDeclaration("0.8.0", Buffer.alloc(expected.bytes)), /drifted/);
console.log("Protected Core declaration contracts passed (version, length, hash and historical isolation).");

const candidate = { bytes: 105096, sha256: "dd5c66826747210ec52e39d662b0487f61e1926be05dc8602d812fac9ded6263" };
assert.deepEqual(workspaceCoreDeclarationContracts["2.0.0"], candidate);
assert.notDeepEqual(candidate, expected, 'V2-only retirement intentionally changes the upcoming major release');
assert.doesNotThrow(() => assertCoreDeclarationIdentity("2.0.0", candidate));
assert.throws(() => assertCoreDeclarationIdentity("2.0.0", historicalCoreDeclarationContract), /drifted/);

assert.deepEqual(workspaceCoreDeclarationContracts["2.0.1"], workspaceCoreDeclarationContracts["2.0.0"], "Patch retains the protected published declaration identity");
assert.doesNotThrow(() => assertCoreDeclarationIdentity("2.0.1", candidate));
assert.throws(() => assertCoreDeclarationIdentity("2.0.1", historicalCoreDeclarationContract), /drifted/);
