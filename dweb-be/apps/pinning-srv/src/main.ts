import { NestFactory } from '@nestjs/core';
import { PinningSrvModule } from './pinning-srv.module';

async function bootstrap() {
  const app = await NestFactory.create(PinningSrvModule);
  app.enableCors();
  await app.listen(process.env.port ?? 6100);
}
bootstrap();
