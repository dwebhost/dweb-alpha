import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { DeployService } from './deploy.service';

@Controller('deploy')
export class DeployController {
  constructor(
    private readonly deployService: DeployService,
  ) {}

  // Start Deploy Process
  @Post('start')
  async startDeployment(@Body('uploadId') uploadId: string) {
    return this.deployService.startDeploy(uploadId);
  }

  // Check Deployment Status
  // @Get('status/:uploadId')
  // async getStatus(@Param('uploadId') uploadId: string) {
  //   const job = await this.deployQueue.getJob(uploadId);
  //
  //   if (!job) {
  //     return { uploadId, status: 'not found' };
  //   }
  //
  //   const state = await job.getState();
  //   const progress = job.progress;
  //   const result = await job.finished().catch(() => null);
  //
  //   return {
  //     uploadId,
  //     status: state,
  //     progress,
  //     ipfsCid: result?.ipfsCid || null,
  //   };
  // }
}
