const express = require('express');
const router = express.Router();
const { Lecture, Sheikh, Series } = require('../models');

// @route   GET /
// @desc    Homepage - Series-based view with tabs
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Fetch all series with their sheikhs
    // Note: Series sorted by creation date, but lectures within series will be sorted by dateRecorded
    const series = await Series.find()
      .populate('sheikhId', 'nameArabic nameEnglish honorific')
      .sort({ createdAt: -1 })
      .lean();

    // For each series, fetch its lectures
    const seriesList = await Promise.all(
      series.map(async (s) => {
        const lectures = await Lecture.find({
          seriesId: s._id,
          published: true
        })
          .sort({ lectureNumber: 1, createdAt: 1 })
          .lean();

        // Get original author from first lecture with description
        const originalAuthor = lectures.find(l => l.descriptionArabic)?.descriptionArabic
          ?.replace('من كتاب: ', '') || null;

        return {
          ...s,
          sheikh: s.sheikhId,
          lectures: lectures,
          lectureCount: lectures.length,
          originalAuthor: originalAuthor
        };
      })
    );

    // Filter out series with no published lectures
    const filteredSeries = seriesList.filter(s => s.lectureCount > 0);

    // Get all standalone lectures (not in any series)
    // Sort by recording date (most recent first), fallback to creation date
    const standaloneLectures = await Lecture.find({
      seriesId: null,
      published: true
    })
      .populate('sheikhId', 'nameArabic nameEnglish honorific')
      .sort({ dateRecorded: -1, createdAt: -1 })
      .lean();

    // Get محاضرات متفرقة series (miscellaneous lectures) and include in Lectures tab
    const miscSeries = await Series.findOne({
      titleArabic: /محاضرات متفرقة/i
    })
      .populate('sheikhId', 'nameArabic nameEnglish honorific')
      .lean();

    let miscLectures = [];
    if (miscSeries) {
      miscLectures = await Lecture.find({
        seriesId: miscSeries._id,
        published: true
      })
        .populate('sheikhId', 'nameArabic nameEnglish honorific')
        .sort({ dateRecorded: -1, createdAt: -1 })
        .lean();
    }

    // Combine standalone and miscellaneous lectures for Lectures tab
    const allStandaloneLectures = [...standaloneLectures, ...miscLectures];

    // Get Khutba series (for Khutbas tab) - use tags for better filtering
    // Also fallback to title-based detection for backward compatibility
    const khutbaSeries = filteredSeries.filter(s => {
      // Check if tags include 'khutba'
      if (s.tags && s.tags.includes('khutba')) {
        return true;
      }
      // Fallback to title-based detection for content without tags
      return s.titleArabic && (
        s.titleArabic.includes('خطب') ||
        s.titleArabic.includes('خطبة')
      );
    });

    res.render('public/index', {
      title: 'المكتبة الصوتية',
      seriesList: filteredSeries,
      standaloneLectures: allStandaloneLectures,
      khutbaSeries: khutbaSeries
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
    const { search, category, sort = '-dateRecorded', fromDate, toDate } = req.query;

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

    // Date range filter (Gregorian dates stored in dateRecorded)
    if (fromDate || toDate) {
      query.dateRecorded = {};

      if (fromDate) {
        // Start of day for fromDate
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        query.dateRecorded.$gte = from;
      }

      if (toDate) {
        // End of day for toDate
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        query.dateRecorded.$lte = to;
      }
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
      sort: sort,
      fromDate: fromDate || '',
      toDate: toDate || ''
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

// @route   GET /sheikhs/:id
// @desc    Single sheikh profile page
// @access  Public
router.get('/sheikhs/:id', async (req, res) => {
  try {
    // Get sheikh by ID
    const sheikh = await Sheikh.findById(req.params.id).lean();

    if (!sheikh) {
      return res.status(404).send('Sheikh not found');
    }

    // Get all lectures by this sheikh
    const lectures = await Lecture.find({
      sheikhId: req.params.id,
      published: true
    })
      .sort({ createdAt: -1 })
      .populate('sheikhId', 'nameArabic nameEnglish honorific')
      .populate('seriesId', 'titleArabic titleEnglish')
      .lean();

    // Calculate statistics
    const stats = {
      totalLectures: lectures.length,
      totalPlays: lectures.reduce((sum, lecture) => sum + (lecture.playCount || 0), 0),
      totalDuration: lectures.reduce((sum, lecture) => sum + (lecture.duration || 0), 0)
    };

    // Get series by this sheikh
    const series = await Series.find({ sheikhId: req.params.id })
      .sort({ titleArabic: 1 })
      .lean();

    res.render('public/sheikh', {
      title: sheikh.nameArabic,
      sheikh,
      lectures,
      series,
      stats
    });
  } catch (error) {
    console.error('Sheikh profile error:', error);
    res.status(500).send('Error loading sheikh profile');
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

// @route   GET /series/:id
// @desc    Single series profile page
// @access  Public
router.get('/series/:id', async (req, res) => {
  console.log('=== PUBLIC SERIES ROUTE HIT ===', req.params.id);
  try {
    // Get series by ID
    const series = await Series.findById(req.params.id)
      .populate('sheikhId', 'nameArabic nameEnglish honorific bioArabic bioEnglish')
      .lean();

    if (!series) {
      return res.status(404).send('Series not found');
    }

    // Get all lectures in this series (ordered by sortOrder, then lecture number)
    // Use aggregation to handle null/undefined sortOrder values consistently
    const mongoose = require('mongoose');
    const lectures = await Lecture.aggregate([
      {
        $match: {
          seriesId: new mongoose.Types.ObjectId(req.params.id),
          published: true
        }
      },
      {
        $addFields: {
          // Treat null/undefined sortOrder as very high number so they appear last
          effectiveSortOrder: { $ifNull: ['$sortOrder', 999999] }
        }
      },
      {
        $sort: {
          effectiveSortOrder: 1,
          lectureNumber: 1,
          createdAt: 1
        }
      },
      {
        $lookup: {
          from: 'sheikhs',
          localField: 'sheikhId',
          foreignField: '_id',
          as: 'sheikhData'
        }
      },
      {
        $addFields: {
          sheikhId: { $arrayElemAt: ['$sheikhData', 0] }
        }
      },
      {
        $unset: ['sheikhData', 'effectiveSortOrder']
      }
    ]);

    // Debug: Log first 5 lectures with sortOrder
    console.log('Series detail - first 5 lectures sortOrder:');
    lectures.slice(0, 5).forEach((l, i) => {
      console.log(`  ${i+1}. sortOrder=${l.sortOrder} lectureNum=${l.lectureNumber} title=${l.titleArabic?.substring(0, 40)}`);
    });

    // Calculate statistics
    const stats = {
      totalLectures: lectures.length,
      totalPlays: lectures.reduce((sum, lecture) => sum + (lecture.playCount || 0), 0),
      totalDuration: lectures.reduce((sum, lecture) => sum + (lecture.duration || 0), 0),
      completeLectures: lectures.filter(l => l.lectureNumber).length
    };

    // For consolidated Khutba series, also find related multi-lecture Khutba series
    let relatedKhutbaSeries = [];
    if (series.titleArabic === 'خطب الجمعة') {
      // Find multi-lecture Khutba series (with underscores or spaces)
      // Match patterns like "خطبة_الجمعة - X" or "خطبة الجمعة - X"
      relatedKhutbaSeries = await Series.find({
        sheikhId: series.sheikhId._id,
        titleArabic: {
          $regex: 'خطبة.*جمعة',
          $options: 'i'
        },
        _id: { $ne: series._id } // Exclude current series
      }).lean();

      // For each related series, get actual lecture count
      for (const relSeries of relatedKhutbaSeries) {
        const count = await Lecture.countDocuments({
          seriesId: relSeries._id,
          published: true
        });
        relSeries.actualLectureCount = count;
      }
    }

    res.render('public/series-detail', {
      title: series.titleArabic,
      series,
      lectures,
      stats,
      relatedKhutbaSeries
    });
  } catch (error) {
    console.error('Series profile error:', error);
    res.status(500).send('Error loading series profile');
  }
});

// @route   GET /sitemap.xml
// @desc    XML Sitemap for SEO
// @access  Public
router.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = 'https://rasmihassan.com';

    // Get all published lectures
    const lectures = await Lecture.find({ published: true })
      .select('_id updatedAt')
      .lean();

    // Get all series
    const series = await Series.find()
      .select('_id updatedAt')
      .lean();

    // Get all sheikhs
    const sheikhs = await Sheikh.find()
      .select('_id updatedAt')
      .lean();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/browse</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/sheikhs</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/series</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;

    // Add lectures
    for (const lecture of lectures) {
      const lastmod = lecture.updatedAt ? new Date(lecture.updatedAt).toISOString().split('T')[0] : '';
      xml += `  <url>
    <loc>${baseUrl}/lectures/${lecture._id}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
    }

    // Add series
    for (const s of series) {
      const lastmod = s.updatedAt ? new Date(s.updatedAt).toISOString().split('T')[0] : '';
      xml += `  <url>
    <loc>${baseUrl}/series/${s._id}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    }

    // Add sheikhs
    for (const sheikh of sheikhs) {
      const lastmod = sheikh.updatedAt ? new Date(sheikh.updatedAt).toISOString().split('T')[0] : '';
      xml += `  <url>
    <loc>${baseUrl}/sheikhs/${sheikh._id}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    }

    xml += `</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// @route   GET /robots.txt
// @desc    Robots.txt for SEO
// @access  Public
router.get('/robots.txt', (req, res) => {
  const robotsTxt = `# Robots.txt for rasmihassan.com
User-agent: *
Allow: /

# Sitemap
Sitemap: https://rasmihassan.com/sitemap.xml

# Disallow admin and API routes
Disallow: /admin/
Disallow: /api/
Disallow: /auth/
`;

  res.set('Content-Type', 'text/plain');
  res.send(robotsTxt);
});

module.exports = router;
