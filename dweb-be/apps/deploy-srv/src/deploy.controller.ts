import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { DeployService } from './deploy.service';
import { StartDeploy } from './dto/start-deploy';

@Controller('api/deploy')
export class DeployController {
  constructor(private readonly deployService: DeployService) {}

  // Start Deploy Process
  @Post('start')
  async startDeployment(@Body() input: StartDeploy) {
    return this.deployService.startDeploy(input);
  }

  // Check Deployment Status
  @Get('status/:deployId')
  async getStatus(@Param('deployId') deployId: number) {
    console.log('deployId', deployId);
    return this.deployService.getDeployment(deployId);
  }
}
