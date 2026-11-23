import { NestFactory } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as dns from 'dns';

if (!process.env.VERCEL) {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

function configureApp(app: INestApplication) {
  const allowedOrigins = [
    'http://localhost:4200',
    'http://localhost:4000',
    'https://red-social-utn-sbfw.vercel.app',
    ...(process.env.FRONTEND_URL
      ? [process.env.FRONTEND_URL.replace(/\/$/, '')]
      : []),
  ];

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
}

let cachedServer: any;

export default async function handler(req: any, res: any) {
  if (!cachedServer) {
    const app = await NestFactory.create(AppModule);
    configureApp(app);
    await app.init();
    cachedServer = app.getHttpAdapter().getInstance();
  }
  return cachedServer(req, res);
}

if (!process.env.VERCEL) {
  async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    configureApp(app);
    await app.listen(process.env.PORT ?? 3000);
  }
  bootstrap();
}