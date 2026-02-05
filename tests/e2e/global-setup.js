/**
 * Playwright Global Setup - Seeds the test database before E2E tests run.
 */

const mongoose = require('mongoose');

async function globalSetup() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/wurud_test';

  await mongoose.connect(mongoUri);

  const { Sheikh, Series, Lecture } = require('../../models');

  // Clear existing test data
  await Sheikh.deleteMany({});
  await Series.deleteMany({});
  await Lecture.deleteMany({});

  // Create sheikhs
  const sheikh1 = await Sheikh.create({
    nameArabic: 'حسن الدغريري',
    nameEnglish: 'Hassan Al-Daghriri',
    honorific: 'حفظه الله',
    bioArabic: 'من طلبة العلم المعاصرين',
    bioEnglish: 'Contemporary Islamic scholar',
  });

  const sheikh2 = await Sheikh.create({
    nameArabic: 'محمد بن عبدالله',
    nameEnglish: 'Mohammed bin Abdullah',
    honorific: 'حفظه الله',
    bioArabic: 'طالب علم متخصص في الفقه',
    bioEnglish: 'Islamic scholar specialized in Fiqh',
  });

  // Create regular series (Aqeedah)
  const series1 = await Series.create({
    titleArabic: 'شرح كتاب التوحيد',
    titleEnglish: 'Explanation of Kitab At-Tawheed',
    descriptionArabic: 'شرح كتاب التوحيد لشيخ الإسلام محمد بن عبد الوهاب',
    sheikhId: sheikh1._id,
    category: 'Aqeedah',
    bookTitle: 'كتاب التوحيد',
    bookAuthor: 'محمد بن عبد الوهاب',
  });

  // Create regular series (Fiqh)
  const series2 = await Series.create({
    titleArabic: 'شرح عمدة الأحكام',
    titleEnglish: 'Explanation of Umdat Al-Ahkam',
    descriptionArabic: 'شرح عمدة الأحكام للإمام عبدالغني المقدسي',
    sheikhId: sheikh1._id,
    category: 'Fiqh',
    bookTitle: 'عمدة الأحكام',
    bookAuthor: 'عبدالغني المقدسي',
  });

  // Create khutba series (identified by title containing خطب)
  const khutbaSeries = await Series.create({
    titleArabic: 'خطب الجمعة',
    titleEnglish: 'Friday Sermons',
    descriptionArabic: 'خطب الجمعة في جامع الورود',
    sheikhId: sheikh1._id,
    category: 'Other',
    tags: ['khutba'],
  });

  // Create Hadith series
  const series3 = await Series.create({
    titleArabic: 'شرح الأربعين النووية',
    titleEnglish: 'Explanation of 40 Hadith Nawawi',
    descriptionArabic: 'شرح الأحاديث الأربعين للإمام النووي',
    sheikhId: sheikh2._id,
    category: 'Hadith',
    bookTitle: 'الأربعين النووية',
    bookAuthor: 'الإمام النووي',
  });

  // Create lectures for series1 (Aqeedah)
  await Lecture.create({
    audioFileName: 'test-lecture-1.mp3',
    titleArabic: 'شرح كتاب التوحيد - الدرس الأول',
    titleEnglish: 'Kitab At-Tawheed - Lesson 1',
    sheikhId: sheikh1._id,
    seriesId: series1._id,
    lectureNumber: 1,
    duration: 2700,
    fileSize: 15728640,
    category: 'Aqeedah',
    dateRecorded: new Date('2024-01-15'),
    published: true,
  });

  await Lecture.create({
    audioFileName: 'test-lecture-2.mp3',
    titleArabic: 'شرح كتاب التوحيد - الدرس الثاني',
    titleEnglish: 'Kitab At-Tawheed - Lesson 2',
    sheikhId: sheikh1._id,
    seriesId: series1._id,
    lectureNumber: 2,
    duration: 3000,
    fileSize: 17825792,
    category: 'Aqeedah',
    dateRecorded: new Date('2024-01-22'),
    published: true,
  });

  // Create lectures for series2 (Fiqh)
  await Lecture.create({
    audioFileName: 'test-lecture-3.mp3',
    titleArabic: 'شرح عمدة الأحكام - الدرس الأول',
    titleEnglish: 'Umdat Al-Ahkam - Lesson 1',
    sheikhId: sheikh1._id,
    seriesId: series2._id,
    lectureNumber: 1,
    duration: 2400,
    fileSize: 14155776,
    category: 'Fiqh',
    dateRecorded: new Date('2024-02-01'),
    published: true,
  });

  // Create lectures for khutba series
  await Lecture.create({
    audioFileName: 'test-khutba-1.mp3',
    titleArabic: 'خطبة الجمعة - التوكل على الله',
    titleEnglish: 'Friday Sermon - Trust in Allah',
    sheikhId: sheikh1._id,
    seriesId: khutbaSeries._id,
    lectureNumber: 1,
    duration: 1800,
    fileSize: 10485760,
    category: 'Other',
    dateRecorded: new Date('2024-03-01'),
    published: true,
  });

  await Lecture.create({
    audioFileName: 'test-khutba-2.mp3',
    titleArabic: 'خطبة الجمعة - الصبر على البلاء',
    titleEnglish: 'Friday Sermon - Patience in Trials',
    sheikhId: sheikh1._id,
    seriesId: khutbaSeries._id,
    lectureNumber: 2,
    duration: 1500,
    fileSize: 8388608,
    category: 'Other',
    dateRecorded: new Date('2024-03-08'),
    published: true,
  });

  // Create lectures for series3 (Hadith)
  await Lecture.create({
    audioFileName: 'test-lecture-4.mp3',
    titleArabic: 'الحديث الأول: إنما الأعمال بالنيات',
    titleEnglish: 'First Hadith: Actions are by intentions',
    sheikhId: sheikh2._id,
    seriesId: series3._id,
    lectureNumber: 1,
    duration: 2400,
    fileSize: 14155776,
    category: 'Hadith',
    dateRecorded: new Date('2024-02-15'),
    published: true,
  });

  // Update lecture counts
  await Sheikh.findByIdAndUpdate(sheikh1._id, { lectureCount: 5 });
  await Sheikh.findByIdAndUpdate(sheikh2._id, { lectureCount: 1 });
  await Series.findByIdAndUpdate(series1._id, { lectureCount: 2 });
  await Series.findByIdAndUpdate(series2._id, { lectureCount: 1 });
  await Series.findByIdAndUpdate(series3._id, { lectureCount: 1 });
  await Series.findByIdAndUpdate(khutbaSeries._id, { lectureCount: 2 });

  await mongoose.disconnect();

  console.log('E2E global setup: Database seeded successfully');
}

module.exports = globalSetup;
