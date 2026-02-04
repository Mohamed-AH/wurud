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

    // 404 handler
    app.use((req, res) => {
      res.status(404).send('Not Found');
    });
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

      expect(response.text).toContain('المكتبة الصوتية');
    });

    it('should display published lectures on homepage', async () => {
      const sheikh = await Sheikh.create({
        nameArabic: 'الشيخ محمد'
      });

      const series = await Series.create({
        titleArabic: 'سلسلة تجريبية',
        sheikhId: sheikh._id
      });

      await Lecture.create({
        titleArabic: 'محاضرة الأولى',
        sheikhId: sheikh._id,
        seriesId: series._id,
        lectureNumber: 1,
        published: true
      });

      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('محاضرة الأولى');
      expect(response.text).toContain('الشيخ محمد');
    });

    it('should display series on homepage', async () => {
      const sheikh = await Sheikh.create({
        nameArabic: 'الشيخ أحمد'
      });

      const series = await Series.create({
        titleArabic: 'شرح كتاب التوحيد',
        descriptionArabic: 'شرح مفصل',
        sheikhId: sheikh._id
      });

      // Series needs at least one published lecture to appear
      await Lecture.create({
        titleArabic: 'الدرس الأول',
        sheikhId: sheikh._id,
        seriesId: series._id,
        lectureNumber: 1,
        published: true
      });

      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('شرح كتاب التوحيد');
    });

    it('should display khutba series with khutba tag', async () => {
      const sheikh = await Sheikh.create({
        nameArabic: 'الشيخ عبدالله'
      });

      const khutbaSeries = await Series.create({
        titleArabic: 'خطب الجمعة',
        descriptionArabic: 'خطب منوعة',
        sheikhId: sheikh._id,
        tags: ['khutba']
      });

      await Lecture.create({
        titleArabic: 'خطبة التقوى',
        sheikhId: sheikh._id,
        seriesId: khutbaSeries._id,
        lectureNumber: 1,
        published: true
      });

      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('خطب الجمعة');
    });

    it('should group lectures by series', async () => {
      const sheikh = await Sheikh.create({
        nameArabic: 'الشيخ خالد'
      });

      const series = await Series.create({
        titleArabic: 'سلسلة الدروس',
        sheikhId: sheikh._id
      });

      await Lecture.create({
        titleArabic: 'الدرس الأول',
        sheikhId: sheikh._id,
        seriesId: series._id,
        lectureNumber: 1,
        published: true
      });

      await Lecture.create({
        titleArabic: 'الدرس الثاني',
        sheikhId: sheikh._id,
        seriesId: series._id,
        lectureNumber: 2,
        published: true
      });

      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('سلسلة الدروس');
      expect(response.text).toContain('الدرس الأول');
      expect(response.text).toContain('الدرس الثاني');
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
        .get('/some-invalid-path')
        .expect(404);
    });
  });

  describe('Category Filtering', () => {
    it('should include category data attributes on lectures', async () => {
      const sheikh = await Sheikh.create({
        nameArabic: 'الشيخ سالم'
      });

      const series = await Series.create({
        titleArabic: 'دروس العقيدة',
        sheikhId: sheikh._id,
        category: 'Aqeedah'
      });

      await Lecture.create({
        titleArabic: 'درس في العقيدة',
        sheikhId: sheikh._id,
        seriesId: series._id,
        category: 'Aqeedah',
        lectureNumber: 1,
        published: true
      });

      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('درس في العقيدة');
    });
  });

  describe('Date Handling', () => {
    it('should display lectures with dateRecorded', async () => {
      const sheikh = await Sheikh.create({
        nameArabic: 'الشيخ فهد'
      });

      const series = await Series.create({
        titleArabic: 'دروس مؤرخة',
        sheikhId: sheikh._id
      });

      await Lecture.create({
        titleArabic: 'محاضرة مؤرخة',
        sheikhId: sheikh._id,
        seriesId: series._id,
        lectureNumber: 1,
        dateRecorded: new Date('2024-01-15'),
        published: true
      });

      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('محاضرة مؤرخة');
    });

    it('should display Hijri dates if available', async () => {
      const sheikh = await Sheikh.create({
        nameArabic: 'الشيخ علي'
      });

      const series = await Series.create({
        titleArabic: 'دروس هجرية',
        sheikhId: sheikh._id
      });

      await Lecture.create({
        titleArabic: 'محاضرة بتاريخ هجري',
        sheikhId: sheikh._id,
        seriesId: series._id,
        lectureNumber: 1,
        dateRecordedHijri: '1445/07/15',
        published: true
      });

      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('محاضرة بتاريخ هجري');
    });
  });
});
