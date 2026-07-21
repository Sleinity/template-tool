import { METADATA_STORE, openTemplatePlatformDatabase } from "./indexedDbSchema";

export const SEMANTIC_RENDERER_MVP_MIGRATION_KEY = "semantic-renderer-mvp-migration";
export const SEMANTIC_RENDERER_MVP_MIGRATION_VERSION = "semantic-renderer-mvp-migration-v1";

export interface SemanticRendererMvpMigrationRecordV1 {
  schemaVersion: typeof SEMANTIC_RENDERER_MVP_MIGRATION_VERSION;
  obsoleteMetadataKeys: readonly ["renderer-rollout-preference", "renderer-rollout-cohort"];
  behavior: "ignored-inert";
}

export const semanticRendererMvpMigrationRecord: SemanticRendererMvpMigrationRecordV1 = {
  schemaVersion: SEMANTIC_RENDERER_MVP_MIGRATION_VERSION,
  obsoleteMetadataKeys: ["renderer-rollout-preference", "renderer-rollout-cohort"],
  behavior: "ignored-inert",
};

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function recordSemanticRendererMvpMigration(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const database = await openTemplatePlatformDatabase();
  const transaction = database.transaction(METADATA_STORE, "readwrite");
  transaction.objectStore(METADATA_STORE).put(
    semanticRendererMvpMigrationRecord,
    SEMANTIC_RENDERER_MVP_MIGRATION_KEY,
  );
  await transactionDone(transaction);
}
