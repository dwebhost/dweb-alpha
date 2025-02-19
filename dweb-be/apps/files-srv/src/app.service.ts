import { Injectable, Logger } from '@nestjs/common';
import { UploadGithub } from './dto/upload-github';
import { simpleGit } from 'simple-git';
import { generate } from './utils';
import { FileService } from './file.service';
import { PrismaService } from './prisma.service';
import * as fs from 'node:fs';
import * as archiver from 'archiver';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly fileSrv: FileService,
    private prisma: PrismaService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async uploadGithub(data: UploadGithub) {
    try {
      this.logger.log(`Uploading to Github: ${data.url}`);
      const git = simpleGit();
      const gitLog = await git.log();
      const latestCommit = gitLog.latest?.hash || '';

      const fileUploaded = await this.prisma.fileUpload.findFirst({
        where: {
          type: 0, // 0 - for github
          githubUrl: data.url,
        },
      });
      if (fileUploaded && fileUploaded.commitHash === latestCommit)
        return { id: fileUploaded.id, path: fileUploaded.localPath };

      const id = generate(); // asd12
      const projectPath = await this.fileSrv.saveFilesFromGithub(id, data.url);

      // update or save file upload information to db
      await this.prisma.fileUpload.upsert({
        where: {
          id: fileUploaded ? fileUploaded.id : id, // Use existing ID if found
        },
        update: {
          commitHash: latestCommit,
          updatedAt: new Date(),
        },
        create: {
          id,
          githubUrl: data.url,
          commitHash: latestCommit,
          type: 0, // 0 - for GitHub
          localPath: projectPath,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return { id, path: projectPath };
    } catch (error) {
      this.logger.error(`Error uploading to Github: ${error}`);
      throw error;
    }
  }

  async getUploadInfo(uploadId: string) {
    try {
      this.logger.log(`Downloading from Github: ${uploadId}`);
      const fileUploaded = await this.prisma.fileUpload.findFirstOrThrow({
        where: {
          id: uploadId,
          type: 0, // 0 - for github
        },
      });

      return { id: fileUploaded.id, path: fileUploaded.localPath };
    } catch (error) {
      this.logger.error(`Error downloading from Github: ${error}`);
      throw error;
    }
  }

  async zipProject(sourceDir: string, zipFilePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', resolve);
      archive.on('error', reject);

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize().catch(reject);
    });
  }
}
