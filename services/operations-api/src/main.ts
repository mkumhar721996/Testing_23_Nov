import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { devCustomerMiddleware } from './orders/dev-customer.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  if (process.env.WEB_ORIGIN) {
    app.enableCors({ origin: process.env.WEB_ORIGIN });
  }
  if (process.env.DEV_CUSTOMER_ID && process.env.NODE_ENV !== 'production') {
    app.use(devCustomerMiddleware(process.env.DEV_CUSTOMER_ID));
  }
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);
}

bootstrap();
