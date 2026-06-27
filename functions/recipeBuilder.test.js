import request from 'supertest';
import express from 'express';
import recipeRoutes from '../../../recipeRoutes.js';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// This test suite acts as a "Health & Safety Inspection" for our API.
// We mock the Firebase Admin SDK to isolate our Express routes for testing.
jest.mock('firebase-admin/app', () => ({
  getApps: () => [{}], // Pretend the app is initialized
  initializeApp: () => {},
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

jest.mock('firebase-admin/firestore', () => {
  const originalFirestore = jest.requireActual('firebase-admin/firestore');
  const mockDoc = jest.fn(() => ({
    get: jest.fn(),
  }));
  const mockCollection = jest.fn(() => ({
    doc: mockDoc,
    add: jest.fn(() => Promise.resolve({ id: 'newMenuItem123' })),
  }));
  return {
    ...originalFirestore,
    getFirestore: jest.fn(() => ({
      collection: mockCollection,
      batch: () => ({
        set: jest.fn(),
        commit: jest.fn(() => Promise.resolve()),
      }),
    })),
  };
});

// Setup an Express app instance for Supertest to run against.
const app = express();
app.use(express.json());
app.use('/api/recipes', recipeRoutes);

describe('Recipe Builder API - Health & Safety Inspection', () => {
  const mockDb = getFirestore();
  const mockAuth = getAuth();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/recipes/remix', () => {
    const validRecipeData = { title: 'Test Soup', yield: 4, margin_goal: 0.7, station: 'Hot Line' };

    test('Inspection Point: Kitchen Access Control - should halt unauthorized users with 403 Forbidden', async () => {
      // This user has a valid token but lacks the 'recipe_remix' permission.
      mockAuth.verifyIdToken.mockResolvedValue({ uid: 'user_no_permission' });
      mockDb.collection('users').doc('user_no_permission').get.mockResolvedValue({
        exists: true,
        data: () => ({ role: 'Line', permissions: 'recipe_read' }),
      });

      const res = await request(app)
        .post('/api/recipes/remix')
        .set('Authorization', 'Bearer valid_token_no_permission')
        .send({
          recipeData: validRecipeData,
          componentsData: [{ ingredient_id: 'ingredients/xyz123', quantity: 1, unit: 'each', calculated_cost: 0 }],
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('Insufficient permissions');
    });

    test('Inspection Point: Ingredient Provenance - should block unlinked ingredient strings with 400 Bad Request', async () => {
      // This user is authorized, but the payload is invalid.
      mockAuth.verifyIdToken.mockResolvedValue({ uid: 'user_with_permission' });
      mockDb.collection('users').doc('user_with_permission').get.mockResolvedValue({
        exists: true,
        data: () => ({ role: 'Sous', permissions: 'recipe_remix' }),
      });

      const res = await request(app)
        .post('/api/recipes/remix')
        .set('Authorization', 'Bearer valid_token_with_permission')
        .send({
          recipeData: validRecipeData,
          componentsData: [{ ingredient_id: 'some random onion', quantity: 1, unit: 'each', calculated_cost: 0 }],
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Component reference must be a valid document path');
    });
  });
});