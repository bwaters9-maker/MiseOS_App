import request from 'supertest';
import { app } from '../../../server';

describe('Menu Strategy Integration Tests', () => {
  const adminHeaders = {
    'x-user-id': 'chef-123',
    'x-user-role': 'Chef'
  };

  const nonAdminHeaders = {
    'x-user-id': 'prep-456',
    'x-user-role': 'LineCook'
  };

  describe('Authorization Blocks', () => {
    test('GET /api/strategy/audit/:releaseId returns 401 if x-user-id is missing', async () => {
      const response = await request(app).get('/api/strategy/audit/rel-1');
      expect(response.status).toBe(401);
    });

    test('GET /api/strategy/audit/:releaseId returns 403 for non-executive role', async () => {
      const response = await request(app)
        .get('/api/strategy/audit/rel-1')
        .set(nonAdminHeaders);
      expect(response.status).toBe(403);
    });

    test('GET /api/strategy/workload/:releaseId returns 401 if x-user-id is missing', async () => {
      const response = await request(app).get('/api/strategy/workload/rel-1');
      expect(response.status).toBe(401);
    });

    test('GET /api/strategy/workload/:releaseId returns 403 for non-executive role', async () => {
      const response = await request(app)
        .get('/api/strategy/workload/rel-1')
        .set(nonAdminHeaders);
      expect(response.status).toBe(403);
    });
  });

  describe('Menu Release Operations', () => {
    test('POST /api/strategy/initialize creates a new document with 201 status', async () => {
      const response = await request(app)
        .post('/api/strategy/initialize')
        .set(adminHeaders)
        .send({ name: 'Fall 2025 Menu', startDate: '2025-09-01' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
    });

    test('POST /api/strategy/link-recipe updates reference arrays atomically', async () => {
      const response = await request(app)
        .post('/api/strategy/link-recipe')
        .set(adminHeaders)
        .send({ releaseId: 'rel-1', recipeId: 'rec-1' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Recipe linked successfully');
    });
  });

  describe('Logic & Filters', () => {
    test('GET /api/strategy/audit/:releaseId performs recursive financial math lookups', async () => {
      const response = await request(app)
        .get('/api/strategy/audit/rel-1')
        .set(adminHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.metrics).toBeDefined();
      expect(response.body.data.metrics.totalCost).toBe(25); // 10 + 15
      expect(response.body.data.metrics.totalMenuPrice).toBe(90); // 40 + 50
    });

    test('GET /api/strategy/workload/:releaseId applies station-allocation filters', async () => {
      const response = await request(app)
        .get('/api/strategy/workload/rel-1?station=Sauté')
        .set(adminHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.workload.every(w => w.station === 'Sauté')).toBe(true);
      expect(response.body.data.workload.length).toBe(2);
    });
  });
});
