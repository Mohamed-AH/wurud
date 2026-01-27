/**
 * Unit Tests for Series Model
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Series = require('../../../models/Series');

let mongoServer;

describe('Series Model', () => {
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
    await Series.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid series with required fields', async () => {
      const series = await Series.create({
        title: 'شرح كتاب التوحيد',
        description: 'شرح مفصل لكتاب التوحيد'
      });

      expect(series.title).toBe('شرح كتاب التوحيد');
      expect(series.description).toBe('شرح مفصل لكتاب التوحيد');
    });

    it('should fail validation without required title', async () => {
      const series = new Series({
        description: 'Test description'
      });

      await expect(series.save()).rejects.toThrow();
    });

    it('should create series without description (optional)', async () => {
      const series = await Series.create({
        title: 'Test Series'
      });

      expect(series.title).toBe('Test Series');
      expect(series.description).toBeUndefined();
    });
  });

  describe('Optional Fields', () => {
    it('should accept optional category', async () => {
      const series = await Series.create({
        title: 'Test Series',
        category: 'عقيدة'
      });

      expect(series.category).toBe('عقيدة');
    });

    it('should accept optional coverImage', async () => {
      const series = await Series.create({
        title: 'Test Series',
        coverImage: '/uploads/series-cover.jpg'
      });

      expect(series.coverImage).toBe('/uploads/series-cover.jpg');
    });

    it('should accept optional isKhutba flag', async () => {
      const series = await Series.create({
        title: 'Friday Khutbas',
        isKhutba: true
      });

      expect(series.isKhutba).toBe(true);
    });

    it('should default isKhutba to false', async () => {
      const series = await Series.create({
        title: 'Test Series'
      });

      expect(series.isKhutba).toBe(false);
    });
  });

  describe('Timestamps', () => {
    it('should automatically add createdAt and updatedAt', async () => {
      const series = await Series.create({
        title: 'Test Series'
      });

      expect(series.createdAt).toBeInstanceOf(Date);
      expect(series.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on modification', async () => {
      const series = await Series.create({
        title: 'Test Series'
      });

      const originalUpdatedAt = series.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 100));

      series.title = 'Updated Series';
      await series.save();

      expect(series.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Series Types', () => {
    it('should create regular series (not khutba)', async () => {
      const series = await Series.create({
        title: 'Regular Series',
        isKhutba: false
      });

      expect(series.isKhutba).toBe(false);
    });

    it('should create khutba series', async () => {
      const series = await Series.create({
        title: 'Khutba Series',
        isKhutba: true,
        category: 'خطب'
      });

      expect(series.isKhutba).toBe(true);
      expect(series.category).toBe('خطب');
    });
  });
});
