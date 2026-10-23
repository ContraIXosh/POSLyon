import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

async function bootstrap(): Promise<void> {
  const logger = new Logger('BootstrapBackendCloud');
  const app = await NestFactory.create(AppModule);

  configureApp(app);

  const port = Number(process.env.PORT || 3000);
  await app.listen(port);
  logger.log(
    `Servidor @poslyon/backend-cloud escuchando en http://localhost:${port}/api/health`,
  );
}

void bootstrap();
