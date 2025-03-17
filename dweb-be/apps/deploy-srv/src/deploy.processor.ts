import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DeployService } from './deploy.service';
import { Logger } from '@nestjs/common';

@Processor('deploy-queue')
export class DeployProcessor extends WorkerHost {
  private readonly logger = new Logger(DeployProcessor.name);
  constructor(private readonly deployService: DeployService) {
    super();
  }

  async process(job: Job) {
    const deployId = job.data as number;
    this.logger.log(`[DEPLOY] Processing deployment has ID: ${deployId}`);

    try {
      // Step 1: Get Code from File Server
      const [projectPath, uploadId] =
        await this.deployService.fetchProject(deployId);
      this.logger.log(`[DEPLOY] Project fetched: ${projectPath}`);
      await job.updateProgress(33);

      // Step 2: Build the frontend
      const buildPath = await this.deployService.buildProject(projectPath);
      this.logger.log(`[DEPLOY] Build completed: ${JSON.stringify(buildPath)}`);
      await job.updateProgress(66);

      // Step 3: Upload to IPFS
      const ipfsCid = await this.deployService.uploadToIPFS(
        uploadId,
        projectPath,
      );
      this.logger.log(`[DEPLOY] Uploaded to IPFS: ${ipfsCid}`);
      await job.updateProgress(100);

      // Mark job as completed
      return { deployId, status: 'deployed', ipfsCid };
    } catch (error) {
      this.logger.error(
        `Failed to process project: ${deployId} - err: ${JSON.stringify(error)}`,
      );
      return { deployId, status: 'failed', error: JSON.stringify(error) };
    }
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job) {
    this.logger.log(
      `Job ${job.id} has completed with result: ${JSON.stringify(job)}`,
    );
    if (!job.returnvalue) {
      this.logger.error(`Job ${job.id} has no return value`);
      return;
    }
    await this.deployService.updateIPFSCid(
      job.returnvalue.deployId as number,
      job.returnvalue.ipfsCid as string,
      job.returnvalue.status as string,
      job.returnvalue.error?.toString() || '',
    );
  }
}
