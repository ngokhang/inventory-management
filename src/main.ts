import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import cookieParser from 'cookie-parser';
import compression from 'compression';
import { GlobalExceptionFilter } from './filter/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new GlobalExceptionFilter(httpAdapterHost));

  app.use(cookieParser());
  app.use(compression());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
