import type { NestExpressApplication } from '@nestjs/platform-express';
import { httpsOnly } from './security/https-only.middleware';

export function configureApp(app: NestExpressApplication): void {
  app.set('trust proxy', 1);
  app.enableCors({ origin: process.env.CORS_ALLOWED_ORIGIN ?? false });
  app.use(httpsOnly({ required: process.env.REQUIRE_HTTPS !== 'false' }));
}
