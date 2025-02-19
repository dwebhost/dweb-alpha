import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { AppService } from './app.service';
import { UploadGithub } from './dto/upload-github';
import * as path from 'node:path';
import { existsSync, createReadStream, unlink } from 'node:fs';
import type { Response } from 'express';

@Controller('api/files')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('upload/github')
  uploadGithub(@Body() data: UploadGithub) {
    return this.appService.uploadGithub(data);
  }

  @Get('download/:uploadId')
  async downloadProject(
    @Param('uploadId') uploadId: string,
    @Res() res: Response,
  ) {
    if (!uploadId) {
      throw new BadRequestException('Invalid upload ID');
    }

    const uploadInfo = await this.appService.getUploadInfo(uploadId);
    if (!existsSync(uploadInfo.path)) {
      throw new NotFoundException('Project not found');
    }

    const zipPath = path.join('/tmp', `${uploadId}.zip`);

    // Zip the project before sending
    await this.appService.zipProject(uploadInfo.path, zipPath);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${uploadId}.zip"`,
    );

    // Create a readable stream and pipe it to the response
    const fileStream = createReadStream(zipPath);
    fileStream.pipe(res);

    // Cleanup ZIP file after the stream ends
    fileStream.on('close', () => {
      unlink(zipPath, (err) => {
        if (err) console.error(`Error deleting temp file ${zipPath}:`, err);
      });
    });
  }
}
