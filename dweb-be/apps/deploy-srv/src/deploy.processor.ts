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
    const uploadId = job.data as string;
    console.log(`[DEPLOY] Processing project: ${uploadId}`);

    try {
      // Step 1: Get Code from File Server
      const projectPath = await this.deployService.fetchProject(uploadId);
      await job.updateProgress(33);

      // Step 2: Build the frontend
      const buildPath = await this.deployService.buildProject(projectPath);
      console.log(`[DEPLOY] Build completed: ${JSON.stringify(buildPath)}`);
      await job.updateProgress(66);

      // Step 3: Upload to IPFS
      const ipfsCid = this.deployService.uploadToIPFS(projectPath);
      await job.updateProgress(100);

      // Mark job as completed
      return { uploadId, status: 'completed', ipfsCid };
    } catch (error: unknown) {
      this.logger.error(
        `Failed to process project: ${uploadId} - err: ${JSON.stringify(error)}`,
      );
      return { uploadId, status: 'failed', error };
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(
      `Job ${job.id} has completed with result: ${JSON.stringify(job)}`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job) {
    this.logger.error(
      `Job ${job.id} has failed with error: ${job.failedReason}`,
    );
  }
}
