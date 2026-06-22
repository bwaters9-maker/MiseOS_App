import request from 'supertest';
import { app } from '../../../server.ts';

describe('Financials and Inventory Integration Suite', () => {

  describe('Role-Based Access Control (RBAC)', () => {
    it('should return 403 if user role is not executive (GET /api/inventory/unit-cost/:id)', async () => {
      const res = await request(app)
        .get('/api/inventory/unit-cost/1')
        .set('x-user-role', 'linecook');
      expect(res.status).toBe(403);
    });
  });

  describe('Inventory Ledger - Unit Cost Calculation', () => {
    it('should correctly calculate unit cost', async () => {
      const res = await request(app)
        .get('/api/inventory/unit-cost/1')
        .set('x-user-role', 'executive');

      expect(res.status).toBe(200);
      // id 1: Atlantic Salmon Fillet => unitCost 36.00
      expect(res.body.unitCost).toBe(36.00);
    });

    it('should return 404 for non-existent ingredient', async () => {
      const res = await request(app)
        .get('/api/inventory/unit-cost/non-existent')
        .set('x-user-role', 'executive');

      expect(res.status).toBe(404);
    });
  });

});
