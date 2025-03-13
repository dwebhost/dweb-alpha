/*
  Warnings:

  - Added the required column `address` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "githubUrl" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "outputDir" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Project" ("createdAt", "githubUrl", "id", "outputDir", "updatedAt") SELECT "createdAt", "githubUrl", "id", "outputDir", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_id_key" ON "Project"("id");
CREATE UNIQUE INDEX "Project_githubUrl_key" ON "Project"("githubUrl");
CREATE INDEX "Project_githubUrl_address_idx" ON "Project"("githubUrl", "address");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
