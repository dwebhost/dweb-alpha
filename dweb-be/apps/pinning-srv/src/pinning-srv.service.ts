import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Chain, createPublicClient, http, PublicClient } from 'viem';
import { base, mainnet, optimism, sepolia } from 'viem/chains';
import { PrismaService } from '../../files-srv/src/prisma.service';
import { CONTRACT_ABI } from './abi/abi';
import axios from 'axios';
import * as contentHash from 'content-hash';
import { type ContentHash } from '@prisma/client';
import { create } from 'ipfs-http-client';

@Injectable()
export class PinningSrvService {
  private readonly logger = new Logger(PinningSrvService.name);
  private NETWORK = process.env.NETWORK || 'mainnet';
  private RPC_URL = process.env.RPC_URL;
  private CONTRACTS =
    process.env.CONTRACTS ||
    '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63,0xDaaF96c344f63131acadD0Ea35170E7892d3dfBA';
  private IPFS_API = process.env.IPFS_API || 'http://localhost:5001/api/v0';
  private ENS_GRAPHQL =
    process.env.ENS_GRAPHQL ||
    'https://api.thegraph.com/subgraphs/name/ensdomains/ens';
  public publicClient: PublicClient;
  private ipfs: ReturnType<typeof create>;
  private isPinning = false;
  private isChecking = false;
  private isRetrying = false;
  private isDecoding = false;

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

