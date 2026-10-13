import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadManifest, repoRoot } from "../fidelity/core.mjs";
import {
  CONTROL_ID, GROUPS, assertCaptureIdentity, projectGroupPixel, projectIndependentChildOpacityPixel,
  projectOverlayGroupPixel,
  ROW_MODES, validateGroupProfile,
} from "./group-control-evidence.mjs";

const manifest = loadManifest();
const profile = JSON.parse(readFileSync(join(repoRoot, "fidelity", "gates",
  "phase9-compositing-group-control.json"), "utf8"));
validateGroupProfile(profile, manifest);
assert.equal(profile.fixture.id, CONTROL_ID);
assert.deepEqual(GROUPS.map((group) => group.mode), ["PASS_THROUGH", "NORMAL", "OVERLAY"]);
assert.deepEqual(ROW_MODES, ["DARKEN", "MULTIPLY", "SCREEN"]);
const wrongHash = structuredClone(profile);
wrongHash.fixture.zipSha256 = "0".repeat(64);
assert.throws(() => validateGroupProfile(wrongHash, manifest));
const duplicateScreenshot = structuredClone(profile);
duplicateScreenshot.screenshots[1] = structuredClone(duplicateScreenshot.screenshots[0]);
assert.throws(() => validateGroupProfile(duplicateScreenshot, manifest));
const paint = [{ color: { r: 0.9, g: 0.7, b: 1 }, blendMode: "MULTIPLY", opacity: 1 }];
const background = [125, 136, 29];
assert.notDeepEqual(projectGroupPixel(background, paint, "MULTIPLY", "PASS_THROUGH", 0.8),
  projectGroupPixel(background, paint, "MULTIPLY", "NORMAL", 0.8));
assert.throws(() => projectGroupPixel(background, paint, "MULTIPLY", "OVERLAY", 0.8),
  /only matched PASS_THROUGH and NORMAL/);
const twoFills = [paint[0], { color: { r: 1, g: 1, b: 0.4 }, blendMode: "NORMAL", opacity: 0.4 }];
assert.notDeepEqual(projectIndependentChildOpacityPixel(background, twoFills, 0.8),
  projectGroupPixel(background, twoFills, "MULTIPLY", "NORMAL", 0.8));
assert.notDeepEqual(projectOverlayGroupPixel(background, twoFills, "MULTIPLY", 0.8),
  projectOverlayGroupPixel(background, twoFills, "MULTIPLY", 0.8, false));
assert.doesNotThrow(() => assertCaptureIdentity({ selectedFixtures: [CONTROL_ID],
  fixtures: [{ id: CONTROL_ID, zipSha256: profile.fixture.zipSha256 }] }, profile.fixture.zipSha256));
assert.throws(() => assertCaptureIdentity({ selectedFixtures: [CONTROL_ID],
  fixtures: [{ id: CONTROL_ID, zipSha256: "0".repeat(64) }] }, profile.fixture.zipSha256),
  /exact source ZIP/);
console.log("Phase 9 group-control profile and isolation-model tests passed.");
