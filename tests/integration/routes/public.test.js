/**
 * Integration Tests for Public Routes
 */

const request = require('supertest');
const express = require('express');
const path = require('path');
const Lecture = require('../../../models/Lecture');
const Sheikh = require('../../../models/Sheikh');
const Series = require('../../../models/Series');
const testDb = require('../../helpers/testDb');

let app;

describe('Public Routes Integration Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    await testDb.connect();

    // Create Express app with full configuration
    app = express();
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../../../views'));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Mock session middleware
    app.use((req, res, next) => {
      req.session = {};
      req.user = null;
      next();
    });

    // Mount public routes
    const publicRoutes = require('../../../routes/index');
    app.use('/', publicRoutes);
  });

  afterAll(async () => {
    await testDb.disconnect();
  });

  afterEach(async () => {
    await Lecture.deleteMany({});
    await Sheikh.deleteMany({});
    await Series.deleteMany({});
  });

  describe('GET / (Homepage)', () => {
    it('should render homepage successfully', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('محاضرات'); // Lectures
      expect(response.text).toContain('سلاسل');   // Series
      expect(response.text).toContain('خطب');     // Khutba
    });

    it('should display lectures on homepage', async () => {
      const sheikh = await Sheikh.create({
        name: 'الشيخ محمد',
        bio: 'عالم جليل'
      });

      await Lecture.create({
        title: 'محاضرة الأولى',
        sheikh: sheikh._id,
        audioFile: '/uploads/test.mp3'
      });

      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('محاضرة الأولى');
      expect(response.text).toContain('الشيخ محمد');
    });

    it('should display series on homepage', async () => {
      const series = await Series.create({
        title: 'شرح كتاب التوحيد',
        description: 'شرح مفصل',
        isKhutba: false
      });

      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('شرح كتاب التوحيد');
    });

    it('should display khutba series separately', async () => {
      await Series.create({
        title: 'خطب الجمعة',
        description: 'خطب منوعة',
        isKhutba: true
      });

      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('خطب الجمعة');
    });

    it('should group lectures by series', async () => {
      const sheikh = await Sheikh.create({
        name: 'Test Sheikh',
        bio: 'Test bio'
      });

      const series = await Series.create({
        title: 'Test Series',
        description: 'Test description'
      });

      await Lecture.create({
        title: 'Lecture 1',
        sheikh: sheikh._id,
        audioFile: '/uploads/test1.mp3',
        series: series._id,
        lectureNumber: 1
      });

      await Lecture.create({
        title: 'Lecture 2',
        sheikh: sheikh._id,
        audioFile: '/uploads/test2.mp3',
        series: series._id,
        lectureNumber: 2
      });

      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('Test Series');
      expect(response.text).toContain('Lecture 1');
      expect(response.text).toContain('Lecture 2');
    });
  });

  describe('Health Check', () => {
    it('should respond to health check endpoint', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should include database status in health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('database');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent routes with 404', async () => {
      await request(app)
        .get('/non-existent-route')
        .expect(404);
    });

    it('should handle invalid URLs gracefully', async () => {
      await request(app)
        .get('/<script>alert("xss")</script>')
        .expect(404);
    });
  });

  describe('Category Filtering', () => {
    it('should support category filtering', async () => {
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
        .get('/')
        .expect(200);

      // Both lectures should be present (filtering happens client-side)
      expect(response.text).toContain('Aqeedah Lecture');
      expect(response.text).toContain('Fiqh Lecture');
      expect(response.text).toContain('data-category="عقيدة"');
      expect(response.text).toContain('data-category="فقه"');
    });
  });

  describe('Date Handling', () => {
    it('should display Gregorian dates correctly', async () => {
      const sheikh = await Sheikh.create({
        name: 'Test Sheikh',
        bio: 'Test bio'
      });

      await Lecture.create({
        title: 'Dated Lecture',
        sheikh: sheikh._id,
        audioFile: '/uploads/test.mp3',
        dateRecorded: new Date('2024-01-15')
      });

      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('Dated Lecture');
      // Should contain date in some format
      expect(response.text).toMatch(/2024|١٥|15/);
    });

    it('should display Hijri dates if available', async () => {
      const sheikh = await Sheikh.create({
        name: 'Test Sheikh',
        bio: 'Test bio'
      });

      await Lecture.create({
        title: 'Hijri Dated Lecture',
        sheikh: sheikh._id,
        audioFile: '/uploads/test.mp3',
        hijriDate: '1445/07/15'
      });

      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('Hijri Dated Lecture');
      expect(response.text).toContain('1445');
    });
  });
});
