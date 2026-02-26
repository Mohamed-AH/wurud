const express = require('express');
const router = express.Router();
const { Lecture, Sheikh, Series, Section, Schedule, SiteSettings } = require('../models');
const cache = require('../utils/cache');

// Cache TTLs (in seconds)
const CACHE_TTL = {
  HOMEPAGE: 300,        // 5 minutes for homepage data
  SERIES_LIST: 600,     // 10 minutes for series list
  SITEMAP: 3600,        // 1 hour for sitemap
  SCHEDULE: 300         // 5 minutes for schedule
};

// Helper function to fetch homepage data (for caching)
async function fetchHomepageData() {
  // Fetch all visible series with their sheikhs
  const series = await Series.find({ isVisible: { $ne: false } })
    .populate('sheikhId', 'nameArabic nameEnglish honorific')
    .sort({ createdAt: -1 })
    .lean();

  // For each series, fetch its lectures (sorted by sortOrder for correct display order)
  const seriesList = await Promise.all(
    series.map(async (s) => {
      const lectures = await Lecture.aggregate([
        {
          $match: {
            seriesId: s._id,
            published: true
          }
        },
        {
          $addFields: {
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
          $unset: ['effectiveSortOrder']
        }
      ]);

      // Get original author - prefer Series.bookAuthor, fallback to lecture description
      const originalAuthor = s.bookAuthor || lectures.find(l => l.descriptionArabic)?.descriptionArabic
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
  const standaloneLectures = await Lecture.find({
    seriesId: null,
    published: true
  })
    .populate('sheikhId', 'nameArabic nameEnglish honorific')
    .sort({ dateRecorded: -1, createdAt: -1 })
    .lean();

  // Get محاضرات متفرقة series (miscellaneous lectures)
  const miscSeries = await Series.findOne({
    titleArabic: /محاضرات متفرقة/i,
    isVisible: { $ne: false }
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

  // Get Khutba series (for Khutbas tab)
  const khutbaSeries = filteredSeries.filter(s => {
    if (s.tags && s.tags.includes('khutba')) {
      return true;
    }
    return s.titleArabic && (
      s.titleArabic.includes('خطب') ||
      s.titleArabic.includes('خطبة')
    );
  });

  // Get total lecture count
  const totalLectureCount = await Lecture.countDocuments({ published: true });

  return {
    seriesList: filteredSeries,
    standaloneLectures: allStandaloneLectures,
    khutbaSeries,
    totalLectureCount
  };
}

// Helper function to fetch schedule data (for caching)
async function fetchScheduleData() {
  const scheduleItems = await Schedule.find({ isActive: true })
    .populate('seriesId', 'titleArabic titleEnglish slug')
    .sort({ sortOrder: 1 })
    .lean();

  const weeklySchedule = await Promise.all(
    scheduleItems.map(async (item) => {
      if (!item.seriesId) return null;

      const lectureCount = await Lecture.countDocuments({
        seriesId: item.seriesId._id,
        published: true
      });

      const latestLecture = await Lecture.findOne({
        seriesId: item.seriesId._id,
        published: true
      })
        .sort({ dateRecorded: -1, createdAt: -1 })
        .select('titleArabic titleEnglish slug dateRecorded createdAt lectureNumber')
        .lean();

      const isNew = latestLecture && (
        new Date() - new Date(latestLecture.dateRecorded || latestLecture.createdAt) < 7 * 24 * 60 * 60 * 1000
      );

      return {
        ...item,
        latestLecture,
        lectureCount,
        isNew
      };
    })
  );

  const dayOrder = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
  return weeklySchedule
    .filter(item => item !== null)
    .sort((a, b) => dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek));
}

// Helper function to fetch homepage sections with their series
async function fetchSectionsData() {
  const sections = await Section.find({ isVisible: true })
    .sort({ displayOrder: 1 })
    .lean();

  const sectionsWithSeries = await Promise.all(
    sections.map(async (section) => {
      const seriesInSection = await Series.find({
        sectionId: section._id,
        isVisible: { $ne: false }
      })
        .populate('sheikhId', 'nameArabic nameEnglish honorific')
        .sort({ sectionOrder: 1 })
        .lean();

      // Get lecture counts for each series
      const seriesWithCounts = await Promise.all(
        seriesInSection.map(async (s) => {
          const lectureCount = await Lecture.countDocuments({
            seriesId: s._id,
            published: true
          });
          return {
            ...s,
            sheikh: s.sheikhId,
            lectureCount
          };
        })
      );

      // Filter out series with no published lectures
      const filteredSeries = seriesWithCounts.filter(s => s.lectureCount > 0);

      return {
        ...section,
        series: filteredSeries,
        totalSeriesCount: filteredSeries.length
      };
    })
  );

  // Only return sections that have at least one series
  return sectionsWithSeries.filter(s => s.totalSeriesCount > 0);
}

// @route   GET /
// @desc    Homepage - Series-based view with tabs
// @access  Public
router.get('/', async (req, res) => {
  try {
    // PERFORMANCE: Only load schedule initially, series loaded via API
    // Get schedule data from cache or fetch (lightweight)
    const weeklySchedule = await cache.getOrSet(
      'homepage:schedule',
      fetchScheduleData,
      CACHE_TTL.SCHEDULE
    );

    // Get total lecture count (lightweight query)
    const totalLectureCount = await cache.getOrSet(
      'homepage:lectureCount',
      () => Lecture.countDocuments({ published: true }),
      CACHE_TTL.HOMEPAGE
    );

    // Get homepage sections (cached)
    const homepageSections = await cache.getOrSet(
      'homepage:sections',
      fetchSectionsData,
      CACHE_TTL.HOMEPAGE
    );

    // Get site settings for homepage config and stats
    let showPublicStats = false;
    let homepageConfig = {
      showSchedule: true,
      showSeriesTab: true,
      showStandaloneTab: true,
      showKhutbasTab: true
    };
    try {
      const settings = await SiteSettings.getSettings();
      showPublicStats = settings.shouldShowPublicStats();
      if (settings.homepage) {
        homepageConfig = {
          showSchedule: settings.homepage.showSchedule !== false,
          showSeriesTab: settings.homepage.showSeriesTab !== false,
          showStandaloneTab: settings.homepage.showStandaloneTab !== false,
          showKhutbasTab: settings.homepage.showKhutbasTab !== false
        };
      }
    } catch (err) {
      console.error('Failed to get site settings:', err.message);
    }

    res.render('public/index', {
      title: 'المكتبة الصوتية',
      seriesList: [],           // Empty - loaded via API
      standaloneLectures: [],   // Empty - loaded via API
      khutbaSeries: [],         // Empty - loaded via API
      weeklySchedule,
      totalLectureCount,
      homepageSections,
      homepageConfig,
      showPublicStats,
      lazyLoadSeries: true      // Flag for template to show loading state
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

// @route   GET /lectures/:idOrSlug
// @desc    Single lecture detail page (supports both ObjectId and slug)
// @access  Public
router.get('/lectures/:idOrSlug', async (req, res) => {
  try {
    const { findWithRedirectCheck } = require('../utils/findByIdOrSlug');

    // Get lecture by ID or slug
    const { doc: lecture, shouldRedirect, canonicalSlug } = await findWithRedirectCheck(
      Lecture,
      req.params.idOrSlug,
      [
        { path: 'sheikhId', select: 'nameArabic nameEnglish honorific bioArabic bioEnglish slug' },
        { path: 'seriesId', select: 'titleArabic titleEnglish descriptionArabic descriptionEnglish category slug' }
      ]
    );

    if (!lecture || !lecture.published) {
      return res.status(404).send('Lecture not found');
    }

    // 301 redirect to canonical slug URL for SEO
    if (shouldRedirect && canonicalSlug) {
      return res.redirect(301, '/lectures/' + encodeURIComponent(canonicalSlug));
    }

    // Get related lectures from the same series only, sorted by lectureNumber
    let relatedLectures = [];

    if (lecture.seriesId) {
      relatedLectures = await Lecture.find({
        _id: { $ne: lecture._id },
        seriesId: lecture.seriesId._id,
        published: true
      })
        .sort({ lectureNumber: 1, dateRecorded: 1, createdAt: 1 })
        .populate('sheikhId', 'nameArabic nameEnglish honorific')
        .populate('seriesId', 'titleArabic titleEnglish')
        .lean();
    }

    res.render('public/lecture', {
      title: lecture.titleArabic,
      lecture,
      relatedLectures,
      canonicalPath: '/lectures/' + (lecture.slug ? encodeURIComponent(lecture.slug) : lecture._id)
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

// @route   GET /sheikhs/:idOrSlug
// @desc    Single sheikh profile page (supports both ObjectId and slug)
// @access  Public
router.get('/sheikhs/:idOrSlug', async (req, res) => {
  try {
    const { findWithRedirectCheck } = require('../utils/findByIdOrSlug');

    // Get sheikh by ID or slug
    const { doc: sheikh, shouldRedirect, canonicalSlug } = await findWithRedirectCheck(
      Sheikh,
      req.params.idOrSlug
    );

    if (!sheikh) {
      return res.status(404).send('Sheikh not found');
    }

    // 301 redirect to canonical slug URL for SEO
    if (shouldRedirect && canonicalSlug) {
      return res.redirect(301, '/sheikhs/' + encodeURIComponent(canonicalSlug));
    }

    // Get all lectures by this sheikh
    const lectures = await Lecture.find({
      sheikhId: sheikh._id,
      published: true
    })
      .sort({ createdAt: -1 })
      .populate('sheikhId', 'nameArabic nameEnglish honorific slug')
      .populate('seriesId', 'titleArabic titleEnglish slug')
      .lean();

    // Calculate statistics
    const stats = {
      totalLectures: lectures.length,
      totalPlays: lectures.reduce((sum, lecture) => sum + (lecture.playCount || 0), 0),
      totalDuration: lectures.reduce((sum, lecture) => sum + (lecture.duration || 0), 0)
    };

    // Get visible series by this sheikh
    const series = await Series.find({ sheikhId: sheikh._id, isVisible: { $ne: false } })
      .sort({ titleArabic: 1 })
      .lean();

    res.render('public/sheikh', {
      title: sheikh.nameArabic,
      sheikh,
      lectures,
      series,
      stats,
      canonicalPath: '/sheikhs/' + (sheikh.slug ? encodeURIComponent(sheikh.slug) : sheikh._id)
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
    // Only show visible series
    const series = await Series.find({ isVisible: { $ne: false } })
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

// @route   GET /series/:idOrSlug
// @desc    Single series profile page (supports both ObjectId and slug)
// @access  Public
router.get('/series/:idOrSlug', async (req, res) => {
  try {
    const { findWithRedirectCheck } = require('../utils/findByIdOrSlug');

    // Get series by ID or slug
    const { doc: series, shouldRedirect, canonicalSlug } = await findWithRedirectCheck(
      Series,
      req.params.idOrSlug,
      { path: 'sheikhId', select: 'nameArabic nameEnglish honorific bioArabic bioEnglish slug' }
    );

    // Return 404 if series not found or if hidden
    if (!series || series.isVisible === false) {
      return res.status(404).send('Series not found');
    }

    // 301 redirect to canonical slug URL for SEO
    if (shouldRedirect && canonicalSlug) {
      return res.redirect(301, '/series/' + encodeURIComponent(canonicalSlug));
    }

    // Get all lectures in this series (ordered by sortOrder, then lecture number)
    // Use aggregation to handle null/undefined sortOrder values consistently
    const mongoose = require('mongoose');
    const lectures = await Lecture.aggregate([
      {
        $match: {
          seriesId: series._id,
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
      relatedKhutbaSeries,
      canonicalPath: '/series/' + (series.slug ? encodeURIComponent(series.slug) : series._id)
    });
  } catch (error) {
    console.error('Series profile error:', error);
    res.status(500).send('Error loading series profile');
  }
});

// Helper function to generate sitemap XML (for caching)
async function generateSitemap() {
  const baseUrl = 'https://rasmihassan.com';

  // Get all published lectures (include slug for SEO-friendly URLs)
  const lectures = await Lecture.find({ published: true })
    .select('_id slug updatedAt')
    .lean();

  // Get all visible series (exclude hidden ones)
  const series = await Series.find({ isVisible: { $ne: false } })
    .select('_id slug updatedAt')
    .lean();

  // Get all sheikhs
  const sheikhs = await Sheikh.find()
    .select('_id slug updatedAt')
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

  // Add lectures (use slug if available, otherwise ID)
  for (const lecture of lectures) {
    const lastmod = lecture.updatedAt ? new Date(lecture.updatedAt).toISOString().split('T')[0] : '';
    const lectureUrl = lecture.slug ? encodeURIComponent(lecture.slug) : lecture._id;
    xml += `  <url>
    <loc>${baseUrl}/lectures/${lectureUrl}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
  }

  // Add series (use slug if available, otherwise ID)
  for (const s of series) {
    const lastmod = s.updatedAt ? new Date(s.updatedAt).toISOString().split('T')[0] : '';
    const seriesUrl = s.slug ? encodeURIComponent(s.slug) : s._id;
    xml += `  <url>
    <loc>${baseUrl}/series/${seriesUrl}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  }

  // Add sheikhs (use slug if available, otherwise ID)
  for (const sheikh of sheikhs) {
    const lastmod = sheikh.updatedAt ? new Date(sheikh.updatedAt).toISOString().split('T')[0] : '';
    const sheikhUrl = sheikh.slug ? encodeURIComponent(sheikh.slug) : sheikh._id;
    xml += `  <url>
    <loc>${baseUrl}/sheikhs/${sheikhUrl}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  }

  xml += `</urlset>`;
  return xml;
}

// @route   GET /sitemap.xml
// @desc    XML Sitemap for SEO (uses slugs when available)
// @access  Public
router.get('/sitemap.xml', async (req, res) => {
  try {
    // Get sitemap from cache or generate
    const xml = await cache.getOrSet(
      'sitemap:xml',
      generateSitemap,
      CACHE_TTL.SITEMAP
    );

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600'); // 1 hour browser cache
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
Disallow: /admin/
Disallow: /api/
Disallow: /auth/

# Sitemap
Sitemap: https://rasmihassan.com/sitemap.xml

# Block AI training bots
User-agent: Amazonbot
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: meta-externalagent
Disallow: /
`;

  res.set('Content-Type', 'text/plain');
  res.send(robotsTxt);
});

module.exports = router;
