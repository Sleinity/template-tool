import type {
  PackageFieldBehavior,
  PackageImageFieldConstraints,
  PackageTextFieldConstraints,
} from "../types";
import type {
  ResolvedTemplateFamilyFieldRuleV1,
  TemplateFamilyFieldRuleOverrideV1,
  TemplateFamilyFieldRuleV1,
  TemplateFamilyRuleAuthorityV1,
} from "./types";

type RuleObject = Record<string, unknown>;

function resolveObject(
  common: RuleObject | undefined,
  override: RuleObject | null | undefined,
): {
  value: RuleObject | undefined;
  provenance: Record<string, TemplateFamilyRuleAuthorityV1>;
} {
  const value: RuleObject = structuredClone(common ?? {});
  const provenance: Record<string, TemplateFamilyRuleAuthorityV1> = {};
  for (const key of Object.keys(value)) provenance[key] = "family";
  if (override === null) {
    for (const key of Object.keys(value)) {
      delete value[key];
      provenance[key] = "cleared";
    }
  } else if (override) {
    for (const [key, next] of Object.entries(override)) {
      if (next === null) {
        delete value[key];
        provenance[key] = "cleared";
      } else if (next !== undefined) {
        value[key] = structuredClone(next);
        provenance[key] = "variant";
      }
    }
  }
  return {
    value: Object.keys(value).length > 0 ? value : undefined,
    provenance,
  };
}

export function resolveTemplateFamilyFieldRule(
  common: TemplateFamilyFieldRuleV1,
  override?: TemplateFamilyFieldRuleOverrideV1,
): ResolvedTemplateFamilyFieldRuleV1 {
  const constraints = resolveObject(
    common.constraints as RuleObject | undefined,
    override?.constraints as RuleObject | null | undefined,
  );
  const behavior = resolveObject(
    common.behavior as RuleObject | undefined,
    override?.behavior as RuleObject | null | undefined,
  );
  return {
    rule: {
      constraints: constraints.value as
        | PackageTextFieldConstraints
        | PackageImageFieldConstraints
        | undefined,
      behavior: behavior.value as PackageFieldBehavior | undefined,
    },
    provenance: {
      constraints: constraints.provenance,
      behavior: behavior.provenance,
    },
  };
}
