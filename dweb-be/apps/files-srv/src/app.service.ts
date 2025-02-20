import {BadRequestException, Injectable, Logger} from '@nestjs/common';
import { UploadGithub } from './dto/upload-github';
import { simpleGit } from 'simple-git';
import { generate } from './utils';
import { FileService } from './file.service';
import { PrismaService } from './prisma.service';
import * as fs from 'node:fs';
import * as archiver from 'archiver';
import axios from 'axios';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly deployServiceUrl = process.env.DEPLOY_SERVICE_URL;

  constructor(
    private readonly fileSrv: FileService,
    private prisma: PrismaService,
  ) {}

  async uploadGithub(data: UploadGithub) {
    const git = simpleGit();
    const isPublicRepo = await this.isRepoPublic(data.url);
    if (!isPublicRepo) {
      throw new BadRequestException('Repository is not public');
    }
    try {
      this.logger.log(`Uploading to Github: ${data.url}`);
      const gitLog = await git.listRemote([data.url, `refs/heads/main`]);
      const latestCommit = gitLog.split('\t')[0];

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

      // call deploy service to deploy the project
      await this.startDeployment(id);

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

  async startDeployment(uploadId: string) {
    try {
      this.logger.log(`Starting deployment for uploadId: ${uploadId}`);
      console.log('Deploy service URL:', this.deployServiceUrl);
      const response = await axios.post(
        `${this.deployServiceUrl}/api/deploy/start`,
        { uploadId },
      );

      this.logger.log(`Deployment started successfully for ${uploadId}`);
      this.logger.debug(JSON.stringify(response.data));
    } catch (error) {
      this.logger.error(
        `Failed to start deployment for ${uploadId}`,
        (error as Error).message,
      );
      throw new Error(
        `Failed to start deployment: ${(error as Error).message}`,
      );
    }
  }

  async isRepoPublic(repoUrl: string): Promise<boolean> {
    const resp = await fetch(repoUrl, {
      method: 'GET',
    });

    return resp.status === 200;
  }
}
