import { Injectable } from '@nestjs/common';

@Injectable()
export class DeploySrvService {
  getHello(): string {
    return 'Hello World!';
  }
}
