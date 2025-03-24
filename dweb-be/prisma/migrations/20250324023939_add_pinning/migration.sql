-- CreateTable
CREATE TABLE "SyncInfo" (
    "chain" TEXT NOT NULL PRIMARY KEY,
    "blockNum" BIGINT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ContentHash" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "txHash" TEXT NOT NULL,
    "node" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "blockNum" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SyncInfo_chain_key" ON "SyncInfo"("chain");

-- CreateIndex
CREATE INDEX "SyncInfo_chain_idx" ON "SyncInfo"("chain");

-- CreateIndex
CREATE UNIQUE INDEX "ContentHash_txHash_key" ON "ContentHash"("txHash");

-- CreateIndex
CREATE INDEX "ContentHash_id_node_status_idx" ON "ContentHash"("id", "node", "status");
