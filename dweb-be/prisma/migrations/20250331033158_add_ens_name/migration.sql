-- AlterTable
ALTER TABLE "ContentHash" ADD COLUMN "ensName" TEXT DEFAULT '';

-- CreateIndex
CREATE INDEX "ContentHash_ensName_idx" ON "ContentHash"("ensName");

-- CreateIndex
CREATE INDEX "ContentHash_hash_idx" ON "ContentHash"("hash");

-- CreateIndex
CREATE INDEX "ContentHash_status_idx" ON "ContentHash"("status");
