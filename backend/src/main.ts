import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { ErrorHandlerMiddleware } from './middlewares/errorHandler.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalFilters(new ErrorHandlerMiddleware());
  // 直接挂在底层 express 上，确保 /health 不带 /api 前缀
  app.getHttpAdapter().getInstance().get('/health', (_req, res) => res.json({ status: 'ok', service: 'art-gallery' }));
  await app.listen(3000, '0.0.0.0');
}

void bootstrap();