    this.ipfs = create({ url: this.IPFS_API });
  }

  @Interval(20000)
  async handleIndex() {
    this.logger.debug('Called handleIndex');
    // await this.indexFromEnd(10n);
    await this.indexFromStart(100000n);
  }

  @Interval(20000)
  async handlePin() {
    this.logger.debug('Called handlePin');
    await this.pin();
  }

  @Interval(20000)
  async handleCheckCid() {
    this.logger.debug('Called handleCheckCid');
    await this.checkCid();
  }

  @Interval(20000)
  async handleRetry() {
    this.logger.debug('Called handleRetry');
    await this.retry();
  }

  @Interval(1000)
  async decodeNode() {
    this.logger.debug('Called decodeNode');
    if (this.isDecoding) {
      this.logger.debug('Already decoding');
      return;
    }
    this.isDecoding = true;
    try {
      await this.handleDecodeNode();
    } catch (e) {
      this.logger.error('Failed to decode node:', e);
    }
    this.isDecoding = false;
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

    if (!logs || logs.length === 0) {
      return;
    }
    // flatten logs to array
    const allLogs = logs.flat();
    this.logger.debug(`Indexing from block ${fromBlock} to ${toBlock}`);
    // console.log('allLogs', allLogs);

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

  async indexFromEnd(maxBehindHead: bigint) {
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

  async indexFromStart(maxBehindHead: bigint) {
    const syncedHead = await this.getSyncedHead();
    const lastHead = await this.getLastHead();

    // Start from block 1 if no synced head exists
    const fromBlock = syncedHead ? BigInt(syncedHead.blockNum) + 1n : 0n;

    // Calculate toBlock as syncedHead + maxBehindHead, but clamp to lastHead
    let toBlock = fromBlock + maxBehindHead - 1n;
    if (toBlock > lastHead.number) {
      toBlock = lastHead.number;
    }

    // If fromBlock proceed beyond lastHead, nothing to index
    if (toBlock < fromBlock) {
      return;
    }

    await this.indexRange(fromBlock, toBlock);

    // Update the synced head to the latest processed block
    await this.updateSyncedHead(toBlock);

    return {
      prevSyncedBlock: syncedHead?.blockNum || 0n,
      fromBlock,
      toBlock,
    };
  }

  async pin() {
    if (this.isPinning) {
      this.logger.debug('Already pinning');
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
    // First transaction: claim rows to process
    const rows = await this.prisma.$transaction(async (tx) => {
      // Raw query to lock rows for this instance
      await tx.contentHash.updateMany({
        where: {
          status: { in: ['checked', 'pinning'] },
        },
        data: {
          status: 'pinning',
          updatedAt: new Date(),
        },
        limit,
      });

      // Re-fetch just the claimed ones
      return tx.contentHash.findMany({
        where: {
          status: 'pinning',
        },
        orderBy: { updatedAt: 'desc' },
      });
    });

    return this.handleBatchPin(rows);
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

  async checkCid() {
    if (this.isChecking) {
      this.logger.debug('Already checking');
      return;
    }
    this.isChecking = true;
    try {
      const processed = await this.checkCidBatch(10);
      this.logger.log(`Processed checked ${processed} rows`);
    } catch (e) {
      this.logger.error('Failed to process batch:', e);
    }
    this.isChecking = false;
  }

  async checkCidBatch(limit = 10) {
    // TODO: handle multiple instances. This is not safe for multiple instances
    const rows: ContentHash[] = await this.prisma.contentHash.findMany({
      where: {
        status: 'created',
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const results = await Promise.allSettled(
      rows.map(async (row) => {
        try {
          const cid = this.extractCID(row.hash);
          this.logger.debug(`Handle CID: ${cid}`);

          try {
            const stream = this.ipfs.cat(cid, { timeout: 50000 });
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for await (const chunk of stream) {
              await this.prisma.contentHash.update({
                where: { id: row.id },
                data: { status: 'checked', updatedAt: new Date() },
              });
              this.logger.log(`✅ Checked ${cid}`);
              break;
            }
          } catch (err) {
            if (err.message.includes('dag node is a directory')) {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              for await (const file of this.ipfs.ls(cid)) {
                await this.prisma.contentHash.update({
                  where: { id: row.id },
                  data: { status: 'checked', updatedAt: new Date() },
                });
                this.logger.log(`✅ Checked ${cid}`);
                break;
              }
            } else {
              this.logger.error(
                `❌ Failed to check ID ${row.id}:`,
                err.message,
              );
              await this.prisma.contentHash.update({
                where: { id: row.id },
                data: { status: 'notfounded', updatedAt: new Date() },
              });
            }
          }
        } catch (err) {
          this.logger.error(`❌ Failed to check ID ${row.id}:`, err);

          await this.prisma.contentHash.update({
            where: { id: row.id },
            data: { status: 'failed', updatedAt: new Date() },
          });
        }
      }),
    );

    return results.filter((x) => x.status === 'fulfilled').length;
  }

  async retry() {
    if (this.isRetrying) {
      this.logger.debug('Already retrying');
      return;
    }
    this.isRetrying = true;
    try {
      const processed = await this.retryBatch(10);
      this.logger.log(`Processed retry ${processed} rows`);
    } catch (e) {
      this.logger.error('Failed to process retry batch:', e);
    }
    this.isRetrying = false;
  }

  async retryBatch(limit = 10) {
    const rows: ContentHash[] = await this.prisma.contentHash.findMany({
      where: {
        status: 'failed',
        retry: { lt: 6 },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return this.handleBatchPin(rows);
  }

  async handleBatchPin(rows: ContentHash[]) {
    const results = await Promise.allSettled(
      rows.map(async (row) => {
        try {
          const cid = this.extractCID(row.hash);
          this.logger.debug(`Retry CID: ${cid}`);

          try {
            await axios.post(`${this.IPFS_API}/pin/add?arg=${cid}`, null, {
              timeout: 10000, // 10 seconds timeout
            });

            await this.prisma.contentHash.update({
              where: { id: row.id },
              data: { status: 'pinned', updatedAt: new Date() },
            });

            this.logger.log(`✅ Pinned ${cid}`);
            return true;
          } catch (err) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            this.logger.error(`❌ Failed to pin ID ${row.id}:`, err.message);

            await this.prisma.contentHash.update({
              where: { id: row.id },
              data: {
                status: 'failed',
                retry: {
                  increment: 1,
                },
                updatedAt: new Date(),
              },
            });
            return false;
          }
        } catch (err) {
          this.logger.error(`❌ Failed to retry ID ${row.id}:`, err);

          await this.prisma.contentHash.update({
            where: { id: row.id },
            data: {
              status: 'failed',
              retry: {
                increment: 1,
              },
              updatedAt: new Date(),
            },
          });
        }
      }),
    );

    return results.filter((x) => x.status === 'fulfilled').length;
  }

  async getContentHashes(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.contentHash.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contentHash.count(),
    ]);

    // Convert the data to the desired format
    const formattedData = data.map((item) => {
      // extract CID
      let cid = '';
      try {
        cid = this.extractCID(item.hash);
      } catch (e) {
        this.logger.error(`Failed to extract CID from ${item.hash}: ${e}`);
      }

      return {
        id: item.id,
        node: item.node,
        ensName: item.ensName || '',
        hash: item.hash,
        cid: cid,
        status: item.status,
        retry: item.retry,
        updatedAt: item.updatedAt,
      };
    });

    return {
      items: formattedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async handleDecodeNode() {
    const rows = await this.prisma.contentHash.findMany({
      where: {
        ensName: '',
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const nodes = rows.map((row) => row.node);
    // remove duplicates
    const uniqueNodes = Array.from(new Set(nodes));
    if (uniqueNodes.length === 0) {
      return;
    }
    await this.resolveENSNodes(uniqueNodes);
  }

  async resolveENSNodes(nodes: string[]) {
    const query = `
    query {
      domains(where: { id_in: [${nodes.map((n) => `"${n}"`).join(',')}]}) {
        id
        name
      }
    }`;

    console.log('query', query);

    const res = await fetch(this.ENS_GRAPHQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ENS_GRAPHQL_TOKEN}`,
      },
      body: JSON.stringify({ query }),
    });

    const json = await res.json();
    if (json.errors) {
      this.logger.error(`Failed to resolve ENS nodes: ${json.errors}`);
      return;
    }

    // update the content hash with the name to database
    const updates = json.data.domains.map(
      (domain: { id: string; name: string }) => {
        return this.prisma.contentHash.updateMany({
          where: { node: domain.id },
          data: { ensName: domain.name },
        });
      },
    );
    await Promise.all(updates);
  }

  async getContentHash(node: string, page = 1, limit = 30) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.contentHash.findMany({
        where: {
          node,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contentHash.count(),
    ]);

    // Convert the data to the desired format
    const formattedData = data.map((item) => {
      // extract CID
      let cid = '';
      try {
        cid = this.extractCID(item.hash);
      } catch (e) {
        this.logger.error(`Failed to extract CID from ${item.hash}: ${e}`);
      }

      return {
        id: item.id,
        node: item.node,
        ensName: item.ensName || '',
        hash: item.hash,
        cid: cid,
        status: item.status,
        retry: item.retry,
        updatedAt: item.updatedAt,
      };
    });

    return {
      items: formattedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
