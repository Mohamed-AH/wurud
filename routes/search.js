const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const models = require('../models');
const {
  formatTime,
  stripTimestamps,
  stripSheikhPrefix
} = require('../utils/arabicSearch');
const { sanitizeSearchInput, sanitizeComment } = require('../utils/validators');
const { recordSearch } = require('../utils/metrics');
const sentryMetrics = require('../utils/sentryMetrics');

// Config from environment
const SEARCH_MODE = process.env.SEARCH_MODE || 'atlas';
const CONTEXT_WINDOW_SEC = parseInt(process.env.CONTEXT_WINDOW_SEC, 10) || 90;
const CONTEXT_ITEMS = parseInt(process.env.CONTEXT_ITEMS, 10) || 2;
const LOG_SEARCHES = process.env.LOG_SEARCHES !== 'false';
const isProduction = process.env.NODE_ENV === 'production';

// Helper to get search models (lazy access since they're initialized async)
const getTranscript = () => models.Transcript;
const getSearchLog = () => models.SearchLog;

/**
 * GET /search - Redirect to homepage (search consolidated on homepage)
 * The standalone search page has been decommissioned.
 */
router.get('/', (req, res) => {
  const query = req.query.q || '';
  // Redirect to homepage - the search functionality is now integrated there
  if (query) {
    res.redirect(301, `/?search=${encodeURIComponent(query)}`);
  } else {
    res.redirect(301, '/');
  }
});

/**
 * GET /search/results - Redirect to homepage (search consolidated on homepage)
 * The standalone search results page has been decommissioned.
 */
router.get('/results', (req, res) => {
  const query = req.query.q || '';
  // Redirect to homepage with search query
  if (query) {
    res.redirect(301, `/?search=${encodeURIComponent(query)}`);
  } else {
    res.redirect(301, '/');
  }
});

/**
 * GET /search/api - JSON API for enhanced search (used by homepage)
 */
router.get('/api', async (req, res) => {
  // Sanitize search input to prevent XSS
  const query = sanitizeSearchInput(req.query.q || '', 200);

  if (!query) {
    return res.json({
      success: true,
      query: '',
      results: [],
      searchLogId: null
    });
  }

  // Check if search models are initialized
  const Transcript = getTranscript();
  if (!Transcript) {
    return res.status(503).json({
      success: false,
      error: 'خدمة البحث غير متاحة حالياً. يرجى المحاولة لاحقاً.'
    });
  }

  try {
    // Strip sheikh prefix for cleaner matching
    const searchQuery = stripSheikhPrefix(query);

    let results = [];

    // Track search latency
    const searchStart = Date.now();

    if (SEARCH_MODE === 'atlas') {
      results = await performAtlasSearch(searchQuery);
    } else {
      results = await performLocalSearch(searchQuery);
    }

    const searchLatency = Date.now() - searchStart;

    // Enrich results with context
    results = await enrichWithContext(results);

    // Log search (best-effort)
    let searchLogId = null;
    if (LOG_SEARCHES) {
      searchLogId = await logSearch(query, searchQuery, results);
    }

    // Record search metrics (term, result count, latency)
    recordSearch(query, results.length, searchLatency);

    // Sentry metrics for search performance
    sentryMetrics.searchLatency(searchLatency, SEARCH_MODE, results.length);
    if (results.length === 0) {
      sentryMetrics.searchEmpty(SEARCH_MODE);
    }

    res.json({
      success: true,
      query,
      results,
      resultCount: results.length,
      searchLogId
    });
  } catch (error) {
    console.error('Search API error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى.'
    });
  }
});

/**
 * POST /search/feedback - Submit feedback
 */
