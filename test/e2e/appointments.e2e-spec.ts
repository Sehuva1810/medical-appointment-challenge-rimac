import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

/**
 * E2E Tests for Appointments API
 *
 * These tests verify the complete flow from HTTP request to response.
 * For local testing, ensure LocalStack and MySQL are running.
 *
 * Run with: npm run test:e2e
 */
describe('Appointments API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Configure same pipes as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    app.setGlobalPrefix('api/v1');

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/appointments', () => {
    it('should create appointment with valid data (PE)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/appointments')
        .send({
          insuredId: '00001',
          scheduleId: 100,
          countryISO: 'PE',
        })
        .expect(202)
        .expect((res) => {
          expect(res.body.message).toBe('Appointment scheduling is in process');
          expect(res.body.appointmentId).toBeDefined();
          expect(typeof res.body.appointmentId).toBe('string');
        });
    });

    it('should create appointment with valid data (CL)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/appointments')
        .send({
          insuredId: '00002',
          scheduleId: 200,
          countryISO: 'CL',
        })
        .expect(202)
        .expect((res) => {
          expect(res.body.appointmentId).toBeDefined();
        });
    });

    it('should reject invalid insuredId (too short)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/appointments')
        .send({
          insuredId: '123',
          scheduleId: 100,
          countryISO: 'PE',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('insuredId');
        });
    });

    it('should reject invalid insuredId (non-numeric)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/appointments')
        .send({
          insuredId: 'abcde',
          scheduleId: 100,
          countryISO: 'PE',
        })
        .expect(400);
    });

    it('should reject invalid countryISO', () => {
      return request(app.getHttpServer())
        .post('/api/v1/appointments')
        .send({
          insuredId: '00001',
          scheduleId: 100,
          countryISO: 'US',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('countryISO');
        });
    });

    it('should reject negative scheduleId', () => {
      return request(app.getHttpServer())
        .post('/api/v1/appointments')
        .send({
          insuredId: '00001',
          scheduleId: -1,
          countryISO: 'PE',
        })
        .expect(400);
    });

    it('should reject missing insuredId', () => {
      return request(app.getHttpServer())
        .post('/api/v1/appointments')
        .send({
          scheduleId: 100,
          countryISO: 'PE',
        })
        .expect(400);
    });

    it('should reject missing countryISO', () => {
      return request(app.getHttpServer())
        .post('/api/v1/appointments')
        .send({
          insuredId: '00001',
          scheduleId: 100,
        })
        .expect(400);
    });

    it('should reject extra fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/appointments')
        .send({
          insuredId: '00001',
          scheduleId: 100,
          countryISO: 'PE',
          extraField: 'should not be here',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/appointments/:insuredId', () => {
    it('should return appointments for valid insuredId', () => {
      return request(app.getHttpServer())
        .get('/api/v1/appointments/00001')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('appointments');
          expect(res.body).toHaveProperty('total');
          expect(Array.isArray(res.body.appointments)).toBe(true);
        });
    });

    it('should return empty array for insuredId with no appointments', () => {
      return request(app.getHttpServer())
        .get('/api/v1/appointments/99999')
        .expect(200)
        .expect((res) => {
          expect(res.body.appointments).toEqual([]);
          expect(res.body.total).toBe(0);
        });
    });

    it('should reject invalid insuredId format', () => {
      return request(app.getHttpServer())
        .get('/api/v1/appointments/123')
        .expect(400);
    });
  });

  describe('GET /api/v1/appointments/:appointmentId/trace', () => {
    let appointmentId: string;

    beforeAll(async () => {
      // Create an appointment first to trace
      const response = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .send({
          insuredId: '00003',
          scheduleId: 300,
          countryISO: 'PE',
        });
      appointmentId = response.body.appointmentId;
    });

    it('should return flow trace for valid appointmentId', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/appointments/${appointmentId}/trace`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('appointmentId');
          expect(res.body).toHaveProperty('flowSteps');
          expect(res.body).toHaveProperty('completionPercentage');
          expect(res.body).toHaveProperty('summary');
          expect(Array.isArray(res.body.flowSteps)).toBe(true);
          expect(res.body.flowSteps.length).toBe(8);
        });
    });

    it('should return 404 for non-existent appointmentId', () => {
      return request(app.getHttpServer())
        .get('/api/v1/appointments/non-existent-uuid/trace')
        .expect(404);
    });
  });

  describe('Input Validation', () => {
    it('should sanitize and validate all input fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/appointments')
        .send({
          insuredId: '  00001  ', // with spaces - should be trimmed or rejected
          scheduleId: 100,
          countryISO: 'pe', // lowercase - should be case-insensitive or rejected
        })
        .expect((res) => {
          // Either accepts with normalization or rejects as invalid
          expect([200, 202, 400]).toContain(res.status);
        });
    });

    it('should reject SQL injection attempts', () => {
      return request(app.getHttpServer())
        .post('/api/v1/appointments')
        .send({
          insuredId: "' OR '1'='1",
          scheduleId: 100,
          countryISO: 'PE',
        })
        .expect(400);
    });

    it('should reject XSS attempts', () => {
      return request(app.getHttpServer())
        .post('/api/v1/appointments')
        .send({
          insuredId: '<script>alert("xss")</script>',
          scheduleId: 100,
          countryISO: 'PE',
        })
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      // Make 5 requests quickly
      const requests = Array(5)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .get('/api/v1/appointments/00001')
            .expect(200),
        );

      await Promise.all(requests);
    });
  });
});
