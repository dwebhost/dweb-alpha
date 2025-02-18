import { NestFactory } from '@nestjs/core';
import { DeploySrvModule } from './deploy-srv.module';

async function bootstrap() {
  const app = await NestFactory.create(DeploySrvModule);
  await app.listen(process.env.port ?? 5200);
}
bootstrap();
