import request from 'supertest';
import express from 'express';
import wasteAdjusterRoutes from './wasteAdjuster.js';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// This test suite acts as a "Scale Calibration" audit for our waste adjuster API.
jest.mock('firebase-admin/app', () => ({
  getApps: () => [{}],
  initializeApp: () => {},
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

const mockGet = jest.fn();

jest.mock('firebase-admin/firestore', () => {
  const originalFirestore = jest.requireActual('firebase-admin/firestore');
  return {
    ...originalFirestore,
    getFirestore: jest.fn(() => ({
      collection: () => ({
        doc: () => ({
          get: mockGet,
        }),
      }),
    })),
  };
});

// Setup an Express app instance for Supertest to run against.
const app = express();
app.use(express.json());
app.use('/api/inventory', wasteAdjusterRoutes);

describe('Waste Adjuster API - Scale Calibration Audit', () => {
  const mockAuth = getAuth();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/inventory/calculate-yield-cost', () => {
    test('Audit Point: Role Gate Enforcement - should reject users without executive roles', async () => {
      mockAuth.verifyIdToken.mockResolvedValue({ uid: 'user_line_cook' });
      mockGet.mockResolvedValue({ exists: true, data: () => ({ role: 'Line' }) });

      const res = await request(app)
        .post('/api/inventory/calculate-yield-cost')
        .set('Authorization', 'Bearer valid_token_no_permission')
        .send({ purchaseCost: 100, purchaseQuantity: 10, yieldPercent: 50 });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('Insufficient permissions');
    });

    test('Audit Point: Zero Division Guard - should reject requests with zero yield', async () => {
      mockAuth.verifyIdToken.mockResolvedValue({ uid: 'user_sous_chef' });
      mockGet.mockResolvedValue({ exists: true, data: () => ({ role: 'Sous' }) });

      const res = await request(app)
        .post('/api/inventory/calculate-yield-cost')
        .set('Authorization', 'Bearer valid_token_with_permission')
        .send({ purchaseCost: 100, purchaseQuantity: 10, yieldPercent: 0 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Yield percent must be between 0 (exclusive) and 100 (inclusive)');
    });

    test('Audit Point: Premium Cost Scaling - should accurately scale cost from raw to fabricated weight', async () => {
      mockAuth.verifyIdToken.mockResolvedValue({ uid: 'user_sous_chef' });
      mockGet.mockResolvedValue({ exists: true, data: () => ({ role: 'Sous' }) });

      const res = await request(app)
        .post('/api/inventory/calculate-yield-cost')
        .set('Authorization', 'Bearer valid_token_with_permission')
        .send({ purchaseCost: 100, purchaseQuantity: 10, yieldPercent: 50 });

      // If we buy 10 units for $100, the invoice cost is $10/unit.
      // But if we only get 5 usable units (50% yield), the true cost is $20/unit.
      expect(res.statusCode).toBe(200);
      expect(res.body.trueCostPerUnit).toBe(20);
    });
  });
});