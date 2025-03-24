import { Module } from '@nestjs/common';
import { PinningSrvController } from './pinning-srv.controller';
import { PinningSrvService } from './pinning-srv.service';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from '../../files-srv/src/prisma.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [PinningSrvController],
  providers: [PinningSrvService, PrismaService],
})
export class PinningSrvModule {}
