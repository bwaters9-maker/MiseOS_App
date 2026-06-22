import request from 'supertest';
import express from 'express';
import financialSmokeDetector from './financialSmokeDetector.js';

const app = express();
app.use(express.json());
app.use('/financials', financialSmokeDetector);

describe('Financial Smoke Detector Module', () => {
  describe('POST /detect-leak', () => {
    it('should detect a margin breach', async () => {
      const res = await request(app)
        .post('/financials/detect-leak')
        .send({ actualCost: 40, salePrice: 100, targetMarginPercent: 70 });

      expect(res.statusCode).toBe(200);
      expect(res.body.isBreach).toBe(true);
      // Actual Margin = (100-40)/100 = 60%
      // Target Margin = 70%
      // Leak = (0.7 * 100) - (100 - 40) = 70 - 60 = 10
      expect(res.body.actualMarginPercent).toBe(60);
      expect(res.body.leakAmount).toBe(10);
    });

    it('should NOT detect a breach when margin is met', async () => {
      const res = await request(app)
        .post('/financials/detect-leak')
        .send({ actualCost: 30, salePrice: 100, targetMarginPercent: 70 });

      expect(res.statusCode).toBe(200);
      expect(res.body.isBreach).toBe(false);
      expect(res.body.leakAmount).toBe(0);
    });

    it('should return 400 if parameters are missing', async () => {
      const res = await request(app)
        .post('/financials/detect-leak')
        .send({ actualCost: 30 });
      expect(res.statusCode).toBe(400);
    });
  });
});
