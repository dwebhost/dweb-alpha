import { Controller, Get } from '@nestjs/common';
import { PinningSrvService } from './pinning-srv.service';

@Controller('/pinning')
export class PinningSrvController {
  constructor(private readonly pinningSrvService: PinningSrvService) {}

  @Get('/statistics')
  async getStatistics() {
    return this.pinningSrvService.getStatistics();
  }
}
