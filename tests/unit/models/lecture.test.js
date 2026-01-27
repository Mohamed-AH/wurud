/**
 * Unit Tests for Lecture Model
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Lecture = require('../../../models/Lecture');
const Sheikh = require('../../../models/Sheikh');

let mongoServer;

describe('Lecture Model', () => {
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
    await Lecture.deleteMany({});
    await Sheikh.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid lecture with required fields', async () => {
      const sheikh = await Sheikh.create({
        name: 'Test Sheikh',
        bio: 'Test bio'
      });

      const lecture = await Lecture.create({
        title: 'Test Lecture',
        sheikh: sheikh._id,
        audioFile: '/uploads/test.mp3',
        dateRecorded: new Date('2024-01-01')
      });

      expect(lecture.title).toBe('Test Lecture');
      expect(lecture.sheikh.toString()).toBe(sheikh._id.toString());
      expect(lecture.audioFile).toBe('/uploads/test.mp3');
      expect(lecture.dateRecorded).toBeInstanceOf(Date);
    });

    it('should fail validation without required title', async () => {
      const sheikh = await Sheikh.create({
        name: 'Test Sheikh',
        bio: 'Test bio'
      });

      const lecture = new Lecture({
        sheikh: sheikh._id,
        audioFile: '/uploads/test.mp3'
      });

      await expect(lecture.save()).rejects.toThrow();
    });

    it('should fail validation without required sheikh', async () => {
      const lecture = new Lecture({
        title: 'Test Lecture',
        audioFile: '/uploads/test.mp3'
      });

      await expect(lecture.save()).rejects.toThrow();
    });

    it('should fail validation without required audioFile', async () => {
      const sheikh = await Sheikh.create({
        name: 'Test Sheikh',
        bio: 'Test bio'
      });

      const lecture = new Lecture({
        title: 'Test Lecture',
        sheikh: sheikh._id
      });

      await expect(lecture.save()).rejects.toThrow();
    });
  });

  describe('Optional Fields', () => {
    it('should accept optional description', async () => {
      const sheikh = await Sheikh.create({
        name: 'Test Sheikh',
        bio: 'Test bio'
      });

      const lecture = await Lecture.create({
        title: 'Test Lecture',
        sheikh: sheikh._id,
        audioFile: '/uploads/test.mp3',
        description: 'Test description'
      });

      expect(lecture.description).toBe('Test description');
    });

    it('should accept optional category', async () => {
      const sheikh = await Sheikh.create({
        name: 'Test Sheikh',
        bio: 'Test bio'
      });

      const lecture = await Lecture.create({
        title: 'Test Lecture',
        sheikh: sheikh._id,
        audioFile: '/uploads/test.mp3',
        category: 'عقيدة'
      });

      expect(lecture.category).toBe('عقيدة');
    });

    it('should accept optional Hijri date', async () => {
      const sheikh = await Sheikh.create({
        name: 'Test Sheikh',
        bio: 'Test bio'
      });

      const lecture = await Lecture.create({
        title: 'Test Lecture',
        sheikh: sheikh._id,
        audioFile: '/uploads/test.mp3',
        hijriDate: '1445/01/15'
      });

      expect(lecture.hijriDate).toBe('1445/01/15');
    });

    it('should accept optional duration', async () => {
      const sheikh = await Sheikh.create({
        name: 'Test Sheikh',
        bio: 'Test bio'
      });

      const lecture = await Lecture.create({
        title: 'Test Lecture',
        sheikh: sheikh._id,
        audioFile: '/uploads/test.mp3',
        duration: 3600
      });

      expect(lecture.duration).toBe(3600);
    });
  });

  describe('Series and Lecture Number', () => {
    it('should accept series reference', async () => {
      const sheikh = await Sheikh.create({
        name: 'Test Sheikh',
        bio: 'Test bio'
      });

      const lecture = await Lecture.create({
        title: 'Test Lecture',
        sheikh: sheikh._id,
        audioFile: '/uploads/test.mp3',
        series: new mongoose.Types.ObjectId(),
        lectureNumber: 1
      });

      expect(lecture.series).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(lecture.lectureNumber).toBe(1);
    });

    it('should accept null series for standalone lectures', async () => {
      const sheikh = await Sheikh.create({
        name: 'Test Sheikh',
        bio: 'Test bio'
      });

      const lecture = await Lecture.create({
        title: 'Test Lecture',
        sheikh: sheikh._id,
        audioFile: '/uploads/test.mp3',
        series: null
      });

      expect(lecture.series).toBeNull();
    });
  });

  describe('Timestamps', () => {
    it('should automatically add createdAt and updatedAt', async () => {
      const sheikh = await Sheikh.create({
        name: 'Test Sheikh',
        bio: 'Test bio'
      });

      const lecture = await Lecture.create({
        title: 'Test Lecture',
        sheikh: sheikh._id,
        audioFile: '/uploads/test.mp3'
      });

      expect(lecture.createdAt).toBeInstanceOf(Date);
      expect(lecture.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on modification', async () => {
      const sheikh = await Sheikh.create({
        name: 'Test Sheikh',
        bio: 'Test bio'
      });

      const lecture = await Lecture.create({
        title: 'Test Lecture',
        sheikh: sheikh._id,
        audioFile: '/uploads/test.mp3'
      });

      const originalUpdatedAt = lecture.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      lecture.title = 'Updated Lecture';
      await lecture.save();

      expect(lecture.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Population', () => {
    it('should populate sheikh reference', async () => {
      const sheikh = await Sheikh.create({
        name: 'Test Sheikh',
        bio: 'Test bio'
      });

      const lecture = await Lecture.create({
        title: 'Test Lecture',
        sheikh: sheikh._id,
        audioFile: '/uploads/test.mp3'
      });

      const populatedLecture = await Lecture.findById(lecture._id).populate('sheikh');

      expect(populatedLecture.sheikh.name).toBe('Test Sheikh');
      expect(populatedLecture.sheikh.bio).toBe('Test bio');
    });
  });
});
