const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const models = require('../models');
const {
  buildSearchQuery,
  matchesMinTokens,
  normalizeArabic,
  formatTime,
  stripTimestamps
} = require('../utils/arabicSearch');

// Config from environment
const SEARCH_MODE = process.env.SEARCH_MODE || 'atlas';
const CONTEXT_WINDOW_SEC = parseInt(process.env.CONTEXT_WINDOW_SEC, 10) || 90;
const CONTEXT_ITEMS = parseInt(process.env.CONTEXT_ITEMS, 10) || 2;
const LOG_SEARCHES = process.env.LOG_SEARCHES !== 'false';

// Helper to get search models (lazy access since they're initialized async)
const getTranscript = () => models.Transcript;
const getSearchLog = () => models.SearchLog;

/**
 * GET /search - Render search page
 */
router.get('/', (req, res) => {
  res.render('search', {
    layout: false,
    query: '',
    results: [],
    error: null,
    searched: false,
    searchLogId: null
  });
});

/**
 * GET /search/results - Perform search
 */
router.get('/results', async (req, res) => {
  const query = (req.query.q || '').trim();

  if (!query) {
    return res.render('search', {
      layout: false,
      query: '',
      results: [],
      error: null,
      searched: false,
      searchLogId: null
    });
  }

  // Check if search models are initialized
  const Transcript = getTranscript();
  if (!Transcript) {
    return res.render('search', {
      layout: false,
      query,
      results: [],
      error: 'خدمة البحث غير متاحة حالياً. يرجى المحاولة لاحقاً.',
      searched: true,
      searchLogId: null
    });
  }

  try {
    // Build search query with variants
    const { normalized, tokens, variants, minShouldMatch } = buildSearchQuery(query);

    let results = [];

    if (SEARCH_MODE === 'atlas') {
      results = await performAtlasSearch(normalized, tokens, variants, minShouldMatch);
    } else {
      results = await performLocalSearch(variants, tokens, minShouldMatch);
    }

    // Filter results by token hit count
    results = results.filter(r => matchesMinTokens(r.text, tokens, minShouldMatch));

    // Enrich results with context
    results = await enrichWithContext(results);

    // Log search (best-effort)
    let searchLogId = null;
    if (LOG_SEARCHES) {
      searchLogId = await logSearch(query, normalized, tokens, minShouldMatch, results);
    }

    res.render('search', {
      layout: false,
      query,
      results,
      error: null,
      searched: true,
      searchLogId
    });
  } catch (error) {
    console.error('Search error:', error);
    res.render('search', {
      layout: false,
      query,
      results: [],
      error: 'حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى.',
      searched: true,
      searchLogId: null
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
      return res.status(503).json({ error: 'خدمة البحث غير متاحة' });
    }

    const { logId, relevant, comment } = req.body;

    // Validate logId
    if (!logId || !mongoose.Types.ObjectId.isValid(logId)) {
      return res.status(400).json({ error: 'معرف غير صالح' });
    }

    // Validate relevant
    const relevantBool = relevant === 'true' || relevant === true;
    const isRelevantProvided = relevant === 'true' || relevant === 'false' || typeof relevant === 'boolean';

    if (!isRelevantProvided) {
      return res.status(400).json({ error: 'يرجى تحديد ما إذا كانت النتائج مفيدة' });
    }

    // Update search log
    await SearchLog.findByIdAndUpdate(logId, {
      relevant: relevantBool,
      relevantAt: new Date(),
      comment: comment ? String(comment).slice(0, 300) : undefined
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء حفظ التقييم' });
  }
});

/**
 * Atlas Search with compound query
 */
async function performAtlasSearch(normalized, tokens, variants, minShouldMatch) {
  const Transcript = getTranscript();

  const mustClauses = tokens.map(token => ({
    text: {
      query: token,
      path: 'text',
      fuzzy: { maxEdits: 1 }
    }
  }));

  const shouldClauses = [
    // Phrase match with high boost
    {
      phrase: {
        query: normalized,
        path: 'text',
        slop: 2,
        score: { boost: { value: 8 } }
      }
    },
    // Exact text match with medium boost
    {
      text: {
        query: normalized,
        path: 'text',
        fuzzy: { maxEdits: 1 },
        score: { boost: { value: 4 } }
      }
    }
  ];

  // Add variant queries with lower boost
  for (const variant of variants.slice(0, 5)) {
    shouldClauses.push({
      text: {
        query: variant,
        path: 'text',
        fuzzy: { maxEdits: 2 }
      }
    });
  }

  const pipeline = [
    {
      $search: {
        index: 'default',
        compound: {
          must: mustClauses,
          should: shouldClauses,
          minimumShouldMatch: Math.max(1, minShouldMatch)
        }
      }
    },
    {
      $limit: 50
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
      $project: {
        _id: 1,
        lectureId: 1,
        shortId: 1,
        text: 1,
        speaker: 1,
        startTimeSec: 1,
        startTimeMs: 1,
        lectureTitle: '$lecture.titleArabic',
        audioUrl: '$lecture.audioUrl',
        audioFileName: '$lecture.audioFileName',
        score: { $meta: 'searchScore' }
      }
    }
  ];

  return await Transcript.aggregate(pipeline);
}

/**
 * Local text search fallback
 */
async function performLocalSearch(variants, tokens, minShouldMatch) {
  const Transcript = getTranscript();
  const searchText = variants.join(' ');

  const results = await Transcript.find(
    { $text: { $search: searchText } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(50)
    .populate('lectureId', 'titleArabic audioUrl audioFileName')
    .lean();

  return results.map(r => ({
    _id: r._id,
    lectureId: r.lectureId?._id,
    shortId: r.shortId,
    text: r.text,
    speaker: r.speaker,
    startTimeSec: r.startTimeSec,
    startTimeMs: r.startTimeMs,
    lectureTitle: r.lectureId?.titleArabic,
    audioUrl: r.lectureId?.audioUrl,
    audioFileName: r.lectureId?.audioFileName,
    score: r.score
  }));
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

    enriched.push({
      ...result,
      contextBefore: beforeText,
      contextAfter: afterText,
      formattedTime: formatTime(result.startTimeSec)
    });
  }

  return enriched;
}

/**
 * Log search query (best-effort, no failure)
 */
async function logSearch(query, normalized, tokens, minShouldMatch, results) {
  try {
    const SearchLog = getSearchLog();
    if (!SearchLog) return null;

    const log = await SearchLog.create({
      query,
      normalizedQuery: normalized,
      tokens,
      minShouldMatch,
      resultCount: results.length,
      topLectureIds: results.slice(0, 5).map(r => r.lectureId?.toString()).filter(Boolean),
      searchMode: SEARCH_MODE,
      relevant: null
    });
    return log._id.toString();
  } catch (error) {
    console.error('Search log error (non-fatal):', error.message);
    return null;
  }
}

module.exports = router;
