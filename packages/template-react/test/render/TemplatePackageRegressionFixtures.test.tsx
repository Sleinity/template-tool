import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { collectTemplatePackageRenderWarnings } from "../../src/render/packageRenderUtils";
import { rendererRegressionFixtures } from "./regression-fixtures";
import type { RendererFixtureGroup } from "./regression-fixtures";
import { TemplatePackageRenderer } from "../../src/render/TemplatePackageRenderer";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function openingTag(markup: string, nodeId: string): string {
  const marker = `data-package-node-id="${nodeId}"`;
  const markerIndex = markup.indexOf(marker);
  assert(markerIndex >= 0, `Node "${nodeId}" should be rendered.`);
  const tagStart = markup.lastIndexOf("<div", markerIndex);
  const tagEnd = markup.indexOf(">", markerIndex);
  return markup.slice(tagStart, tagEnd + 1);
}

const expectedGroups = new Set<RendererFixtureGroup>([
  "sizing",
  "constraints",
  "auto-layout",
  "clipping",
  "image-fills",
  "text",
  "transforms",
  "diagnostics",
]);
const seenGroups = new Set<RendererFixtureGroup>();
const seenIds = new Set<string>();

for (const fixture of rendererRegressionFixtures) {
  assert(
    !seenIds.has(fixture.id),
    `Renderer fixture ID "${fixture.id}" must be unique.`,
  );
  seenIds.add(fixture.id);
  seenGroups.add(fixture.group);

  const markup = renderToStaticMarkup(
    createElement(TemplatePackageRenderer, {
      packageValue: fixture.packageValue,
      mode: fixture.mode,
    }),
  );
  const warnings = collectTemplatePackageRenderWarnings(
    fixture.packageValue,
    fixture.mode,
  );
  const warningCodes = new Set(warnings.map((warning) => warning.code));

  for (const nodeExpectation of fixture.expect.nodes ?? []) {
    const tag = openingTag(markup, nodeExpectation.nodeId);
    for (const expected of nodeExpectation.includes ?? []) {
      assert(
        tag.includes(expected),
        `[${fixture.group}/${fixture.id}] Node "${nodeExpectation.nodeId}" should include "${expected}".\n${tag}`,
      );
    }
    for (const excluded of nodeExpectation.excludes ?? []) {
      assert(
        !tag.includes(excluded),
        `[${fixture.group}/${fixture.id}] Node "${nodeExpectation.nodeId}" should exclude "${excluded}".\n${tag}`,
      );
    }
  }

  for (const expected of fixture.expect.markupIncludes ?? []) {
    assert(
      markup.includes(expected),
      `[${fixture.group}/${fixture.id}] Markup should include "${expected}".`,
    );
  }
  for (const code of fixture.expect.warningCodes ?? []) {
    assert(
      warningCodes.has(code),
      `[${fixture.group}/${fixture.id}] Expected renderer warning "${code}". Received: ${[...warningCodes].join(", ") || "none"}.`,
    );
  }
  for (const code of fixture.expect.excludedWarningCodes ?? []) {
    assert(
      !warningCodes.has(code),
      `[${fixture.group}/${fixture.id}] Renderer warning "${code}" should not be emitted.`,
    );
  }
}

for (const group of expectedGroups) {
  assert(
    seenGroups.has(group),
    `Renderer fixture group "${group}" should contain fixtures.`,
  );
}

assert(
  rendererRegressionFixtures.length >= 40,
  "The renderer regression library should retain broad concern coverage.",
);
