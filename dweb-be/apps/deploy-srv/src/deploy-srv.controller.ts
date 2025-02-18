import { Controller, Get } from '@nestjs/common';
import { DeploySrvService } from './deploy-srv.service';

@Controller()
export class DeploySrvController {
  constructor(private readonly deploySrvService: DeploySrvService) {}

  @Get()
  getHello(): string {
    return this.deploySrvService.getHello();
  }
}
