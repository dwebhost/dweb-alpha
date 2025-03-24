import { NestFactory } from '@nestjs/core';
import { PinningSrvModule } from './pinning-srv.module';

async function bootstrap() {
  const app = await NestFactory.create(PinningSrvModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
