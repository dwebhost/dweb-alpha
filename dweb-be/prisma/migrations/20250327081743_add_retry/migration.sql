-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ContentHash" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "txHash" TEXT NOT NULL,
    "node" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "blockNum" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "retry" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ContentHash" ("blockNum", "createdAt", "hash", "id", "node", "status", "txHash", "updatedAt") SELECT "blockNum", "createdAt", "hash", "id", "node", "status", "txHash", "updatedAt" FROM "ContentHash";
DROP TABLE "ContentHash";
ALTER TABLE "new_ContentHash" RENAME TO "ContentHash";
CREATE UNIQUE INDEX "ContentHash_txHash_key" ON "ContentHash"("txHash");
CREATE INDEX "ContentHash_id_node_status_idx" ON "ContentHash"("id", "node", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
