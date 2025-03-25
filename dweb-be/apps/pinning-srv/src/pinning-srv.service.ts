import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Chain, createPublicClient, http, PublicClient } from 'viem';
import { base, mainnet, optimism, sepolia } from 'viem/chains';
import { PrismaService } from '../../files-srv/src/prisma.service';
import { CONTRACT_ABI } from './abi/abi';
import axios from 'axios';
import * as contentHash from 'content-hash';
import { type ContentHash } from '@prisma/client';

@Injectable()
export class PinningSrvService {
  private readonly logger = new Logger(PinningSrvService.name);
  public publicClient: PublicClient;
  private NETWORK = process.env.NETWORK || 'mainnet';
  private RPC_URL = process.env.RPC_URL;
  private CONTRACTS =
    process.env.CONTRACTS ||
    '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63,0xDaaF96c344f63131acadD0Ea35170E7892d3dfBA';
  private IPFS_API = process.env.IPFS_API || 'http://localhost:5001/api/v0';
  private isPinning = false;

  constructor(private prisma: PrismaService) {
    let chain: Chain;
    switch (this.NETWORK) {
      case 'optimism':
        chain = optimism;
        break;
      case 'base':
        chain = base;
        break;
      case 'sepolia':
        chain = sepolia;
        break;
      default:
        chain = mainnet;
    }

    this.publicClient = createPublicClient({
      chain: chain,
      transport: http(this.RPC_URL),
    }) as PublicClient;
  }

  @Interval(20000)
  async handleIndex() {
    this.logger.debug('Called when the current second is 20s');
    await this.index(10n);
  }

  @Interval(10000)
  async handlePin() {
    this.logger.debug('Called when the current second is 20s');
    await this.pin();
  }

  async getLastHead() {
    return this.publicClient.getBlock();
  }

  async getSyncedHead() {
    return this.prisma.syncInfo.findUnique({
      where: {
        chain: this.NETWORK,
      },
    });
  }

  async updateSyncedHead(blockNum: bigint) {
    return this.prisma.syncInfo.upsert({
      where: {
        chain: this.NETWORK,
      },
      create: {
        chain: this.NETWORK,
        blockNum,
        updatedAt: new Date(),
      },
      update: {
        blockNum,
      },
    });
  }

  async indexRange(fromBlock: bigint, toBlock: bigint) {
    const constracts = this.CONTRACTS.trim().split(',');
    // get logs for each contract parallel
    const logs = await Promise.all(
      constracts.map((contract) =>
        this.publicClient.getContractEvents({
          address: contract as `0x${string}`,
          abi: CONTRACT_ABI,
          fromBlock,
          toBlock,
          eventName: 'ContenthashChanged',
        }),
      ),
    );

    console.log('logs', logs);
    if (!logs || logs.length === 0) {
      return;
    }
    // flatten logs to array
    const allLogs = logs.flat();
    console.log('allLogs', allLogs);

    const submitEvents = allLogs.map((log) => ({
      txHash: (log as unknown as { transactionHash: `0x${string}` })
        .transactionHash,
      node: (log as unknown as { args: { node: string } }).args.node,
      hash: (log as unknown as { args: { hash: string } }).args.hash,
      blockNumber: (log as unknown as { blockNumber: bigint }).blockNumber,
    }));

    const persistJobs = submitEvents.map((event) => {
      return this.prisma.contentHash.upsert({
        where: { txHash: event.txHash },
        create: {
          txHash: event.txHash,
          node: event.node,
          hash: event.hash,
          blockNum: event.blockNumber || 0n,
          status: 'created',
          updatedAt: new Date(),
        },
        update: {},
      });
    });

    await Promise.all(persistJobs);
  }

