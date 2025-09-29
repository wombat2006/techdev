import request from 'supertest';
import express from 'express';
import { createServer } from '../../src/index';

// Mock external dependencies
jest.mock('../../src/services/redis-service');
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }
}));

describe('API Integration Tests', () => {
  let app: express.Application;
  let server: any;

  beforeAll(async () => {
    // Create test server
    const result = await createServer();
    app = result.app;
    server = result.server;
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Health Check Endpoints', () => {
    test('GET /health should return 200', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('GET /api/v1/health should return detailed health info', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('services');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('API v1 Endpoints', () => {
    test('POST /api/v1/generate should handle basic request', async () => {
      const requestBody = {
        prompt: 'Test prompt',
        task_type: 'basic'
      };

      const response = await request(app)
        .post('/api/v1/generate')
        .send(requestBody)
        .expect(200);

      expect(response.body).toHaveProperty('response');
    });

    test('POST /api/v1/analyze-logs should handle log analysis', async () => {
      const requestBody = {
        user_command: 'systemctl start nginx',
        error_output: 'Failed to start nginx',
        system_context: 'Production server'
      };

      const response = await request(app)
        .post('/api/v1/analyze-logs')
        .send(requestBody)
        .expect(200);

      expect(response.body).toHaveProperty('analysis_result');
    });
  });

  describe('Session Management', () => {
    test('should create and manage session', async () => {
      const sessionData = {
        prompt: 'Test session',
        user_id: 'test-user'
      };

      const response = await request(app)
        .post('/api/v1/generate')
        .send(sessionData)
        .expect(200);

      expect(response.body).toHaveProperty('session_id');
      
      // Follow up request with same session
      const followUpResponse = await request(app)
        .post('/api/v1/generate')
        .send({
          prompt: 'Follow up question',
          session_id: response.body.session_id
        })
        .expect(200);

      expect(followUpResponse.body).toHaveProperty('response');
    });
  });

  describe('Error Handling', () => {
    test('should return 400 for missing required fields', async () => {
      await request(app)
        .post('/api/v1/generate')
        .send({})
        .expect(400);
    });

    test('should return 400 for invalid task_type', async () => {
      await request(app)
        .post('/api/v1/generate')
        .send({
          prompt: 'Test',
          task_type: 'invalid'
        })
        .expect(400);
    });

    test('should handle internal server errors gracefully', async () => {
      // This would require mocking services to throw errors
      const response = await request(app)
        .post('/api/v1/generate')
        .send({
          prompt: 'error-test',
          task_type: 'basic'
        });

      // Should not crash the server
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('CORS and Security', () => {
    test('should include CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check for helmet security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('Rate Limiting', () => {
    test('should handle multiple requests', async () => {
      const requests = Array(5).fill(null).map(() => 
        request(app)
          .get('/health')
          .expect(200)
      );

      await Promise.all(requests);
      // All requests should succeed (no rate limiting on health check)
    });
  });

  describe('Content Validation', () => {
    test('should validate JSON content type', async () => {
      await request(app)
        .post('/api/v1/generate')
        .set('Content-Type', 'text/plain')
        .send('invalid json')
        .expect(400);
    });

    test('should handle malformed JSON', async () => {
      await request(app)
        .post('/api/v1/generate')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });
  });
});