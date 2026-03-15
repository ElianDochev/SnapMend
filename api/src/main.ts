import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { join } from 'node:path';
import { getAppEnv } from './config/env';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const env = getAppEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const clientDistPath = join(process.cwd(), '..', 'client', 'dist');

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  app.useStaticAssets(clientDistPath);
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      next();
      return;
    }

    res.sendFile(join(clientDistPath, 'index.html'));
  });

  await app.listen(env.PORT);
}

void bootstrap();
