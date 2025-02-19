import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { DeployService } from './deploy.service';

@Controller('api/deploy')
export class DeployController {
  constructor(private readonly deployService: DeployService) {}

  // Start Deploy Process
  @Post('start')
  async startDeployment(@Body('uploadId') uploadId: string) {
    return this.deployService.startDeploy(uploadId);
  }

  // Check Deployment Status
  @Get('status/:uploadId')
  async getStatus(@Param('uploadId') uploadId: string) {
    return this.deployService.getDeployment(uploadId);
  }
}
