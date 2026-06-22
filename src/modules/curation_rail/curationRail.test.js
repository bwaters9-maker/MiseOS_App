import request from 'supertest';
import { jest } from '@jest/globals';

// Mock Firebase
jest.unstable_mockModule('../../firebaseConfig.js', () => ({
  db: {},
}));

jest.unstable_mockModule('firebase/firestore', () => ({
  collection: jest.fn((db, col) => col),
  addDoc: jest.fn(),
  doc: jest.fn((...args) => {
    // doc(db, collection, id) or doc(collection)
    if (args.length === 3) {
      if (args[1] === 'conceptNotes') return 'conceptNoteRef';
    }
    if (args.length === 1 && args[0] === 'recipes') return { id: 'recipe789' };
    return { id: 'genericRefId' };
  }),
  getDoc: jest.fn(),
  writeBatch: jest.fn(() => ({
    update: jest.fn(),
    set: jest.fn(),
    commit: jest.fn(),
  })),
  serverTimestamp: jest.fn(() => 'mock-timestamp'),
}));

const { addDoc, getDoc, writeBatch, doc, collection } = await import('firebase/firestore');
const { app } = await import('../../../server.js');

describe('Curation Rail Integration Tests', () => {
  describe('POST /api/concepts/jot', () => {
    it('should return 401 if x-user-id is missing', async () => {
      const response = await request(app)
        .post('/api/concepts/jot')
        .send({ text: 'New recipe concept' });

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/Missing x-user-id/);
    });

    it('should return 403 if role is Line_Cook', async () => {
      const response = await request(app)
        .post('/api/concepts/jot')
        .set('x-user-id', 'user123')
        .set('x-role', 'Line_Cook')
        .send({ text: 'New recipe concept' });

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/Insufficient permissions/);
    });

    it('should return 201 and commit to Firestore if role is Chef', async () => {
      addDoc.mockResolvedValueOnce({ id: 'note789' });

      const response = await request(app)
        .post('/api/concepts/jot')
        .set('x-user-id', 'chef1')
        .set('x-role', 'Chef')
        .send({ text: 'Truffle Risotto concept' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.id).toBe('note789');
      expect(addDoc).toHaveBeenCalledWith('conceptNotes', expect.objectContaining({
        text: 'Truffle Risotto concept',
        userId: 'chef1',
        status: 'raw'
      }));
    });
  });

  describe('POST /api/concepts/graduate', () => {
    it('should use an atomic batch to freeze status and create a recipe', async () => {
      const mockNoteId = 'note123';
      const mockNoteData = {
        text: 'Smoked Duck Breast\nWith cherry glaze',
        userId: 'chef1',
        status: 'raw'
      };

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockNoteData
      });

      const mockBatch = {
        update: jest.fn(),
        set: jest.fn(),
        commit: jest.fn().mockResolvedValueOnce(undefined)
      };
      writeBatch.mockReturnValue(mockBatch);

      const response = await request(app)
        .post('/api/concepts/graduate')
        .set('x-user-id', 'chef1')
        .set('x-role', 'Owner')
        .send({ noteId: mockNoteId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.recipeId).toBe('recipe789');

      // Verify atomic batch operations
      expect(mockBatch.update).toHaveBeenCalledWith('conceptNoteRef', {
        status: 'graduated',
        graduatedAt: 'mock-timestamp'
      });

      expect(mockBatch.set).toHaveBeenCalledWith(expect.objectContaining({ id: 'recipe789' }), expect.objectContaining({
        name: 'Smoked Duck Breast',
        conceptNoteId: mockNoteId,
        status: 'development'
      }));

      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should return 404 if note does not exist', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => false
      });

      const response = await request(app)
        .post('/api/concepts/graduate')
        .set('x-user-id', 'chef1')
        .set('x-role', 'Chef')
        .send({ noteId: 'nonexistent' });

      expect(response.status).toBe(404);
    });
  });
});
