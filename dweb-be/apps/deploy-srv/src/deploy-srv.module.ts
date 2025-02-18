import { Module } from '@nestjs/common';
import { DeploySrvController } from './deploy-srv.controller';
import { DeploySrvService } from './deploy-srv.service';

@Module({
  imports: [],
  controllers: [DeploySrvController],
  providers: [DeploySrvService],
})
export class DeploySrvModule {}
