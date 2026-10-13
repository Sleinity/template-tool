import { verifySaveScheduling, verifySaveSchedulingExtras } from "./saveScheduling.integration";
await verifySaveScheduling();
await verifySaveSchedulingExtras();
console.log("Native save scheduling, generation boundaries, publication policies and resource pins passed.");
