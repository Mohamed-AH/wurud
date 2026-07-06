/**
 * Article Editor Routes
 * For external contributors to edit article content (fix typos, grammar)
 */

const express = require('express');
const router = express.Router();
const { Article, Admin } = require('../../models');
const { isArticleEditor, isArticleEditorAPI } = require('../../middleware/auth');

/**
 * GET /article-editor/login
 * Login page for article editors
 */
router.get('/login', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/article-editor');
  }
  res.render('article-editor/login', {
    title: 'تسجيل الدخول - محرر المقالات',
    error: req.query.error
  });
});

/**
 * GET /article-editor
 * Dashboard with article list
 */
router.get('/', isArticleEditor, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    // Build query
    const query = { isPublished: true };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } }
      ];
    }

    const [articles, totalCount] = await Promise.all([
      Article.find(query)
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('title summary type publishedAt lastEditedBy lastEditedAt shortId slug')
        .populate('lastEditedBy', 'displayName email')
        .lean(),
      Article.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.render('article-editor/dashboard', {
      title: 'لوحة تحرير المقالات',
      articles,
      pagination: {
        page,
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      search,
      user: req.user
    });
  } catch (error) {
    console.error('Article editor dashboard error:', error);
    res.status(500).render('article-editor/error', {
      title: 'خطأ',
      message: 'حدث خطأ في تحميل المقالات'
    });
  }
});

/**
 * GET /article-editor/article/:id
 * Edit single article
 */
router.get('/article/:id', isArticleEditor, async (req, res) => {
  try {
    const article = await Article.findOne({
      $or: [
        { _id: req.params.id },
        { shortId: parseInt(req.params.id) },
        { slug: req.params.id }
      ]
    }).lean();

    if (!article) {
      return res.status(404).render('article-editor/error', {
        title: 'غير موجود',
        message: 'المقال غير موجود'
      });
    }

    res.render('article-editor/edit', {
      title: `تحرير: ${article.title}`,
      article,
      user: req.user
    });
  } catch (error) {
    console.error('Article editor edit page error:', error);
    res.status(500).render('article-editor/error', {
      title: 'خطأ',
      message: 'حدث خطأ في تحميل المقال'
    });
  }
});

/**
 * POST /article-editor/article/:id
 * Save article changes with history tracking
 */
router.post('/article/:id', isArticleEditorAPI, async (req, res) => {
  try {
    const { title, summary, content, changeDescription } = req.body;

    const article = await Article.findOne({
      $or: [
        { _id: req.params.id },
        { shortId: parseInt(req.params.id) },
        { slug: req.params.id }
      ]
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'المقال غير موجود'
      });
    }

    // Track changes
    const changes = [];
    const fieldsChanged = [];

    if (title !== undefined && title !== article.title) {
      changes.push({
        field: 'title',
        oldValue: article.title,
        newValue: title
      });
      fieldsChanged.push('title');
      article.title = title;
    }

    if (summary !== undefined && summary !== article.summary) {
      changes.push({
        field: 'summary',
        oldValue: article.summary || '',
        newValue: summary
      });
      fieldsChanged.push('summary');
      article.summary = summary;
    }

    if (content !== undefined && content !== article.content) {
      changes.push({
        field: 'content',
        oldValue: article.content,
        newValue: content
      });
      fieldsChanged.push('content');
      article.content = content;
    }

    // Only save if there are actual changes
    if (changes.length === 0) {
      return res.json({
        success: true,
        message: 'لا توجد تغييرات للحفظ',
        noChanges: true
      });
    }

    // Add to edit history
    article.editHistory.push({
      editedBy: req.user._id,
      editedAt: new Date(),
      fieldsChanged,
      changes,
      changeDescription: changeDescription || ''
    });

    // Update last edited info
    article.lastEditedBy = req.user._id;
    article.lastEditedAt = new Date();

    await article.save();

    res.json({
      success: true,
      message: 'تم حفظ التغييرات بنجاح',
      fieldsChanged
    });
  } catch (error) {
    console.error('Article save error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في حفظ التغييرات'
    });
  }
});

/**
 * GET /article-editor/article/:id/history
 * View edit history for an article
 */
router.get('/article/:id/history', isArticleEditor, async (req, res) => {
  try {
    const article = await Article.findOne({
      $or: [
        { _id: req.params.id },
        { shortId: parseInt(req.params.id) },
        { slug: req.params.id }
      ]
    })
      .select('title editHistory shortId slug')
      .populate('editHistory.editedBy', 'displayName email profilePhoto')
      .lean();

    if (!article) {
      return res.status(404).render('article-editor/error', {
        title: 'غير موجود',
        message: 'المقال غير موجود'
      });
    }

    // Sort history by date descending (most recent first)
    const history = (article.editHistory || []).sort((a, b) =>
      new Date(b.editedAt) - new Date(a.editedAt)
    );

    res.render('article-editor/history', {
      title: `سجل التعديلات: ${article.title}`,
      article,
      history,
      user: req.user
    });
  } catch (error) {
    console.error('Article history error:', error);
    res.status(500).render('article-editor/error', {
      title: 'خطأ',
      message: 'حدث خطأ في تحميل سجل التعديلات'
    });
  }
});

/**
 * GET /article-editor/logout
 * Logout and redirect to login
 */
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/article-editor/login');
  });
});

module.exports = router;
