// Smoke test toàn app: cần MongoDB thật (MONGODB_URI) và các biến JWT trong .env.
// Không chạy trong `npm test`; chạy riêng bằng `npm run test:e2e`.
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World! Baby chat is running...');
  });

  it('rejects protected routes without a token', () => {
    return request(app.getHttpServer()).get('/conversations').expect(401);
  });
});
