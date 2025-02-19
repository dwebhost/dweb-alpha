import { Module } from '@nestjs/common';
import { DeployController } from './deploy.controller';
import { DeployService } from './deploy.service';
import { BullModule } from '@nestjs/bullmq';
import { DeployProcessor } from './deploy.processor';

@Module({
  imports: [
    BullModule.forRoot({
      connection: { host: 'localhost', port: 16379 },
    }),
    BullModule.registerQueue({ name: 'deploy-queue' }),
  ],
  controllers: [DeployController],
  providers: [DeployService, DeployProcessor],
})
export class DeployModule {}