  async index(maxBehindHead: bigint) {
    const syncedHead = await this.getSyncedHead();
    const lastHead = await this.getLastHead();
    let toBlock = lastHead.number;

    let fromBlock: bigint = toBlock - maxBehindHead;
    if (syncedHead && syncedHead.blockNum >= fromBlock) {
      fromBlock = BigInt(syncedHead.blockNum) + 1n;
    }

    if (toBlock <= fromBlock) {
      return;
    }

    if (syncedHead && fromBlock > syncedHead.blockNum) {
      fromBlock = BigInt(syncedHead.blockNum) + 1n;
      toBlock = fromBlock + maxBehindHead;
    }

    await this.indexRange(fromBlock, toBlock);

    // point to the latest
    await this.updateSyncedHead(toBlock);

    return {
      prevSyncedBlock: syncedHead?.blockNum || 0n,
      fromBlock,
      toBlock,
    };
  }

  async pin() {
    if (this.isPinning) {
      return;
    }
    this.isPinning = true;
    try {
      const processed = await this.processBatch(10);
      this.logger.log(`Processed ${processed} rows`);
    } catch (e) {
      this.logger.error('Failed to process batch:', e);
    }
    this.isPinning = false;
  }

  async processBatch(limit = 10) {
    // Start transaction
    return await this.prisma.$transaction(async (tx) => {
      // Raw query to lock rows for this instance
      const claimed = await tx.contentHash.updateMany({
        where: {
          status: 'created',
        },
        data: {
          status: 'pinning',
          updatedAt: new Date(),
        },
        limit,
      });

      // Re-fetch just the claimed ones
      const rows: ContentHash[] = await tx.contentHash.findMany({
        where: {
          status: 'pinning',
        },
        orderBy: { updatedAt: 'desc' },
        take: claimed.count,
      });

      for (const row of rows) {
        try {
          const cid = this.extractCID(row.hash);
          console.log('cid', cid);
          await axios.post(`${this.IPFS_API}/pin/add?arg=${cid}`);

          await tx.contentHash.update({
            where: { id: row.id },
            data: { status: 'pinned', updatedAt: new Date() },
          });

          this.logger.log(`✅ Pinned ${cid}`);
        } catch (err) {
          this.logger.error(`❌ Failed to pin ID ${row.id}:`, err);

          await tx.contentHash.update({
            where: { id: row.id },
            data: { status: 'failed', updatedAt: new Date() },
          });
        }
      }

      return rows.length;
    });
  }

  extractCID(encoded: string): string {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-return
    return contentHash.decode(encoded);
  }

  async getStatistics() {
    try {
      const countEnsRaw = await this.prisma.$queryRawUnsafe<
        { count: number }[]
      >(
        `SELECT COUNT(DISTINCT node) as count FROM "ContentHash" WHERE node IS NOT NULL AND node != ''`,
      );

      const countEns =
        countEnsRaw.length > 0 ? Number(countEnsRaw[0].count) : 0;

      const countContentRaw = await this.prisma.$queryRawUnsafe<
        { count: number }[]
      >(
        `SELECT COUNT(DISTINCT hash) as count FROM "ContentHash" WHERE hash IS NOT NULL AND hash != ''`,
      );

      const countContent =
        countContentRaw.length > 0 ? Number(countContentRaw[0].count) : 0;

      const numPinnedRaw = await this.prisma.$queryRawUnsafe<
        { count: number }[]
      >(
        `SELECT COUNT(DISTINCT hash) as count FROM "ContentHash" WHERE status = 'pinned'`,
      );

      const numPinned =
        numPinnedRaw.length > 0 ? Number(numPinnedRaw[0].count) : 0;
      const statsIPFS = await this.getStorageStats();

      return {
        numENS: countEns,
        numContentHash: countContent,
        numPinned: numPinned,
        storageUsed: `${statsIPFS.usedMB} MB`,
      };
    } catch (error) {
      this.logger.error(`Failed to get statistics: ${error}`);
      return {
        numENSHasContentHash: 0,
        numPinned: 0,
      };
    }
  }

  async getStorageStats() {
    try {
      const res = await axios.post(`${this.IPFS_API}/repo/stat`);
      const { RepoSize, StorageMax, NumObjects } = res.data;

      return {
        usedBytes: RepoSize,
        maxBytes: StorageMax,
        files: NumObjects,
        usedMB: (RepoSize / 1024 / 1024).toFixed(2),
      };
    } catch (error) {
      this.logger.error('Failed to get IPFS storage stats', error);
      throw error;
    }
  }
}