router.post('/feedback', async (req, res) => {
  try {
    const SearchLog = getSearchLog();
    if (!SearchLog) {
      console.warn('[Feedback] SearchLog model not initialized');
      return res.status(503).json({ error: 'خدمة البحث غير متاحة' });
    }

    const { logId, relevant, comment } = req.body;
    console.log('[Feedback] Received:', { logId, relevant, comment: comment?.slice(0, 50) });

    // Validate logId
    if (!logId || !mongoose.Types.ObjectId.isValid(logId)) {
      console.warn('[Feedback] Invalid logId:', logId);
      return res.status(400).json({ error: 'معرف غير صالح' });
    }

    // Validate relevant
    const relevantBool = relevant === 'true' || relevant === true;
    const isRelevantProvided = relevant === 'true' || relevant === 'false' || typeof relevant === 'boolean';

    if (!isRelevantProvided) {
      return res.status(400).json({ error: 'يرجى تحديد ما إذا كانت النتائج مفيدة' });
    }

    // Sanitize comment to prevent XSS
    const sanitizedComment = comment ? sanitizeComment(comment, 300) : undefined;

    // Update search log
    const result = await SearchLog.findByIdAndUpdate(logId, {
      relevant: relevantBool,
      relevantAt: new Date(),
      comment: sanitizedComment
    }, { new: true });

    if (result) {
      console.log('[Feedback] Saved successfully - ID:', logId, 'Relevant:', relevantBool);
    } else {
      console.warn('[Feedback] Log not found:', logId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Feedback] Error:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء حفظ التقييم' });
  }
});

/**
 * Atlas Search - lucene.arabic analyzer handles normalization natively
 * Groups results by lectureId to prevent one lecture from dominating results
 */
async function performAtlasSearch(query) {
  const Transcript = getTranscript();

  const pipeline = [
    {
      $search: {
        index: 'default',
        compound: {
          should: [
            // Phrase match with high boost for exact phrase relevance
            {
              phrase: {
                query,
                path: 'text',
                slop: 2,
                score: { boost: { value: 5 } }
              }
            },
            // Text match with fuzzy for typo tolerance
            {
              text: {
                query,
                path: 'text',
                fuzzy: { maxEdits: 1 }
              }
            }
          ],
          minimumShouldMatch: 1
        }
      }
    },
    {
      $limit: 100  // Get more results before grouping
    },
    {
      $lookup: {
        from: 'lectures',
        localField: 'lectureId',
        foreignField: '_id',
        as: 'lecture'
      }
    },
    {
      $unwind: {
        path: '$lecture',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $addFields: {
        score: { $meta: 'searchScore' }
      }
    },
    // Sort by score before grouping to ensure top hit is first
    {
      $sort: { score: -1 }
    },
    // Group by lectureId - keep top hit and collect additional hits
    {
      $group: {
        _id: '$lectureId',
        topHit: { $first: '$$ROOT' },
        additionalHits: {
          $push: {
            _id: '$_id',
            shortId: '$shortId',
            text: '$text',
            speaker: '$speaker',
            startTimeSec: '$startTimeSec',
            startTimeMs: '$startTimeMs',
            score: '$score'
          }
        },
        maxScore: { $max: '$score' }
      }
    },
    // Sort groups by their top score
    {
      $sort: { maxScore: -1 }
    },
    // Limit to top lectures
    {
      $limit: 20
    },
    // Reshape the output
    {
      $project: {
        _id: '$topHit._id',
        lectureId: '$_id',
        shortId: '$topHit.shortId',
        text: '$topHit.text',
        speaker: '$topHit.speaker',
        startTimeSec: '$topHit.startTimeSec',
        startTimeMs: '$topHit.startTimeMs',
        lectureTitle: '$topHit.lecture.titleArabic',
        lectureShortId: '$topHit.lecture.shortId',
        lectureSlugEn: '$topHit.lecture.slug_en',
        audioUrl: '$topHit.lecture.audioUrl',
        audioFileName: '$topHit.lecture.audioFileName',
        score: '$topHit.score',
        // Filter out the top hit from additional hits and limit to 5
        additionalHits: {
          $slice: [
            {
              $filter: {
                input: '$additionalHits',
                as: 'hit',
                cond: { $ne: ['$$hit._id', '$topHit._id'] }
              }
            },
            5
          ]
        }
      }
    }
  ];

  return await Transcript.aggregate(pipeline);
}

/**
 * Local text search fallback
 * Groups results by lectureId to prevent one lecture from dominating results
 */
async function performLocalSearch(query) {
  const Transcript = getTranscript();

  const results = await Transcript.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(100)  // Get more results before grouping
    .populate('lectureId', 'titleArabic shortId slug_en audioUrl audioFileName')
    .lean();

  // Group results by lectureId
  const grouped = new Map();

  for (const r of results) {
    const lectureIdStr = r.lectureId?._id?.toString() || 'unknown';

    const hit = {
      _id: r._id,
      lectureId: r.lectureId?._id,
      shortId: r.shortId,
      text: r.text,
      speaker: r.speaker,
      startTimeSec: r.startTimeSec,
      startTimeMs: r.startTimeMs,
      lectureTitle: r.lectureId?.titleArabic,
      lectureShortId: r.lectureId?.shortId,
      lectureSlugEn: r.lectureId?.slug_en,
      audioUrl: r.lectureId?.audioUrl,
      audioFileName: r.lectureId?.audioFileName,
      score: r.score
    };

    if (!grouped.has(lectureIdStr)) {
      // First hit for this lecture becomes the top hit
      grouped.set(lectureIdStr, {
        ...hit,
        additionalHits: []
      });
    } else if (grouped.get(lectureIdStr).additionalHits.length < 5) {
      // Add to additional hits (up to 5)
      grouped.get(lectureIdStr).additionalHits.push({
        _id: r._id,
        shortId: r.shortId,
        text: r.text,
        speaker: r.speaker,
        startTimeSec: r.startTimeSec,
        startTimeMs: r.startTimeMs,
        score: r.score
      });
    }
  }

  // Convert to array and limit to 20 lectures
  return Array.from(grouped.values()).slice(0, 20);
}

/**
 * Enrich results with context (surrounding transcript lines)
 */
async function enrichWithContext(results) {
  const Transcript = getTranscript();
  const enriched = [];

  for (const result of results) {
    const contextBefore = await Transcript.find({
      lectureId: result.lectureId,
      startTimeSec: {
        $gte: result.startTimeSec - CONTEXT_WINDOW_SEC,
        $lt: result.startTimeSec
      },
      _id: { $ne: result._id }
    })
      .sort({ startTimeSec: -1 })
      .limit(CONTEXT_ITEMS)
      .lean();

    const contextAfter = await Transcript.find({
      lectureId: result.lectureId,
      startTimeSec: {
        $gt: result.startTimeSec,
        $lte: result.startTimeSec + CONTEXT_WINDOW_SEC
      },
      _id: { $ne: result._id }
    })
      .sort({ startTimeSec: 1 })
      .limit(CONTEXT_ITEMS)
      .lean();

    // Reverse contextBefore to get chronological order
    const beforeText = contextBefore
      .reverse()
      .map(c => stripTimestamps(c.text))
      .join(' ');

    const afterText = contextAfter
      .map(c => stripTimestamps(c.text))
      .join(' ');

    // Enrich additional hits with formatted time (no full context needed)
    const enrichedAdditionalHits = (result.additionalHits || []).map(hit => ({
      ...hit,
      formattedTime: formatTime(hit.startTimeSec)
    }));

    enriched.push({
      ...result,
      contextBefore: beforeText,
      contextAfter: afterText,
      formattedTime: formatTime(result.startTimeSec),
      additionalHits: enrichedAdditionalHits
    });
  }

  return enriched;
}

/**
 * Log search query (best-effort, no failure)
 */
async function logSearch(query, searchQuery, results) {
  try {
    const SearchLog = getSearchLog();
    if (!SearchLog) {
      console.warn('[SearchLog] Model not initialized - search not logged');
      return null;
    }

    console.log('[SearchLog] Creating log for query:', query);
    const log = await SearchLog.create({
      query,
      normalizedQuery: searchQuery,
      resultCount: results.length,
      topLectureIds: results.slice(0, 5).map(r => r.lectureId?.toString()).filter(Boolean),
      searchMode: SEARCH_MODE,
      relevant: null
    });
    console.log('[SearchLog] Saved successfully - ID:', log._id.toString(), 'Results:', results.length);
    return log._id.toString();
  } catch (error) {
    console.error('[SearchLog] Error saving:', error.message);
    return null;
  }
}

module.exports = router;
