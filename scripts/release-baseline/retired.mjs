/** Fixed 1.0.0 execution is closed; pure historical test helpers remain usable. */
export function refuseRetiredOperation(operation) {
  throw new Error(`SDK 1.0.0 ${operation} is retired after stable publication. Use pnpm sdk:baseline:verify; a future release requires a new reviewed candidate contract.`);
}
