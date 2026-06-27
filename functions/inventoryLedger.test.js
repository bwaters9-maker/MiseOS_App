import request from 'supertest';
import express from 'express';
import inventoryRoutes from './inventoryLedger.js';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// This test suite acts as an "audit" for our inventory ledger API.
jest.mock('firebase-admin/app', () => ({
  getApps: () => [{}],
  initializeApp: () => {},
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

const mockUpdate = jest.fn(() => Promise.resolve());
const mockGet = jest.fn();

jest.mock('firebase-admin/firestore', () => {
  const originalFirestore = jest.requireActual('firebase-admin/firestore');
  return {
    ...originalFirestore,
    getFirestore: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: mockGet,
        update: mockUpdate,
      })),
    })),
  };
});

// Setup an Express app instance for Supertest to run against.
const app = express();
app.use(express.json());
app.use('/api/inventory', inventoryRoutes);

describe('Inventory Ledger API - Receiving Dock Audit', () => {
  const mockAuth = getAuth();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PUT /api/inventory/update-cost', () => {
    test('Audit Point: Role Gate Enforcement - should block unauthorized users from bulk price updates', async () => {
      // This user has a valid token but lacks the executive role.
      mockAuth.verifyIdToken.mockResolvedValue({ uid: 'user_line_cook' });
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ role: 'Line' }),
      });

      const res = await request(app)
        .put('/api/inventory/update-cost')
        .set('Authorization', 'Bearer valid_token_no_permission')
        .send({ ingredientId: 'ing123', newCost: 9.99 });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('Insufficient permissions');
    });

    test('Audit Point: Bulk Price Update - should allow authorized users to update cost', async () => {
      // This user has executive privileges.
      mockAuth.verifyIdToken.mockResolvedValue({ uid: 'user_sous_chef' });
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ role: 'Sous' }),
      });

      const res = await request(app)
        .put('/api/inventory/update-cost')
        .set('Authorization', 'Bearer valid_token_with_permission')
        .send({ ingredientId: 'ing123', newCost: 9.99 });

      expect(res.statusCode).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith({ cost_per_unit: 9.99 });
    });
  });

  describe('GET /api/inventory/unit-cost/:ingredientId', () => {
    test('Audit Point: Unit Cost Precision - should accurately retrieve ingredient unit cost', async () => {
      mockAuth.verifyIdToken.mockResolvedValue({ uid: 'user_sous_chef' });
      mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ role: 'Sous' }) }) // For auth check
             .mockResolvedValueOnce({ exists: true, data: () => ({ name: 'Flour', cost_per_unit: 12.50 }) }); // For ingredient lookup

      const res = await request(app)
        .get('/api/inventory/unit-cost/ing123')
        .set('Authorization', 'Bearer valid_token_with_permission');

      expect(res.statusCode).toBe(200);
      expect(res.body.cost_per_unit).toBe(12.50);
    });
  });
});