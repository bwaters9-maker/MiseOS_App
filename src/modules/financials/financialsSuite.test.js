import request from 'supertest';
import { app } from '../../../server';

describe('Financials and Inventory Integration Suite', () => {

  describe('Role-Based Access Control (RBAC)', () => {
    it('should return 401 if x-user-id header is missing (GET /api/inventory/unit-cost/:id)', async () => {
      const res = await request(app).get('/api/inventory/unit-cost/ing-1');
      expect(res.status).toBe(401);
    });

    it('should return 403 if user role is not Chef or Owner (GET /api/inventory/unit-cost/:id)', async () => {
      const res = await request(app)
        .get('/api/inventory/unit-cost/ing-1')
        .set('x-user-id', 'user-linecook-1');
      expect(res.status).toBe(403);
    });

    it('should return 401 if x-user-id header is missing (POST /api/financials/detect-leak)', async () => {
      const res = await request(app).post('/api/financials/detect-leak').send({});
      expect(res.status).toBe(401);
    });

    it('should return 403 if user role is not Chef or Owner (POST /api/financials/detect-leak)', async () => {
      const res = await request(app)
        .post('/api/financials/detect-leak')
        .set('x-user-id', 'user-linecook-1')
        .send({});
      expect(res.status).toBe(403);
    });
  });

  describe('Inventory Ledger - Unit Cost Calculation', () => {
    it('should correctly calculate unit cost from bulk cost and conversion multiplier', async () => {
      const res = await request(app)
        .get('/api/inventory/unit-cost/ing-1')
        .set('x-user-id', 'user-chef-1');

      expect(res.status).toBe(200);
      // ing-1: bulkCost 100, conversionMultiplier 10 => unitCost 10
      expect(res.body.unitCost).toBe(10);
    });

    it('should return 404 for non-existent ingredient', async () => {
      const res = await request(app)
        .get('/api/inventory/unit-cost/non-existent')
        .set('x-user-id', 'user-chef-1');

      expect(res.status).toBe(404);
    });
  });

  describe('Financial Smoke Detector - Leak Detection', () => {
    it('should correctly sum costs and trigger alarm when margin is below target', async () => {
      const payload = {
        components: [
          { name: 'Salmon', cost: 15 },
          { name: 'Avocado', cost: 5 }
        ],
        salePrice: 24,
        targetMargin: 0.3 // 30% margin target
      };

      // Total cost = 20. Margin = (24 - 20) / 24 = 4 / 24 = 0.166...
      // 0.166 < 0.3 => smokeDetectorAlarm should be true

      const res = await request(app)
        .post('/api/financials/detect-leak')
        .set('x-user-id', 'user-owner-1')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.totalCost).toBe(20);
      expect(res.body.smokeDetectorAlarm).toBe(true);
    });

    it('should not trigger alarm when margin is above target', async () => {
      const payload = {
        components: [
          { name: 'Salmon', cost: 10 },
          { name: 'Avocado', cost: 2 }
        ],
        salePrice: 24,
        targetMargin: 0.3
      };

      // Total cost = 12. Margin = (24 - 12) / 24 = 12 / 24 = 0.5
      // 0.5 > 0.3 => smokeDetectorAlarm should be false

      const res = await request(app)
        .post('/api/financials/detect-leak')
        .set('x-user-id', 'user-owner-1')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.totalCost).toBe(12);
      expect(res.body.smokeDetectorAlarm).toBe(false);
    });
  });

});
