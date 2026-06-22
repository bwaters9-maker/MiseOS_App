import request from 'supertest';
import express from 'express';
import inventoryLedger from './inventoryLedger.js';

const app = express();
app.use(express.json());
app.use('/inventory', inventoryLedger);

describe('Inventory Ledger Module', () => {
  describe('GET /unit-cost/:ingredientId', () => {
    it('should return 403 if user is not executive', async () => {
      const res = await request(app).get('/inventory/unit-cost/1');
      expect(res.statusCode).toBe(403);
    });

    it('should return unit cost if user is executive', async () => {
      const res = await request(app)
        .get('/inventory/unit-cost/1')
        .set('x-user-role', 'executive');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('unitCost', 36.00);
    });

    it('should return 404 for non-existent ingredient', async () => {
      const res = await request(app)
        .get('/inventory/unit-cost/999')
        .set('x-user-role', 'executive');
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /update-cost', () => {
    it('should update cost if user is executive', async () => {
      const res = await request(app)
        .put('/inventory/update-cost')
        .set('x-user-role', 'executive')
        .send({ ingredientId: '1', newCost: 40.00 });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.updatedCost).toBe(40.00);
    });

    it('should return 400 if parameters are missing', async () => {
      const res = await request(app)
        .put('/inventory/update-cost')
        .set('x-user-role', 'executive')
        .send({ ingredientId: '1' });
      expect(res.statusCode).toBe(400);
    });
  });
});
