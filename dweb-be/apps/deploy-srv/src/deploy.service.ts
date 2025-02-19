import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  unlinkSync,
  WriteStream,
} from 'node:fs';
import axios, { AxiosResponse } from 'axios';
import { exec } from 'node:child_process';
import { Open } from 'unzipper';
import { getAllFiles } from './utils';
import { PinataSDK } from 'pinata-web3';
import { readFileSync } from 'fs';
import { PrismaService } from '../../files-srv/src/prisma.service';

@Injectable()
export class DeployService {
  private readonly logger = new Logger(DeployService.name);
  private fileServerUrl =
    process.env.FILE_SERVICE_URL || 'http://localhost:5100';
  private buildPath = '/tmp/builds';
  private pinata = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT,
    pinataGateway: process.env.PINATA_GATEWAY_URL,
  });

  constructor(
    @InjectQueue('deploy-queue') private deployQueue: Queue,
    private prisma: PrismaService,
  ) {
    if (!existsSync(this.buildPath)) {
      mkdirSync(this.buildPath, { recursive: true });
    }
  }

  async startDeploy(uploadId: string) {
    await this.deployQueue.add(uploadId, uploadId, { removeOnComplete: true });

    // insert into database
    await this.prisma.deployment.upsert({
      where: { uploadId },
      update: { status: 'processing' },
      create: {
        uploadId,
        status: 'processing',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return { uploadId, status: 'processing' };
  }

  async fetchProject(uploadId: string): Promise<string> {
    this.logger.log(`[DEPLOY] Fetching project: ${uploadId}`);

    const zipPath = `/tmp/builds/${uploadId}.zip`;
    const extractPath = `${this.buildPath}/${uploadId}`;

    // Download ZIP from File Server
    const response: AxiosResponse<NodeJS.ReadableStream> = await axios.get(
      `${this.fileServerUrl}/api/files/download/${uploadId}`,
      { responseType: 'stream' },
    );

    const writer: WriteStream = createWriteStream(zipPath);
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    const dirZip = await Open.file(zipPath);
    await dirZip.extract({ path: extractPath });

    // Clean up the zip file
    unlinkSync(zipPath);

    this.logger.log(`[DEPLOY] Code extracted to: ${extractPath}`);
    return extractPath;
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

  async updateIPFSCid(uploadId: string, ipfsCid: string, status: string) {
    this.logger.log(`[DEPLOY] Updating IPFS CID for ${uploadId}: ${ipfsCid}`);
    // Update the database with the IPFS CID
    return this.prisma.deployment.upsert({
      where: { uploadId },
      update: {
        ipfsCid,
        status,
        updatedAt: new Date(),
        deployedAt: new Date(),
      },
      create: {
        uploadId,
        ipfsCid,
        status,
        deployedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async getDeployment(uploadId: string) {
    return this.prisma.deployment.findFirstOrThrow({
      where: { uploadId },
      select: {
        uploadId: true,
        ipfsCid: true,
        status: true,
        ensName: true,
        error: true,
      },
    });
  }
}
