export const settlementScenarios = [
  { id: "text-short", fixtureId: "now-hiring-post", type: "text-edit", value: "JOIN US" },
  { id: "text-long", fixtureId: "now-hiring-post", type: "text-edit", value: "WE ARE SEEKING AN EXPERIENCED OFFICER TO LEAD A GROWING INTERNATIONAL TEAM ACROSS MULTIPLE REGIONS" },
  { id: "text-clear", fixtureId: "now-hiring-post", type: "text-edit", value: "<clear>" },
  { id: "root-width-800", fixtureId: "now-hiring-post", type: "container-resize", width: 800 },
  { id: "font-late-activation", fixtureId: "now-hiring-post", type: "font-state", fontId: "font:inter-tight:700:normal" },
  { id: "image-redecode", fixtureId: "now-hiring-post", type: "asset-state", assetId: "asset:image:ceab5479" },
];

export function selectScenarios(requested, fixtureId) {
  const selected = !requested || requested === "all" ? settlementScenarios : String(requested).split(",").map((id) => {
    const scenario = settlementScenarios.find((item) => item.id === id);
    if (!scenario) throw new Error(`Unknown settlement scenario ${id}.`);
    return scenario;
  });
  return selected.filter((item) => item.fixtureId === fixtureId);
}
