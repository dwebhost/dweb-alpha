import { Injectable } from '@nestjs/common';
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

@Injectable()
export class DeployService {
  private fileServerUrl = 'http://localhost:5100';
  private buildPath = '/tmp/builds';

  constructor(@InjectQueue('deploy-queue') private deployQueue: Queue) {
    if (!existsSync(this.buildPath)) {
      mkdirSync(this.buildPath, { recursive: true });
    }
  }

  async startDeploy(uploadId: string) {
    await this.deployQueue.add(uploadId, uploadId, { removeOnComplete: true });

    return { uploadId, status: 'processing' };
  }

  async fetchProject(uploadId: string): Promise<string> {
    console.log(`[DEPLOY] Fetching project: ${uploadId}`);

    const zipPath = `/tmp/builds/${uploadId}.zip`;
    const extractPath = `${this.buildPath}/${uploadId}`;

    // Download ZIP from File Server
    const response: AxiosResponse<NodeJS.ReadableStream> = await axios.get(
      `${this.fileServerUrl}/download/${uploadId}`,
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

    console.log(`[DEPLOY] Code extracted to: ${extractPath}`);
    return extractPath;
  }

  buildProject(projectPath: string) {
    return new Promise<string>((resolve, reject) => {
      console.log(`[DEPLOY] Building project at: ${projectPath}`);
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

  uploadToIPFS(buildPath: string) {
    console.log(`[DEPLOY] Uploading to IPFS: ${buildPath}`);

    // Simulate IPFS upload and return a fake CID
    return `bafybeihyp3fakecidexample1234567`;
  }
}
