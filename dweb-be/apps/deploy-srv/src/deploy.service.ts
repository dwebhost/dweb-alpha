import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { existsSync, mkdirSync } from 'node:fs';
import { exec } from 'node:child_process';
import { getAllFiles } from './utils';
import { PinataSDK } from 'pinata-web3';
import { readFileSync } from 'fs';
import { PrismaService } from '../../files-srv/src/prisma.service';
import * as fs from 'node:fs';
import { StartDeploy } from './dto/start-deploy';
import { simpleGit } from 'simple-git';
import * as path from 'path';
import { UpdateEns } from './dto/update-ens';

@Injectable()
export class DeployService {
  private readonly logger = new Logger(DeployService.name);
  private buildPath = '/tmp/builds';
  private pinata = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT,
    pinataGateway: process.env.PINATA_GATEWAY_URL,
  });
  private githubBaseDir = path.join(__dirname, '../../storage/github');
  private git = simpleGit();

  constructor(
    @InjectQueue('deploy-queue') private deployQueue: Queue,
    private prisma: PrismaService,
  ) {
    if (!existsSync(this.buildPath)) {
      mkdirSync(this.buildPath, { recursive: true });
    }
  }

  async startDeploy(input: StartDeploy) {
    // insert into database
    const deployment = await this.prisma.deployment.create({
      data: {
        status: 'processing',
        createdAt: new Date(),
        updatedAt: new Date(),
        project: {
          connect: {
            id: input.projectId,
          },
        },
      },
    });
    await this.deployQueue.add(deployment.id.toString(), deployment.id, {
      removeOnComplete: true,
    });

    return { deployId: deployment.id, status: 'processing' };
  }

  async fetchProject(deployId: number) {
    this.logger.log(`[DEPLOY] Fetching project with deployment: ${deployId}`);

    const deployment = await this.prisma.deployment.findFirst({
      where: { id: deployId },
      include: {
        project: {
          select: {
            githubUrl: true,
            environment: {
              select: {
                jsonText: true,
              },
            },
          },
        },
      },
    });
    if (!deployment) {
      throw new Error(`Deployment not found: ${deployId}`);
    }

    const projectPath = path.join(
      this.githubBaseDir,
      `${deployment.projectId}/${deployment.id}`,
    );
    const urlRepo = deployment.project ? deployment.project.githubUrl : '';
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
      this.logger.log(`Cloning ${urlRepo} to ${projectPath}`);
    }

    await this.git.clone(urlRepo, projectPath);

    if (deployment.project && deployment.project.environment) {
      const jsonEnv = JSON.parse(deployment.project.environment.jsonText) as {
        key: string;
        value: string;
      }[];
      this.writeEnv(projectPath, jsonEnv);
    }

    return [projectPath, `${deployment.projectId}-${deployment.id}`];
  }

  buildProject(projectPath: string) {
    return new Promise<string>((resolve, reject) => {
      this.logger.log(`[DEPLOY] Building project at: ${projectPath}`);
      const child = exec(`cd ${projectPath} && npm install && npm run build`);

      child.stdout?.on('data', function (data) {
        console.log('stdout: ' + data);
      });
      child.stderr?.on('data', function (data) {
        console.error('stderr: ' + data);
      });

      child.on('close', function (code) {
        console.log(`[DEPLOY] Build process exited with code ${code}`);
        if (code === 0) {
          resolve(projectPath);
        } else {
          reject(new Error(`Build failed with code ${code}`));
        }
      });
      child.on('error', reject);
    });
  }

  async uploadToIPFS(uploadId: string, buildPath: string) {
    this.logger.log(`[DEPLOY] Uploading to IPFS: ${buildPath}`);
    try {
      const distPath = `${buildPath}/dist`;

      const allFiles = getAllFiles(distPath);
      const fileNames = allFiles.map((file) =>
        file.replace(distPath + '/', ''),
      );
      console.log(allFiles);
      console.log(fileNames);
      const fileObjects: File[] = [];
      allFiles.forEach((file, idx) => {
        const fileData = readFileSync(file);
        fileObjects.push(new File([fileData], fileNames[idx]));
      });

      // for (const file, idx of allFiles) {
      //   const fileData = readFileSync(file);
      //   fileObjects.push(new File([fileData], file));
      // }

      console.log(fileObjects);
      const uploadData = await this.pinata.upload.fileArray(fileObjects, {
        metadata: { name: uploadId },
      });
      const ipfsUrl = await this.pinata.gateways.convert(uploadData.IpfsHash);
      console.log(ipfsUrl);
      const parts = ipfsUrl.split('/ipfs/');
      return parts.length > 1 ? parts[1] : '';
    } catch (error) {
      this.logger.error(`Failed to upload to IPFS: ${error}`);
      throw error;
    }
  }

  async updateIPFSCid(
    deployId: number,
    ipfsCid: string,
    status: string,
    error: string,
  ) {
    this.logger.log(`[DEPLOY] Updating IPFS CID for ${deployId}: ${ipfsCid}`);
    // Update the database with the IPFS CID
    return this.prisma.deployment.update({
      where: { id: deployId },
      data: {
        ipfsCid,
        status,
        error,
        updatedAt: new Date(),
        deployedAt: new Date(),
      },
    });
  }

  async getDeployment(deployId: number) {
    return this.prisma.deployment.findFirstOrThrow({
      where: { id: Number(deployId) },
      select: {
        ipfsCid: true,
        status: true,
        error: true,
      },
    });
  }

  writeEnv(projectPath: string, envVars: { key: string; value: string }[]) {
    const envPath = `${projectPath}/.env`;
    this.logger.log(`[DEPLOY] Writing env to: ${envPath}`);
    const envFile = envVars
      .map(({ key, value }) => `${key}=${value}`)
      .join('\n');

    return fs.writeFileSync(envPath, envFile);
  }

  updateEns(input: UpdateEns) {
    this.logger.log(`[DEPLOY] Updating ENS for ${input.projectId}`);
    return this.prisma.project.update({
      where: { id: input.projectId },
      data: {
        ensName: input.ensDomain,
        updatedAt: new Date(),
        deployments: {
          update: {
            where: {
              id: input.deployId,
            },
            data: {
              status: 'ready',
              updatedAt: new Date(),
            },
          },
        },
      },
    });
  }
}
