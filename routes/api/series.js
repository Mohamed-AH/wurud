const express = require('express');
const router = express.Router();
const { Series } = require('../../models');
const { isAdminAPI } = require('../../middleware/auth');

// @route   GET /api/series
// @desc    Get all series
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { sheikhId } = req.query;
    const query = {};

    if (sheikhId) {
      query.sheikhId = sheikhId;
    }

    const series = await Series.find(query)
      .sort({ titleArabic: 1 })
      .populate('sheikhId', 'nameArabic nameEnglish')
      .lean();

    res.json({
      success: true,
      series: series
    });
  } catch (error) {
    console.error('Get series error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch series',
      error: error.message
    });
  }
});

// @route   POST /api/series
// @desc    Create new series
// @access  Private (Admin only)
router.post('/', isAdminAPI, async (req, res) => {
  try {
    const {
      titleArabic,
      titleEnglish,
      descriptionArabic,
      descriptionEnglish,
      sheikhId,
      category,
      bookTitle,
      bookAuthor
    } = req.body;

    if (!titleArabic) {
      return res.status(400).json({
        success: false,
        message: 'Arabic title is required'
      });
    }

    if (!sheikhId) {
      return res.status(400).json({
        success: false,
        message: 'Sheikh is required'
      });
    }

    const series = await Series.create({
      titleArabic,
      titleEnglish: titleEnglish || '',
      descriptionArabic: descriptionArabic || '',
      descriptionEnglish: descriptionEnglish || '',
      sheikhId,
      category: category || 'Other',
      bookTitle: bookTitle || '',
      bookAuthor: bookAuthor || ''
    });

    await series.populate('sheikhId', 'nameArabic nameEnglish');

    res.status(201).json({
      success: true,
      message: 'Series created successfully',
      series: series
    });
  } catch (error) {
    console.error('Create series error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create series',
      error: error.message
    });
  }
});

// @route   PUT /api/series/:id
// @desc    Update series
// @access  Private (Admin only)
router.put('/:id', isAdminAPI, async (req, res) => {
  try {
    const {
      titleArabic,
      titleEnglish,
      descriptionArabic,
      descriptionEnglish,
      category,
      bookTitle,
      bookAuthor
    } = req.body;

    const series = await Series.findByIdAndUpdate(
      req.params.id,
      {
        titleArabic,
        titleEnglish,
        descriptionArabic,
        descriptionEnglish,
        category,
        bookTitle,
        bookAuthor
      },
      { new: true, runValidators: true }
    ).populate('sheikhId', 'nameArabic nameEnglish');

    if (!series) {
      return res.status(404).json({
        success: false,
        message: 'Series not found'
      });
    }

    res.json({
      success: true,
      message: 'Series updated successfully',
      series: series
    });
  } catch (error) {
    console.error('Update series error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update series',
      error: error.message
    });
  }
});

// @route   DELETE /api/series/:id
// @desc    Delete series
// @access  Private (Admin only)
router.delete('/:id', isAdminAPI, async (req, res) => {
  try {
    const { Lecture } = require('../../models');

    // Check if series has lectures
    const lectureCount = await Lecture.countDocuments({ seriesId: req.params.id });

    if (lectureCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete series with ${lectureCount} lectures. Delete lectures first.`
      });
    }

    const series = await Series.findByIdAndDelete(req.params.id);

    if (!series) {
      return res.status(404).json({
        success: false,
        message: 'Series not found'
      });
    }

    res.json({
      success: true,
      message: 'Series deleted successfully'
    });
  } catch (error) {
    console.error('Delete series error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete series',
      error: error.message
    });
  }
});

module.exports = router;
