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
import { create } from 'ipfs-http-client';

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
  private IPFS_API = process.env.IPFS_API || 'http://localhost:5001/api/v0';
  private ipfs: ReturnType<typeof create>;

  constructor(
    @InjectQueue('deploy-queue') private deployQueue: Queue,
    private prisma: PrismaService,
  ) {
    if (!existsSync(this.buildPath)) {
      mkdirSync(this.buildPath, { recursive: true });
    }

    this.ipfs = create({ url: this.IPFS_API });
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

    await this.prisma.environment.update({
      where: {
        projectId: input.projectId,
      },
      data: {
        jsonText: input.envJson,
        updatedAt: new Date(),
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
            githubBranch: true,
            environment: {
              select: {
                jsonText: true,
              },
            },
            buildConfig: {
              select: {
                outputDir: true,
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
    const outputDir = deployment.project?.buildConfig?.outputDir || 'dist';

    const projectPath = path.join(
      this.githubBaseDir,
      `${deployment.projectId}/${deployment.id}`,
    );
    let urlRepo = deployment.project ? deployment.project.githubUrl : '';
    if (!urlRepo || urlRepo === '') {
      throw new Error(
        `No GitHub URL found for project: ${deployment.projectId}`,
      );
    }
    if (!urlRepo.endsWith('.git')) {
      urlRepo += '.git';
    }
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
      this.logger.log(`Cloning ${urlRepo} to ${projectPath}`);
    }
    try {
      await this.git.clone(urlRepo, projectPath, [
        `--branch=${deployment.project?.githubBranch || 'main'}`,
        '--single-branch',
      ]);
    } catch (error) {
      this.logger.error(`Failed to clone project: ${error}`);
      throw error;
    }

    this.logger.log(`[DEPLOY] Cloned project to: ${projectPath}`);

    const repoGit = simpleGit(projectPath);
    let commitHash = '';
    let commitTitle = '';
    const log = await repoGit.log({ maxCount: 1 });

    if (log.latest) {
      commitHash = log.latest.hash;
      commitTitle = log.latest.message.split('\n')[0];

      console.log(`[GIT] Latest commit hash: ${commitHash}`);
      console.log(`[GIT] Latest commit title: ${commitTitle}`);
    }

    if (deployment.project && deployment.project.environment) {
      if (
        deployment.project.environment.jsonText &&
        deployment.project.environment.jsonText !== ''
      ) {
        const jsonEnv = JSON.parse(deployment.project.environment.jsonText) as {
          key: string;
          value: string;
        }[];
        this.writeEnv(projectPath, jsonEnv);
      }
    }

    return [
      projectPath,
      `${deployment.projectId}-${deployment.id}`,
      commitHash,
      commitTitle,
      outputDir,
    ];
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

  async uploadToIPFS(uploadId: string, buildPath: string, outputDir: string) {
    this.logger.log(`[DEPLOY] Uploading to IPFS: ${buildPath}`);
    try {
      const distPath = `${buildPath}/${outputDir}`;

      const allFiles = getAllFiles(distPath);
      const fileNames = allFiles.map((file) =>
        file.replace(distPath + '/', ''),
      );

      const numberHtmlFiles = fileNames.filter((file) =>
        file.endsWith('.html'),
      ).length;
      const fileObjects: File[] = [];
      allFiles.forEach((file, idx) => {
        const fileData = readFileSync(file);
        fileObjects.push(new File([fileData], fileNames[idx]));
      });

      if (numberHtmlFiles == 1) {
        // Add a _redirects file to make sure all routes are redirected to index.html
        const redirectsContent = '/* /index.html 200';
        const redirectsFile = new File([redirectsContent], '_redirects');
        fileObjects.push(redirectsFile);
      }

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

  async uploadToLocalIPFS(
    uploadId: string,
    buildPath: string,
    outputDir: string,
  ): Promise<string> {
    console.log(`[DEPLOY] Uploading to local IPFS: ${buildPath}`);

    try {
      const distPath = `${buildPath}/${outputDir}`;

      // gather all files
      const allFiles = getAllFiles(distPath);
      const fileNames = allFiles.map((file) =>
        file.replace(distPath + '/', ''),
      );

      // check number of .html files
      const numberHtmlFiles = fileNames.filter((file) =>
        file.endsWith('.html'),
      ).length;

      // Convert each local file into a "File" object or a node stream
      // For ipfs.addAll we can pass an object { path, content }
      const fileObjs: Array<{ path: string; content: Buffer }> = [];

      allFiles.forEach((localFilePath, idx) => {
        const fileData = readFileSync(localFilePath);
        fileObjs.push({
          path: fileNames[idx],
          content: fileData,
        });
      });

      // If exactly 1 HTML file => add _redirects
      if (numberHtmlFiles === 1) {
        const redirectsContent = '/* /index.html 200';
        fileObjs.push({
          path: '_redirects',
          content: Buffer.from(redirectsContent, 'utf-8'),
        });
      }

      console.log('Files to IPFS:', fileObjs);

      const results: string[] = [];
      for await (const fileResult of this.ipfs.addAll(fileObjs, {
        wrapWithDirectory: true,
      })) {
        // track each file result
        results.push(fileResult.cid.toString());
      }

      // The last item in results is typically the "folder" root CID
      const rootCid = results[results.length - 1];
      this.logger.debug(`Upload ID: ${uploadId} => Root CID: ${rootCid}`);

      return rootCid;
    } catch (error) {
      console.error(`Failed to upload to local IPFS: ${error}`);
      throw error;
    }
  }

  async updateIPFSCid(
    deployId: number,
    ipfsCid: string,
    status: string,
    error: string,
    commitHash: string,
    commitTitle: string,
  ) {
    this.logger.log(`[DEPLOY] Updating IPFS CID for ${deployId}: ${ipfsCid}`);
    // Update the database with the IPFS CID
    return this.prisma.deployment.update({
      where: { id: deployId },
      data: {
        ipfsCid,
        status,
        error,
        commitHash,
        commitTitle,
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
