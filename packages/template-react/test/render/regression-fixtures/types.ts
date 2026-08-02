import type { TemplatePackageV1 } from "@sleinity/template-core";
import type { TemplatePackageRenderMode } from "../../../src/render/TemplatePackageRenderer";

export type RendererFixtureGroup =
  | "sizing"
  | "constraints"
  | "auto-layout"
  | "clipping"
  | "image-fills"
  | "text"
  | "transforms"
  | "diagnostics";

export interface RendererNodeExpectation {
  nodeId: string;
  includes?: string[];
  excludes?: string[];
}

export interface RendererFixtureExpectation {
  nodes?: RendererNodeExpectation[];
  markupIncludes?: string[];
  warningCodes?: string[];
  excludedWarningCodes?: string[];
}

export interface RendererRegressionFixture {
  id: string;
  group: RendererFixtureGroup;
  description: string;
  mode: TemplatePackageRenderMode;
  packageValue: TemplatePackageV1;
  expect: RendererFixtureExpectation;
}
