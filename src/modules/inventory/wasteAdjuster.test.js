import request from 'supertest';
import express from 'express';
import wasteAdjuster from './wasteAdjuster.js';

const app = express();
app.use(express.json());
app.use('/waste', wasteAdjuster);

describe('Waste Adjuster Module', () => {
  describe('POST /calculate-yield-cost', () => {
    it('should correctly calculate effective cost and trim loss premium', async () => {
      const res = await request(app)
        .post('/waste/calculate-yield-cost')
        .send({ purchasePrice: 100, yieldPercent: 80 });

      expect(res.statusCode).toBe(200);
      // Effective Cost = 100 / 0.8 = 125
      expect(res.body.effectiveCost).toBe(125);
      // Trim Loss Premium = 125 - 100 = 25
      expect(res.body.trimLossPremium).toBe(25);
    });

    it('should return 400 for invalid yieldPercent', async () => {
      const res = await request(app)
        .post('/waste/calculate-yield-cost')
        .send({ purchasePrice: 100, yieldPercent: 0 });
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 if parameters are missing', async () => {
      const res = await request(app)
        .post('/waste/calculate-yield-cost')
        .send({ purchasePrice: 100 });
      expect(res.statusCode).toBe(400);
    });
  });
});
