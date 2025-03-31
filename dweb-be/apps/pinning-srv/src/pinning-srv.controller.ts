import { Controller, Get, Query } from '@nestjs/common';
import { PinningSrvService } from './pinning-srv.service';
import {
  QueryContentHashByNodeDto,
  QueryContentHashDto,
} from './dto/query-content-hash.dto';

@Controller('/pinning')
export class PinningSrvController {
  constructor(private readonly pinningSrvService: PinningSrvService) {}

  @Get('/statistics')
  async getStatistics() {
    return this.pinningSrvService.getStatistics();
  }

  @Get('contenthashes')
  async getContentHashes(@Query() query: QueryContentHashDto) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);

    console.log('page', page);
    console.log('limit', limit);

    return this.pinningSrvService.getContentHashes(page, limit);
  }

  @Get('contenthash')
  async getContentHash(@Query() query: QueryContentHashByNodeDto) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '30', 10);
    const node = query.node;
    return this.pinningSrvService.getContentHash(node, page, limit);
  }
}
