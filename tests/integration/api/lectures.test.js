/**
 * Integration Tests for Lecture API Endpoints
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const Lecture = require('../../../models/Lecture');
const Sheikh = require('../../../models/Sheikh');
const Series = require('../../../models/Series');

let app;
let mongoServer;

describe('Lecture API Integration Tests', () => {
  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create Express app with minimal configuration
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Mount API routes
    const apiRoutes = require('../../../routes/api/lectures');
    app.use('/api/lectures', apiRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Lecture.deleteMany({});
    await Sheikh.deleteMany({});
    await Series.deleteMany({});
  });

  describe('GET /api/lectures', () => {
    it('should return empty array when no lectures exist', async () => {
      const response = await request(app)
        .get('/api/lectures')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return all lectures', async () => {
      const sheikh = await Sheikh.create({
        name: 'Test Sheikh',
        bio: 'Test bio'
      });

      await Lecture.create({
        title: 'Lecture 1',
        sheikh: sheikh._id,
        audioFile: '/uploads/test1.mp3'
      });

      await Lecture.create({
        title: 'Lecture 2',
        sheikh: sheikh._id,
        audioFile: '/uploads/test2.mp3'
      });

      const response = await request(app)
        .get('/api/lectures')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('sheikh');
      expect(response.body[0]).toHaveProperty('audioFile');
    });

    it('should populate sheikh information', async () => {
      const sheikh = await Sheikh.create({
        name: 'الشيخ محمد',
        bio: 'عالم جليل'
      });

      await Lecture.create({
        title: 'Test Lecture',
        sheikh: sheikh._id,
        audioFile: '/uploads/test.mp3'
      });

      const response = await request(app)
        .get('/api/lectures')
        .expect(200);

      expect(response.body[0].sheikh).toHaveProperty('name', 'الشيخ محمد');
      expect(response.body[0].sheikh).toHaveProperty('bio', 'عالم جليل');
    });

    it('should filter by category if provided', async () => {
      const sheikh = await Sheikh.create({
        name: 'Test Sheikh',
        bio: 'Test bio'
      });

      await Lecture.create({
        title: 'Aqeedah Lecture',
        sheikh: sheikh._id,
        audioFile: '/uploads/test1.mp3',
        category: 'عقيدة'
      });

      await Lecture.create({
        title: 'Fiqh Lecture',
        sheikh: sheikh._id,
        audioFile: '/uploads/test2.mp3',
        category: 'فقه'
      });

      const response = await request(app)
        .get('/api/lectures?category=عقيدة')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Aqeedah Lecture');
    });

    it('should filter by sheikh if provided', async () => {
      const sheikh1 = await Sheikh.create({ name: 'Sheikh 1', bio: 'Bio 1' });
      const sheikh2 = await Sheikh.create({ name: 'Sheikh 2', bio: 'Bio 2' });

      await Lecture.create({
        title: 'Lecture from Sheikh 1',
        sheikh: sheikh1._id,
        audioFile: '/uploads/test1.mp3'
      });

      await Lecture.create({
        title: 'Lecture from Sheikh 2',
        sheikh: sheikh2._id,
        audioFile: '/uploads/test2.mp3'
      });

      const response = await request(app)
        .get(`/api/lectures?sheikh=${sheikh1._id}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Lecture from Sheikh 1');
    });
  });

  describe('GET /api/lectures/:id', () => {
    it('should return a specific lecture by ID', async () => {
      const sheikh = await Sheikh.create({
        name: 'Test Sheikh',
        bio: 'Test bio'
      });

      const lecture = await Lecture.create({
        title: 'Specific Lecture',
        sheikh: sheikh._id,
        audioFile: '/uploads/test.mp3',
        description: 'Test description'
      });

      const response = await request(app)
        .get(`/api/lectures/${lecture._id}`)
        .expect(200);

      expect(response.body).toHaveProperty('title', 'Specific Lecture');
      expect(response.body).toHaveProperty('description', 'Test description');
      expect(response.body.sheikh).toHaveProperty('name', 'Test Sheikh');
    });

    it('should return 404 for non-existent lecture', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .get(`/api/lectures/${fakeId}`)
        .expect(404);
    });

    it('should return 400 for invalid lecture ID', async () => {
      await request(app)
        .get('/api/lectures/invalid-id')
        .expect(400);
    });
  });

  describe('Series Integration', () => {
    it('should include series information if lecture is part of series', async () => {
      const sheikh = await Sheikh.create({
        name: 'Test Sheikh',
        bio: 'Test bio'
      });

      const series = await Series.create({
        title: 'Test Series',
        description: 'Test series description'
      });

      await Lecture.create({
        title: 'Lecture in Series',
        sheikh: sheikh._id,
        audioFile: '/uploads/test.mp3',
        series: series._id,
        lectureNumber: 1
      });

      const response = await request(app)
        .get('/api/lectures')
        .expect(200);

      expect(response.body[0]).toHaveProperty('series');
      expect(response.body[0]).toHaveProperty('lectureNumber', 1);
    });
  });

  describe('Date Handling', () => {
    it('should return lectures with dateRecorded', async () => {
      const sheikh = await Sheikh.create({
        name: 'Test Sheikh',
        bio: 'Test bio'
      });

      const testDate = new Date('2024-01-15');

      await Lecture.create({
        title: 'Dated Lecture',
        sheikh: sheikh._id,
        audioFile: '/uploads/test.mp3',
        dateRecorded: testDate
      });

      const response = await request(app)
        .get('/api/lectures')
        .expect(200);

      expect(response.body[0]).toHaveProperty('dateRecorded');
      expect(new Date(response.body[0].dateRecorded)).toEqual(testDate);
    });

    it('should handle Hijri dates', async () => {
      const sheikh = await Sheikh.create({
        name: 'Test Sheikh',
        bio: 'Test bio'
      });

      await Lecture.create({
        title: 'Lecture with Hijri Date',
        sheikh: sheikh._id,
        audioFile: '/uploads/test.mp3',
        hijriDate: '1445/07/15'
      });

      const response = await request(app)
        .get('/api/lectures')
        .expect(200);

      expect(response.body[0]).toHaveProperty('hijriDate', '1445/07/15');
    });
  });
});
