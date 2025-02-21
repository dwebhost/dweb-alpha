import { Module } from '@nestjs/common';
import { DeployController } from './deploy.controller';
import { DeployService } from './deploy.service';
import { BullModule } from '@nestjs/bullmq';
import { DeployProcessor } from './deploy.processor';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../files-srv/src/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue({ name: 'deploy-queue' }),
  ],
  controllers: [DeployController],
  providers: [PrismaService, DeployService, DeployProcessor],
})
export class DeployModule {}
