import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { UploadGithub } from './dto/upload-github';
import { generate } from './utils';
import { FileService } from './file.service';
import { PrismaService } from './prisma.service';
import * as fs from 'node:fs';
import * as archiver from 'archiver';
import axios, { AxiosResponse } from 'axios';
import { DeployResponse } from '../../deploy-srv/src/dto/start-deploy';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly deployServiceUrl = process.env.DEPLOY_SERVICE_URL;

  constructor(
    private readonly fileSrv: FileService,
    private prisma: PrismaService,
  ) {}

  async uploadGithub(data: UploadGithub) {
    const repoUrl = data.url.trim();
    const envVarsJson = data.envJson;
    // const git = simpleGit();
    const isPublicRepo = await this.isRepoPublic(repoUrl);
    if (!isPublicRepo) {
      throw new BadRequestException('Repository is not public');
    }
    try {
      this.logger.log(`Uploading to Github: ${repoUrl}`);
      // const gitLog = await git.listRemote([repoUrl, `refs/heads/main`]);
      // const latestCommit = gitLog.split('\t')[0];

      const projectInfo = await this.prisma.project.findFirst({
        where: {
          githubUrl: repoUrl,
        },
      });

      const id = projectInfo ? projectInfo.id : generate();
      if (!projectInfo) {
        // save project info to db
        await this.prisma.project.upsert({
          where: {
            githubUrl: repoUrl,
          },
          update: {
            updatedAt: new Date(),
          },
          create: {
            id,
            githubUrl: repoUrl,
            outputDir: 'dist',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }
      // const projectPath = await this.fileSrv.saveFilesFromGithub(id, repoUrl);
      // call deploy service to deploy the project
      const deployId = await this.startDeployment(id, envVarsJson);

      return { deployId };
    } catch (error) {
      this.logger.error(`Error uploading to Github: ${error}`);
      throw error;
    }
  }

  // async getUploadInfo(uploadId: string) {
  //   try {
  //     this.logger.log(`Downloading from Github: ${uploadId}`);
  //     const fileUploaded = await this.prisma.fileUpload.findFirstOrThrow({
  //       where: {
  //         id: uploadId,
  //         type: 0, // 0 - for github
  //       },
  //     });
  //
  //     return { id: fileUploaded.id, path: fileUploaded.localPath };
  //   } catch (error) {
  //     this.logger.error(`Error downloading from Github: ${error}`);
  //     throw error;
  //   }
  // }

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

  async startDeployment(projectId: string, envVarsJson: string) {
    try {
      this.logger.log(`Starting deployment for uploadId: ${projectId}`);
      console.log('Deploy service URL:', this.deployServiceUrl);
      const response: AxiosResponse<DeployResponse> = await axios.post(
        `${this.deployServiceUrl}/api/deploy/start`,
        { projectId, envJson: envVarsJson },
      );

      this.logger.log(
        `Deployment started successfully for ${response.data.deployId}`,
      );
      this.logger.debug(JSON.stringify(response.data.deployId));
      return response.data.deployId;
    } catch (error) {
      this.logger.error(
        `Failed to start deployment for ${projectId}`,
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

  async getGithubUpload(repoUrl: string) {
    try {
      const result = await this.prisma.project.findFirst({
        where: {
          githubUrl: repoUrl,
        },
        include: {
          deployments: {
            orderBy: {
              createdAt: 'desc',
            },
            include: {
              environment: true,
            },
          },
        },
      });

      if (!result) {
        this.logger.log('No records found for this GitHub URL.');
        return null;
      }

      console.log('Result:', result);

      return result;
    } catch (error) {
      this.logger.error(`Error fetching data: ${error}`);
      return null;
    }
  }
}
