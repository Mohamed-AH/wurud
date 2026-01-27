/**
 * Unit Tests for Sheikh Model
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Sheikh = require('../../../models/Sheikh');

let mongoServer;

describe('Sheikh Model', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Sheikh.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid sheikh with required fields', async () => {
      const sheikh = await Sheikh.create({
        name: 'الشيخ محمد بن عبد الوهاب',
        bio: 'عالم من نجد'
      });

      expect(sheikh.name).toBe('الشيخ محمد بن عبد الوهاب');
      expect(sheikh.bio).toBe('عالم من نجد');
    });

    it('should fail validation without required name', async () => {
      const sheikh = new Sheikh({
        bio: 'Test bio'
      });

      await expect(sheikh.save()).rejects.toThrow();
    });

    it('should create sheikh without bio (optional)', async () => {
      const sheikh = await Sheikh.create({
        name: 'Test Sheikh'
      });

      expect(sheikh.name).toBe('Test Sheikh');
      expect(sheikh.bio).toBeUndefined();
    });
  });

  describe('Optional Fields', () => {
    it('should accept optional photo', async () => {
      const sheikh = await Sheikh.create({
        name: 'Test Sheikh',
        bio: 'Test bio',
        photo: '/uploads/sheikh.jpg'
      });

      expect(sheikh.photo).toBe('/uploads/sheikh.jpg');
    });

    it('should accept optional website', async () => {
      const sheikh = await Sheikh.create({
        name: 'Test Sheikh',
        bio: 'Test bio',
        website: 'https://example.com'
      });

      expect(sheikh.website).toBe('https://example.com');
    });
  });

  describe('Timestamps', () => {
    it('should automatically add createdAt and updatedAt', async () => {
      const sheikh = await Sheikh.create({
        name: 'Test Sheikh',
        bio: 'Test bio'
      });

      expect(sheikh.createdAt).toBeInstanceOf(Date);
      expect(sheikh.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Uniqueness', () => {
    it('should allow multiple sheikhs with different names', async () => {
      await Sheikh.create({
        name: 'Sheikh One',
        bio: 'Bio One'
      });

      const sheikh2 = await Sheikh.create({
        name: 'Sheikh Two',
        bio: 'Bio Two'
      });

      expect(sheikh2.name).toBe('Sheikh Two');
    });
  });
});
