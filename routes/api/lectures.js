const express = require('express');
const router = express.Router();
const { upload } = require('../../config/storage');
const { validateUploadedFile, handleMulterError } = require('../../middleware/fileValidation');
const { isAdminAPI } = require('../../middleware/auth');
const { extractAudioMetadata, isValidAudioFile } = require('../../utils/audioMetadata');
const fileManager = require('../../utils/fileManager');
const path = require('path');
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
        fileManager.deleteFile(file.filename);
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
        fileManager.deleteFile(file.filename);
        return res.status(400).json({
          success: false,
          message: 'Arabic title is required'
        });
      }

      if (!sheikhId) {
        fileManager.deleteFile(file.filename);
        return res.status(400).json({
          success: false,
          message: 'Sheikh is required'
        });
      }

      // Verify sheikh exists
      const sheikh = await Sheikh.findById(sheikhId);
      if (!sheikh) {
        fileManager.deleteFile(file.filename);
        return res.status(400).json({
          success: false,
          message: 'Sheikh not found'
        });
      }

      // Verify series exists (if provided)
      if (seriesId) {
        const series = await Series.findById(seriesId);
        if (!series) {
          fileManager.deleteFile(file.filename);
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
        fileManager.deleteFile(req.file.filename);
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

// @route   POST /api/lectures/bulk-upload-audio
// @desc    Upload audio file for existing lecture (bulk upload)
// @access  Private (Admin only)
router.post('/bulk-upload-audio', [isAdminAPI, upload.single('audioFile')], async (req, res) => {
  try {
    const { lectureId } = req.body;

    if (!lectureId) {
      return res.status(400).json({
        success: false,
        message: 'Lecture ID is required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Audio file is required'
      });
    }

    // Find the lecture
    const lecture = await Lecture.findById(lectureId);

    if (!lecture) {
      // Clean up uploaded file
      await fileManager.fileManager.deleteFile(req.file.filename);
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    // If lecture already has audio, delete the old file
    if (lecture.audioFileName) {
      await fileManager.fileManager.deleteFile(lecture.audioFileName);
    }

    // Extract audio metadata
    const metadata = await extractAudioMetadata(req.file.path);

    // Update lecture with audio file info
    lecture.audioFileName = req.file.filename;
    lecture.duration = Math.floor(metadata.duration || 0);
    lecture.fileSize = req.file.size;
    lecture.bitrate = metadata.bitrate || null;
    lecture.format = metadata.format || path.extname(req.file.filename).substring(1);

    await lecture.save();

    res.json({
      success: true,
      message: 'Audio file uploaded successfully',
      lecture: lecture
    });

  } catch (error) {
    console.error('Bulk upload audio error:', error);

    // Clean up uploaded file on error
    if (req.file) {
      await fileManager.fileManager.deleteFile(req.file.filename);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload audio file',
      error: error.message
    });
  }
});

// @route   PUT /api/lectures/:id
// @desc    Update lecture
// @access  Private (Admin only)
router.put('/:id', isAdminAPI, async (req, res) => {
  try {
    const {
      titleArabic,
      titleEnglish,
      descriptionArabic,
      descriptionEnglish,
      published,
      featured
    } = req.body;

    const lecture = await Lecture.findByIdAndUpdate(
      req.params.id,
      {
        titleArabic,
        titleEnglish,
        descriptionArabic,
        descriptionEnglish,
        published,
        featured
      },
      { new: true, runValidators: true }
    ).populate('sheikhId', 'nameArabic nameEnglish')
     .populate('seriesId', 'titleArabic titleEnglish');

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    res.json({
      success: true,
      message: 'Lecture updated successfully',
      lecture: lecture
    });
  } catch (error) {
    console.error('Update lecture error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update lecture',
      error: error.message
    });
  }
});

// @route   DELETE /api/lectures/:id
// @desc    Delete lecture
// @access  Private (Admin only)
router.delete('/:id', isAdminAPI, async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id);

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    // Delete the audio file
    fileManager.deleteFile(lecture.audioFileName);

    // Decrement sheikh lecture count
    await Sheikh.findByIdAndUpdate(lecture.sheikhId, {
      $inc: { lectureCount: -1 }
    });

    // Decrement series lecture count (if applicable)
    if (lecture.seriesId) {
      await Series.findByIdAndUpdate(lecture.seriesId, {
        $inc: { lectureCount: -1 }
      });
    }

    // Delete lecture from database
    await Lecture.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Lecture deleted successfully'
    });
  } catch (error) {
    console.error('Delete lecture error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete lecture',
      error: error.message
    });
  }
});

// @route   POST /api/lectures/:id/play
// @desc    Increment play count
// @access  Public
router.post('/:id/play', async (req, res) => {
  try {
    const lecture = await Lecture.findByIdAndUpdate(
      req.params.id,
      { $inc: { playCount: 1 } },
      { new: true }
    );

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    res.json({
      success: true,
      playCount: lecture.playCount
    });
  } catch (error) {
    console.error('Increment play count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to increment play count',
      error: error.message
    });
  }
});

module.exports = router;
