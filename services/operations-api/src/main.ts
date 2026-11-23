import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { devCustomerIdFromEnv, devCustomerMiddleware } from './orders/dev-customer.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  if (process.env.WEB_ORIGIN) {
    app.enableCors({ origin: process.env.WEB_ORIGIN });
  }
  const devCustomerId = devCustomerIdFromEnv(process.env);
  if (devCustomerId) {
    Logger.warn('DEV_CUSTOMER_ID is active: every request is treated as one customer. Development only.', 'Bootstrap');
    app.use(devCustomerMiddleware(devCustomerId));
  }
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);
}

bootstrap();
