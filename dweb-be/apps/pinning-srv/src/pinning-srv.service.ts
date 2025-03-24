import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Chain, createPublicClient, http, PublicClient } from 'viem';
import { base, mainnet, optimism, sepolia } from 'viem/chains';
import { PrismaService } from '../../files-srv/src/prisma.service';
import { CONTRACT_ABI } from './abi/abi';

@Injectable()
export class PinningSrvService {
  private readonly logger = new Logger(PinningSrvService.name);
  public publicClient: PublicClient;
  private NETWORK = process.env.NETWORK || 'mainnet';
  private RPC_URL = process.env.RPC_URL;
  private CONTRACTS =
    process.env.CONTRACTS ||
    '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63,0xDaaF96c344f63131acadD0Ea35170E7892d3dfBA';

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
  async handleCron() {
    this.logger.debug('Called when the current second is seconds 4');
    await this.index(10n);
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
}
