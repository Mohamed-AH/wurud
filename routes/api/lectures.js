const express = require('express');
const router = express.Router();
const { upload } = require('../../config/storage');
const { validateUploadedFile, handleMulterError } = require('../../middleware/fileValidation');
const { isAdminAPI } = require('../../middleware/auth');
const { extractAudioMetadata, isValidAudioFile } = require('../../utils/audioMetadata');
const { deleteFile } = require('../../utils/fileManager');
const { Lecture, Sheikh, Series } = require('../../models');

// @route   POST /api/lectures
// @desc    Upload a new lecture with audio file
// @access  Private (Admin only)
router.post('/',
  isAdminAPI,
  upload.single('audioFile'),
  handleMulterError,
  validateUploadedFile,
  async (req, res) => {
    try {
      const file = req.file;

      // Validate audio file content
      const isValid = await isValidAudioFile(file.path);
      if (!isValid) {
        deleteFile(file.filename);
        return res.status(400).json({
          success: false,
          message: 'Invalid audio file. File may be corrupted or not a valid audio format.'
        });
      }

      // Extract audio metadata
      const audioMetadata = await extractAudioMetadata(file.path);

      // Parse request body
      const {
        titleArabic,
        titleEnglish,
        descriptionArabic,
        descriptionEnglish,
        sheikhId,
        seriesId,
        lectureNumber,
        location,
        category,
        dateRecorded,
        dateRecordedHijri,
        published,
        featured
      } = req.body;

      // Validate required fields
      if (!titleArabic) {
        deleteFile(file.filename);
        return res.status(400).json({
          success: false,
          message: 'Arabic title is required'
        });
      }

      if (!sheikhId) {
        deleteFile(file.filename);
        return res.status(400).json({
          success: false,
          message: 'Sheikh is required'
        });
      }

      // Verify sheikh exists
      const sheikh = await Sheikh.findById(sheikhId);
      if (!sheikh) {
        deleteFile(file.filename);
        return res.status(400).json({
          success: false,
          message: 'Sheikh not found'
        });
      }

      // Verify series exists (if provided)
      if (seriesId) {
        const series = await Series.findById(seriesId);
        if (!series) {
          deleteFile(file.filename);
          return res.status(400).json({
            success: false,
            message: 'Series not found'
          });
        }
      }

      // Create lecture document
      const lecture = await Lecture.create({
        audioFileName: file.filename,
        titleArabic: titleArabic.trim(),
        titleEnglish: titleEnglish ? titleEnglish.trim() : '',
        descriptionArabic: descriptionArabic ? descriptionArabic.trim() : '',
        descriptionEnglish: descriptionEnglish ? descriptionEnglish.trim() : '',
        sheikhId: sheikhId,
        seriesId: seriesId || null,
        lectureNumber: lectureNumber ? parseInt(lectureNumber) : null,
        duration: audioMetadata.duration,
        fileSize: audioMetadata.fileSize,
        location: location ? location.trim() : 'غير محدد',
        category: category || 'Other',
        dateRecorded: dateRecorded ? new Date(dateRecorded) : null,
        dateRecordedHijri: dateRecordedHijri ? dateRecordedHijri.trim() : null,
        published: published === 'true' || published === true,
        featured: featured === 'true' || featured === true
      });

      // Update sheikh lecture count
      await Sheikh.findByIdAndUpdate(sheikhId, {
        $inc: { lectureCount: 1 }
      });

      // Update series lecture count (if applicable)
      if (seriesId) {
        await Series.findByIdAndUpdate(seriesId, {
          $inc: { lectureCount: 1 }
        });
      }

      // Populate references for response
      await lecture.populate('sheikhId', 'nameArabic nameEnglish honorific');
      await lecture.populate('seriesId', 'titleArabic titleEnglish');

      res.status(201).json({
        success: true,
        message: 'Lecture uploaded successfully',
        lecture: lecture,
        audioMetadata: {
          duration: audioMetadata.durationFormatted,
          fileSize: audioMetadata.fileSizeMB + ' MB',
          bitrate: audioMetadata.bitrate ? audioMetadata.bitrate + ' kbps' : null,
          format: audioMetadata.container
        }
      });

    } catch (error) {
      console.error('Lecture upload error:', error);

      // Clean up uploaded file on error
      if (req.file) {
        deleteFile(req.file.filename);
      }

      res.status(500).json({
        success: false,
        message: 'Failed to upload lecture',
        error: error.message
      });
    }
  }
);

// @route   GET /api/lectures
// @desc    Get all lectures (with pagination and filters)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sheikhId,
      seriesId,
      category,
      published,
      featured,
      search,
      sort = '-createdAt'
    } = req.query;

    // Build query
    const query = {};

    if (sheikhId) query.sheikhId = sheikhId;
    if (seriesId) query.seriesId = seriesId;
    if (category) query.category = category;
    if (published !== undefined) query.published = published === 'true';
    if (featured !== undefined) query.featured = featured === 'true';

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Execute query with pagination
    const lectures = await Lecture.find(query)
      .populate('sheikhId', 'nameArabic nameEnglish honorific')
      .populate('seriesId', 'titleArabic titleEnglish')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await Lecture.countDocuments(query);

    res.json({
      success: true,
      lectures: lectures,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get lectures error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lectures',
      error: error.message
    });
  }
});

// @route   GET /api/lectures/:id
// @desc    Get single lecture by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id)
      .populate('sheikhId', 'nameArabic nameEnglish honorific bioArabic bioEnglish')
      .populate('seriesId', 'titleArabic titleEnglish descriptionArabic descriptionEnglish')
      .lean();

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    res.json({
      success: true,
      lecture: lecture
    });

  } catch (error) {
    console.error('Get lecture error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lecture',
      error: error.message
    });
  }
});

module.exports = router;
