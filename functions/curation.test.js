import request from 'supertest';
import express from 'express';
import conceptRoutes from './conceptRoutes.js'; // Adjusted path
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// This test suite acts as a "Health & Safety Inspection" for the Curation Rail API.
jest.mock('firebase-admin/app', () => ({
  getApps: () => [{}],
  initializeApp: () => {},
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

jest.mock('firebase-admin/firestore', () => {
  const originalFirestore = jest.requireActual('firebase-admin/firestore');
  return {
    ...originalFirestore,
    getFirestore: jest.fn(() => ({
      collection: jest.fn(() => ({
        add: jest.fn(() => Promise.resolve({ id: 'newConcept123' })),
      })),
    })),
  };
});

// Setup an Express app instance for Supertest to run against.
const app = express();
app.use(express.json());
app.use('/api/concepts', conceptRoutes);

describe('Curation Rail API - Health & Safety Inspection', () => {
  const mockAuth = getAuth();
  const mockDb = getFirestore();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/concepts/jot', () => {
    test('Inspection Point: Access Control - should halt unauthorized users with 403 Forbidden', async () => {
      // This user has a valid token but lacks the 'concept_jot' permission.
      mockAuth.verifyIdToken.mockResolvedValue({ uid: 'user_no_permission' });
      mockDb.collection('users').doc('user_no_permission').get.mockResolvedValue({
        exists: true,
        data: () => ({ role: 'Line', permissions: 'recipe_read' }),
      });

      const res = await request(app)
        .post('/api/concepts/jot')
        .set('Authorization', 'Bearer valid_token_no_permission')
        .send({ content: 'A new idea' });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('Insufficient permissions');
    });

    test('Inspection Point: Data Integrity - should block invalid data with 400 Bad Request', async () => {
      // This user is authorized, but the payload is invalid (empty content).
      mockAuth.verifyIdToken.mockResolvedValue({ uid: 'user_with_permission' });
      mockDb.collection('users').doc('user_with_permission').get.mockResolvedValue({
        exists: true,
        data: () => ({ role: 'Sous', permissions: 'concept_jot' }),
      });

      const res = await request(app)
        .post('/api/concepts/jot')
        .set('Authorization', 'Bearer valid_token_with_permission')
        .send({ content: '   ' }); // Invalid content (only whitespace)

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Note content cannot be empty');
    });
  });
});