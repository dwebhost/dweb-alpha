/*
  Warnings:

  - A unique constraint covering the columns `[githubUrl,githubBranch]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Project_githubUrl_key";

-- CreateIndex
CREATE UNIQUE INDEX "Project_githubUrl_githubBranch_key" ON "Project"("githubUrl", "githubBranch");
