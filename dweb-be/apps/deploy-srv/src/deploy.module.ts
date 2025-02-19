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
      connection: { host: 'localhost', port: 16379 },
    }),
    BullModule.registerQueue({ name: 'deploy-queue' }),
  ],
  controllers: [DeployController],
  providers: [PrismaService, DeployService, DeployProcessor],
})
export class DeployModule {}
