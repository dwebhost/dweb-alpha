-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "githubUrl" TEXT NOT NULL,
    "outputDir" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Deployment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "status" TEXT NOT NULL,
    "commitHash" TEXT,
    "ensName" TEXT,
    "ipfsCid" TEXT,
    "deployedAt" DATETIME,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "error" TEXT,
    "projectId" TEXT,
    CONSTRAINT "Deployment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Environment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jsonText" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "deploymentId" INTEGER NOT NULL,
    CONSTRAINT "Environment_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_id_key" ON "Project"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Project_githubUrl_key" ON "Project"("githubUrl");

-- CreateIndex
CREATE INDEX "Project_githubUrl_idx" ON "Project"("githubUrl");

-- CreateIndex
CREATE INDEX "Deployment_id_ensName_idx" ON "Deployment"("id", "ensName");

-- CreateIndex
CREATE UNIQUE INDEX "Environment_deploymentId_key" ON "Environment"("deploymentId");

-- CreateIndex
CREATE INDEX "Environment_id_idx" ON "Environment"("id");
