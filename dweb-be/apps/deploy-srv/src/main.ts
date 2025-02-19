import { NestFactory } from '@nestjs/core';
import { DeployModule } from './deploy.module';

async function bootstrap() {
  const app = await NestFactory.create(DeployModule);
  app.enableCors();
  await app.listen(process.env.port ?? 5200);
}
bootstrap();
