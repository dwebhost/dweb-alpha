/*
  Warnings:

  - You are about to drop the column `ensName` on the `Deployment` table. All the data in the column will be lost.
  - You are about to drop the column `deploymentId` on the `Environment` table. All the data in the column will be lost.
  - You are about to drop the column `outputDir` on the `Project` table. All the data in the column will be lost.
  - Added the required column `projectId` to the `Environment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `githubBranch` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "BuildConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jsonText" TEXT NOT NULL,
    "outputDir" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "BuildConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Deployment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "status" TEXT NOT NULL,
    "commitHash" TEXT,
    "ipfsCid" TEXT,
    "error" TEXT,
    "deployedAt" DATETIME,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "projectId" TEXT,
    CONSTRAINT "Deployment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Deployment" ("commitHash", "createdAt", "deployedAt", "error", "id", "ipfsCid", "projectId", "status", "updatedAt") SELECT "commitHash", "createdAt", "deployedAt", "error", "id", "ipfsCid", "projectId", "status", "updatedAt" FROM "Deployment";
DROP TABLE "Deployment";
ALTER TABLE "new_Deployment" RENAME TO "Deployment";
CREATE INDEX "Deployment_id_idx" ON "Deployment"("id");
CREATE TABLE "new_Environment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jsonText" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "Environment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Environment" ("createdAt", "id", "jsonText", "updatedAt") SELECT "createdAt", "id", "jsonText", "updatedAt" FROM "Environment";
DROP TABLE "Environment";
ALTER TABLE "new_Environment" RENAME TO "Environment";
CREATE UNIQUE INDEX "Environment_projectId_key" ON "Environment"("projectId");
CREATE INDEX "Environment_id_idx" ON "Environment"("id");
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "githubUrl" TEXT NOT NULL,
    "githubBranch" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "ensName" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Project" ("address", "createdAt", "githubUrl", "id", "updatedAt") SELECT "address", "createdAt", "githubUrl", "id", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_id_key" ON "Project"("id");
CREATE UNIQUE INDEX "Project_githubUrl_key" ON "Project"("githubUrl");
CREATE INDEX "Project_githubUrl_address_idx" ON "Project"("githubUrl", "address");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "BuildConfig_projectId_key" ON "BuildConfig"("projectId");

-- CreateIndex
CREATE INDEX "BuildConfig_id_idx" ON "BuildConfig"("id");
