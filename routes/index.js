const express = require('express');
const router = express.Router();
const { Lecture, Sheikh, Series } = require('../models');

// @route   GET /
// @desc    Homepage
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Get statistics
    const stats = {
      totalLectures: await Lecture.countDocuments({ published: true }),
      totalSheikhs: await Sheikh.countDocuments(),
      totalSeries: await Series.countDocuments(),
      totalPlays: await Lecture.aggregate([
        { $match: { published: true } },
        { $group: { _id: null, total: { $sum: '$playCount' } } }
      ]).then(result => result[0]?.total || 0)
    };

    // Get featured lectures
    const featuredLectures = await Lecture.find({ published: true, featured: true })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('sheikhId', 'nameArabic nameEnglish honorific')
      .populate('seriesId', 'titleArabic titleEnglish')
      .lean();

    // Get recent lectures
    const recentLectures = await Lecture.find({ published: true })
      .sort({ createdAt: -1 })
      .limit(12)
      .populate('sheikhId', 'nameArabic nameEnglish honorific')
      .populate('seriesId', 'titleArabic titleEnglish')
      .lean();

    res.render('public/index', {
      title: 'الرئيسية',
      stats,
      featuredLectures,
      recentLectures
    });
  } catch (error) {
    console.error('Homepage error:', error);
    res.status(500).send('Error loading homepage');
  }
});

// @route   GET /browse
// @desc    Browse all lectures with filters
// @access  Public
router.get('/browse', async (req, res) => {
  try {
    const { search, category, sort = '-createdAt' } = req.query;

    // Build query
    const query = { published: true };

    // Category filter
    if (category) {
      query.category = category;
    }

    // Search filter
    if (search) {
      query.$text = { $search: search };
    }

    // Execute query
    const lectures = await Lecture.find(query)
      .sort(sort)
      .populate('sheikhId', 'nameArabic nameEnglish honorific')
      .populate('seriesId', 'titleArabic titleEnglish')
      .lean();

    res.render('public/browse', {
      title: 'جميع المحاضرات',
      lectures,
      search: search || '',
      category: category || '',
      sort: sort
    });
  } catch (error) {
    console.error('Browse error:', error);
    res.status(500).send('Error loading browse page');
  }
});

// @route   GET /lectures/:id
// @desc    Single lecture detail page
// @access  Public
router.get('/lectures/:id', async (req, res) => {
  try {
    // Get lecture by ID
    const lecture = await Lecture.findById(req.params.id)
      .populate('sheikhId', 'nameArabic nameEnglish honorific bioArabic bioEnglish')
      .populate('seriesId', 'titleArabic titleEnglish descriptionArabic descriptionEnglish category')
      .lean();

    if (!lecture || !lecture.published) {
      return res.status(404).send('Lecture not found');
    }

    // Get related lectures (same series or same sheikh, excluding current)
    const relatedQuery = {
      _id: { $ne: lecture._id },
      published: true,
      $or: []
    };

    if (lecture.seriesId) {
      relatedQuery.$or.push({ seriesId: lecture.seriesId._id });
    }
    if (lecture.sheikhId) {
      relatedQuery.$or.push({ sheikhId: lecture.sheikhId._id });
    }

    // If no series or sheikh, get by category
    if (relatedQuery.$or.length === 0) {
      delete relatedQuery.$or;
      relatedQuery.category = lecture.category;
    }

    const relatedLectures = await Lecture.find(relatedQuery)
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('sheikhId', 'nameArabic nameEnglish honorific')
      .populate('seriesId', 'titleArabic titleEnglish')
      .lean();

    res.render('public/lecture', {
      title: lecture.titleArabic,
      lecture,
      relatedLectures
    });
  } catch (error) {
    console.error('Lecture detail error:', error);
    res.status(500).send('Error loading lecture');
  }
});

// @route   GET /sheikhs
// @desc    List all sheikhs
// @access  Public
router.get('/sheikhs', async (req, res) => {
  try {
    const sheikhs = await Sheikh.find()
      .sort({ nameArabic: 1 })
      .lean();

    res.render('public/sheikhs', {
      title: 'الشيوخ',
      sheikhs
    });
  } catch (error) {
    console.error('Sheikhs page error:', error);
    res.status(500).send('Error loading sheikhs page');
  }
});

// @route   GET /series
// @desc    List all series
// @access  Public
router.get('/series', async (req, res) => {
  try {
    const series = await Series.find()
      .sort({ titleArabic: 1 })
      .populate('sheikhId', 'nameArabic nameEnglish honorific')
      .lean();

    res.render('public/series', {
      title: 'السلاسل',
      series
    });
  } catch (error) {
    console.error('Series page error:', error);
    res.status(500).send('Error loading series page');
  }
});

module.exports = router;
