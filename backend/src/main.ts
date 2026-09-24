import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './shared/filters/http-exception.filter';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import * as morgan from 'morgan';
import { errorCode } from 'src/shared/utils/error-code';
import { getAllowedOrigins } from 'src/shared/config/cors';
import { CorsIoAdapter } from 'src/shared/config/cors-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Render (và đa số PaaS) đứng trước app 1 proxy: tin 1 hop để req.ip là IP thật của
  // client — nếu không, rate limit gom mọi người dùng vào chung IP của proxy.
  app.set('trust proxy', 1);
  // whitelist: strip field không khai báo trong DTO ở mọi endpoint (defense-in-depth).
  // Không dùng forbidNonWhitelisted (tránh 400 phá client hiện có) — chỉ silent-strip.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableCors({ origin: getAllowedOrigins(), credentials: true });
  app.useWebSocketAdapter(new CorsIoAdapter(app));
  app.use(morgan.default('dev'));

  // Serve file đã upload tại /uploads/<filename>. UPLOAD_DIR khớp với LocalStorageProvider.
  const uploadDir = process.env.UPLOAD_DIR ?? './uploads';
  app.useStaticAssets(join(process.cwd(), uploadDir), { prefix: '/uploads' });

  const config = new DocumentBuilder()
    .setTitle('BabyChat API')
    .setDescription('API cho ứng dụng chat BabyChat')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const swaggerPath = 'api/docs';
  SwaggerModule.setup(swaggerPath, app, document, {
    swaggerOptions: {
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT ?? 3000;

  try {
    await app.listen(port);
  } catch (error) {
    if (errorCode(error) === 'EADDRINUSE') {
      const logger = new Logger('Bootstrap');
      logger.error(
        `❌ Cổng (Port) ${port} đang bị chiếm dụng bởi một tiến trình khác!`,
      );
      logger.error(`👉 Chạy lệnh sau trong Terminal để giải phóng port:`);
      logger.error(`   npx kill-port ${port}`);
      logger.error(
        `Hoặc (Windows PowerShell): Stop-Process -Id (Get-NetTCPConnection -LocalPort ${port}).OwningProcess -Force`,
      );
      process.exit(1);
    }
    throw error;
  }

  const logger = new Logger('Bootstrap');
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger is running on: http://localhost:${port}/${swaggerPath}`);
}
void bootstrap();
