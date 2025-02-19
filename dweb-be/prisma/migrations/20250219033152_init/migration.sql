-- CreateTable
CREATE TABLE "FileUpload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" INTEGER NOT NULL,
    "githubUrl" TEXT,
    "commitHash" TEXT,
    "fileHash" TEXT,
    "localPath" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Deployment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uploadId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "ensName" TEXT,
    "ipfsCid" TEXT,
    "deployedAt" DATETIME,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "FileUpload_id_key" ON "FileUpload"("id");

-- CreateIndex
CREATE INDEX "FileUpload_id_githubUrl_fileHash_idx" ON "FileUpload"("id", "githubUrl", "fileHash");

-- CreateIndex
CREATE UNIQUE INDEX "Deployment_uploadId_key" ON "Deployment"("uploadId");

-- CreateIndex
CREATE INDEX "Deployment_uploadId_ensName_idx" ON "Deployment"("uploadId", "ensName");
