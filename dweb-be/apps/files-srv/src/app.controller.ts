import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { UploadGithub } from './dto/upload-github';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('upload/github')
  uploadGithub(@Body() data: UploadGithub) {
    return this.appService.uploadGithub(data);
  }
}
