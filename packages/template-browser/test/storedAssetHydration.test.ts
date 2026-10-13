import { verifyStoredAssetHydration, verifyHydrationAcceptedOwnership } from "./storedAssetHydration.integration";
await verifyStoredAssetHydration();
await verifyHydrationAcceptedOwnership();
console.log("Stored-asset hydration native lifecycle regressions passed.");
