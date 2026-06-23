import request from 'supertest';
import app from '../../../server.ts';

describe('Production Batch Scaling Suite', () => {
  const mockRecipe = {
    id: 'test-recipe',
    name: 'Test Recipe',
    originalCovers: 4,
    ingredients: [
      { name: 'Flour', quantity: 500, unit: 'g' },
      { name: 'Water', quantity: 300, unit: 'ml' }
    ]
  };

  test('POST /api/production/scale should scale ingredients correctly', async () => {
    const response = await request(app)
      .post('/api/production/scale')
      .send({ recipe: mockRecipe, targetCovers: 8 });

    expect(response.status).toBe(200);
    expect(response.body.scaleFactor).toBe(2);
    expect(response.body.ingredients[0].scaledQuantity).toBe(1000);
    expect(response.body.ingredients[1].scaledQuantity).toBe(600);
  });

  test('GET /api/production/health should return UP', async () => {
    const response = await request(app).get('/api/production/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('UP');
  });
});
