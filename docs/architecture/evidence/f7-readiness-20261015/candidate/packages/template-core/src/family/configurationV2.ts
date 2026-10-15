export type TemplateFamilyConfigurationOverrideV2<Configuration extends object> = {
  [Key in keyof Configuration]?: Configuration[Key] | null;
};

export interface ResolvedTemplateFamilyConfigurationV2<Configuration extends object> {
  configuration: Configuration;
  authority: Partial<Record<keyof Configuration, "family" | "variant" | "cleared">>;
}

/**
 * V2 family configuration is a shallow property override. Any supplied value,
 * including a choice set or array, replaces the common value atomically.
 * `null` clears an inherited optional property; arrays are never merged.
 */
export function resolveTemplateFamilyConfigurationV2<Configuration extends object>(
  common: Configuration,
  override?: TemplateFamilyConfigurationOverrideV2<Configuration>,
): ResolvedTemplateFamilyConfigurationV2<Configuration> {
  const configuration = structuredClone(common) as Record<keyof Configuration, unknown>;
  const authority: Partial<Record<keyof Configuration, "family" | "variant" | "cleared">> = {};
  for (const key of Object.keys(common) as Array<keyof Configuration>) {
    authority[key] = "family";
  }
  if (override) {
    for (const key of Object.keys(override) as Array<keyof Configuration>) {
      const value = override[key];
      if (value === null) {
        delete configuration[key];
        authority[key] = "cleared";
      } else if (value !== undefined) {
        configuration[key] = structuredClone(value);
        authority[key] = "variant";
      }
    }
  }
  return {
    configuration: configuration as Configuration,
    authority,
  };
}
