const express = require('express');
const router = express.Router();
const { isAdmin, isEditor, isSuperAdmin } = require('../../middleware/auth');
const { convertToHijri } = require('../../utils/dateUtils');

// @route   GET /admin/login
// @desc    Admin login page
// @access  Public
router.get('/login', (req, res) => {
  // If already authenticated, redirect to dashboard
  if (req.isAuthenticated()) {
    return res.redirect('/admin/dashboard');
  }

  const error = req.query.error;
  let errorMessage = '';

  if (error === 'unauthorized') {
    errorMessage = 'Your email is not authorized to access the admin panel.';
  } else if (error === 'inactive') {
    errorMessage = 'Your admin account has been deactivated.';
  }

  res.render('admin/login', {
    title: 'Admin Login',
    errorMessage
  });
});

// @route   GET /admin/dashboard
// @desc    Admin dashboard
// @access  Private (Admin only)
router.get('/dashboard', isAdmin, async (req, res) => {
  try {
    const { Lecture, Sheikh, Series } = require('../../models');

    // Get statistics
    const stats = {
      totalLectures: await Lecture.countDocuments(),
      publishedLectures: await Lecture.countDocuments({ published: true }),
      totalSheikhs: await Sheikh.countDocuments(),
      totalSeries: await Series.countDocuments(),
      totalPlays: await Lecture.aggregate([
        { $group: { _id: null, total: { $sum: '$playCount' } } }
      ]).then(result => result[0]?.total || 0),
      totalDownloads: await Lecture.aggregate([
        { $group: { _id: null, total: { $sum: '$downloadCount' } } }
      ]).then(result => result[0]?.total || 0)
    };

    // Get recent lectures
    const recentLectures = await Lecture.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('sheikhId', 'nameArabic nameEnglish')
      .populate('seriesId', 'titleArabic titleEnglish')
      .lean();

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      user: req.user,
      stats,
      recentLectures
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Error loading dashboard');
  }
});

// @route   GET /admin/upload
// @desc    Upload lecture page
// @access  Private (Admin only)
router.get('/upload', isAdmin, (req, res) => {
  res.render('admin/upload', {
    title: 'Upload Lecture',
    user: req.user
  });
});

// @route   GET /admin/bulk-upload
// @desc    Bulk upload audio files for existing lectures
// @access  Private (Admin only)
router.get('/bulk-upload', isAdmin, (req, res) => {
  res.render('admin/bulk-upload', {
    title: 'Bulk Upload Audio',
    user: req.user
  });
});

// @route   GET /admin/duration-status
// @desc    Duration verification status page
// @access  Private (Admin only)
router.get('/duration-status', isAdmin, async (req, res) => {
  try {
    const { Lecture } = require('../../models');

    // Get stats
    const total = await Lecture.countDocuments();
    const withAudio = await Lecture.countDocuments({ audioFileName: { $exists: true, $ne: null, $ne: '' } });
    const verified = await Lecture.countDocuments({ durationVerified: true });
    const noAudio = total - withAudio;
    const pending = withAudio - verified;

    const verifiedPercent = withAudio > 0 ? Math.round((verified / withAudio) * 100) : 0;
    const pendingPercent = withAudio > 0 ? Math.round((pending / withAudio) * 100) : 0;

    // Get pending lectures (with audio but not verified)
    const pendingLectures = await Lecture.find({
      audioFileName: { $exists: true, $ne: null, $ne: '' },
      $or: [
        { durationVerified: false },
        { durationVerified: { $exists: false } }
      ]
    })
      .select('_id titleArabic audioFileName duration seriesId')
      .populate('seriesId', 'titleArabic')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.render('admin/duration-status', {
      title: 'Duration Verification Status',
      user: req.user,
      stats: {
        total,
        withAudio,
        verified,
        noAudio,
        pending,
        verifiedPercent,
        pendingPercent
      },
      pendingLectures
    });
  } catch (error) {
    console.error('Duration status error:', error);
    res.status(500).send('Error loading duration status page');
  }
});

// @route   GET /admin/manage
// @desc    Manage lectures page
// @access  Private (Admin only)
router.get('/manage', isAdmin, async (req, res) => {
  try {
    const { Lecture, Series } = require('../../models');

    const lectures = await Lecture.find()
      .sort({ createdAt: -1 })
      .populate('sheikhId', 'nameArabic nameEnglish')
      .populate('seriesId', 'titleArabic titleEnglish')
      .lean();

    const series = await Series.find()
      .sort({ createdAt: -1 })
      .populate('sheikhId', 'nameArabic nameEnglish')
      .lean();

    res.render('admin/manage', {
      title: 'Manage Lectures',
      user: req.user,
      lectures,
      series
    });
  } catch (error) {
    console.error('Manage error:', error);
    res.status(500).send('Error loading manage page');
  }
});

// @route   GET /admin/lectures
// @desc    Search and list all lectures
// @access  Private (Admin only)
router.get('/lectures', isAdmin, async (req, res) => {
  try {
    const { Lecture, Series } = require('../../models');
    const { search, seriesId } = req.query;

    // Build query
    const query = {};

    if (search) {
      query.$or = [
        { titleArabic: { $regex: search, $options: 'i' } },
        { titleEnglish: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } }
      ];
    }

    if (seriesId) {
      query.seriesId = seriesId;
    }

    const lectures = await Lecture.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('sheikhId', 'nameArabic nameEnglish')
      .populate('seriesId', 'titleArabic titleEnglish')
      .lean();

    const allSeries = await Series.find().sort({ titleArabic: 1 }).lean();

    res.render('admin/lectures-list', {
      title: 'إدارة المحاضرات',
      user: req.user,
      lectures,
      allSeries,
      search: search || '',
      selectedSeriesId: seriesId || ''
    });
  } catch (error) {
    console.error('Lectures list error:', error);
    res.status(500).send('Error loading lectures');
  }
});

// @route   POST /admin/lectures/:id/delete
// @desc    Delete a lecture
// @access  Private (Admin only)
router.post('/lectures/:id/delete', isAdmin, async (req, res) => {
  try {
    const { Lecture, Series, Sheikh } = require('../../models');
    const { deleteFromOCI } = require('../../utils/ociStorage');

    const lecture = await Lecture.findById(req.params.id);

    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    // Delete audio from OCI if exists
    if (lecture.audioFileName) {
      try {
        await deleteFromOCI(lecture.audioFileName);
      } catch (ociError) {
        console.warn('Could not delete OCI file:', ociError.message);
      }
    }

    // Decrement series lecture count
    if (lecture.seriesId) {
      await Series.findByIdAndUpdate(lecture.seriesId, { $inc: { lectureCount: -1 } });
    }

    // Decrement sheikh lecture count
    if (lecture.sheikhId) {
      await Sheikh.findByIdAndUpdate(lecture.sheikhId, { $inc: { lectureCount: -1 } });
    }

    // Delete the lecture
    await Lecture.findByIdAndDelete(req.params.id);

    // Check if request expects JSON (AJAX) or redirect
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({ success: true, message: 'Lecture deleted' });
    }

    // Redirect back to referrer or lectures list
    const returnUrl = req.body.returnUrl || '/admin/lectures';
    res.redirect(returnUrl);
  } catch (error) {
    console.error('Delete lecture error:', error);
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ success: false, message: error.message });
    }
    res.status(500).send('Error deleting lecture');
  }
});

// @route   GET /admin/lectures/unpublished
// @desc    List unpublished lectures
// @access  Private (Admin only)
router.get('/lectures/unpublished', isAdmin, async (req, res) => {
  try {
    const { Lecture } = require('../../models');

    const unpublishedLectures = await Lecture.find({ published: false })
      .sort({ createdAt: -1 })
      .populate('sheikhId', 'nameArabic nameEnglish')
      .populate('seriesId', 'titleArabic titleEnglish')
      .lean();

    res.render('admin/unpublished-lectures', {
      title: 'Unpublished Lectures',
      user: req.user,
      lectures: unpublishedLectures
    });
  } catch (error) {
    console.error('Unpublished lectures error:', error);
    res.status(500).send('Error loading unpublished lectures');
  }
});

// @route   GET /admin/lectures/no-audio
// @desc    List lectures without audio files
// @access  Private (Admin only)
router.get('/lectures/no-audio', isAdmin, async (req, res) => {
  try {
    const { Lecture } = require('../../models');

    const noAudioLectures = await Lecture.find({
      $or: [
        { audioFileName: null },
        { audioFileName: '' }
      ]
    })
      .sort({ createdAt: -1 })
      .populate('sheikhId', 'nameArabic nameEnglish')
      .populate('seriesId', 'titleArabic titleEnglish')
      .lean();

    res.render('admin/no-audio-lectures', {
      title: 'Lectures Without Audio',
      user: req.user,
      lectures: noAudioLectures
    });
  } catch (error) {
    console.error('No audio lectures error:', error);
    res.status(500).send('Error loading lectures without audio');
  }
});

// @route   GET /admin/series/:id/edit
// @desc    Edit series page
// @access  Private (Admin only)
router.get('/series/:id/edit', isAdmin, async (req, res) => {
  try {
    const { Series, Sheikh, Lecture } = require('../../models');

    const series = await Series.findById(req.params.id)
      .populate('sheikhId', 'nameArabic nameEnglish')
      .lean();

    if (!series) {
      return res.status(404).send('Series not found');
    }

    const sheikhs = await Sheikh.find().sort({ nameArabic: 1 }).lean();

    // Get lectures in this series, ordered by sortOrder
    // Use aggregation to handle null/undefined sortOrder values consistently
    const mongoose = require('mongoose');
    const lectures = await Lecture.aggregate([
      {
        $match: { seriesId: new mongoose.Types.ObjectId(req.params.id) }
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
        $project: {
          titleArabic: 1,
          lectureNumber: 1,
          sortOrder: 1,
          dateRecorded: 1,
          published: 1,
          audioUrl: 1,
          durationSeconds: 1
        }
      }
    ]);

    res.render('admin/edit-series', {
      title: 'Edit Series',
      user: req.user,
      series,
      sheikhs,
      lectures,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Edit series error:', error);
    res.status(500).send('Error loading edit series page');
  }
});

// @route   POST /admin/series/:id/edit
// @desc    Update series
// @access  Private (Admin only)
router.post('/series/:id/edit', isAdmin, async (req, res) => {
  try {
    const { Series } = require('../../models');
    const { titleArabic, titleEnglish, category, descriptionArabic, descriptionEnglish, tags, bookAuthor, isVisible } = req.body;

    // Handle tags - can be a string (single tag) or array (multiple tags)
    let tagsArray = [];
    if (tags) {
      tagsArray = Array.isArray(tags) ? tags : [tags];
    }

    // Ensure category is valid, default to 'Other' if not
    const validCategories = ['Aqeedah', 'Fiqh', 'Tafsir', 'Hadith', 'Seerah', 'Akhlaq', 'Other'];
    const validCategory = validCategories.includes(category) ? category : 'Other';

    // Handle visibility - checkbox sends 'on' when checked, undefined when not
    const isVisibleBool = isVisible === 'on' || isVisible === 'true' || isVisible === true;

    console.log(`[Series Edit] ID: ${req.params.id}, Category: ${category} -> ${validCategory}, isVisible: ${isVisibleBool}, Tags: ${JSON.stringify(tagsArray)}`);

    await Series.findByIdAndUpdate(req.params.id, {
      titleArabic,
      titleEnglish,
      category: validCategory,
      descriptionArabic,
      descriptionEnglish,
      tags: tagsArray,
      bookAuthor: bookAuthor || null,
      isVisible: isVisibleBool
    });

    res.redirect(`/admin/series/${req.params.id}/edit?success=updated`);
  } catch (error) {
    console.error('Update series error:', error);
    res.status(500).send('Error updating series');
  }
});

// @route   POST /admin/series/:id/reorder-lectures
// @desc    Reorder lectures in a series
// @access  Private (Admin only)
router.post('/series/:id/reorder-lectures', isAdmin, async (req, res) => {
  try {
    const { Lecture } = require('../../models');
    const mongoose = require('mongoose');
    const { lectureIds } = req.body;

    if (!lectureIds || !Array.isArray(lectureIds)) {
      return res.status(400).json({ error: 'Invalid lecture order data' });
    }

    const seriesObjectId = new mongoose.Types.ObjectId(req.params.id);

    // Update sortOrder for each lecture based on new order
    const updates = lectureIds.map((lectureId, index) =>
      Lecture.updateOne(
        { _id: new mongoose.Types.ObjectId(lectureId), seriesId: seriesObjectId },
        { $set: { sortOrder: index } }
      )
    );

    const results = await Promise.all(updates);

    // Log how many were actually updated
    const updatedCount = results.reduce((sum, r) => sum + r.modifiedCount, 0);
    console.log(`Reorder: Updated ${updatedCount} of ${lectureIds.length} lectures for series ${req.params.id}`);

    res.json({ success: true, message: 'Lecture order updated successfully', updatedCount });
  } catch (error) {
    console.error('Reorder lectures error:', error);
    res.status(500).json({ error: 'Error reordering lectures' });
  }
});

// @route   GET /admin/series/:id/quick-add-lecture
// @desc    Quick add lecture form (minimal form)
// @access  Private (Admin only)
router.get('/series/:id/quick-add-lecture', isAdmin, async (req, res) => {
  try {
    const { Series, Lecture } = require('../../models');

    const series = await Series.findById(req.params.id)
      .populate('sheikhId', 'nameArabic nameEnglish')
      .lean();

    if (!series) {
      return res.status(404).send('Series not found');
    }

    // Get the highest lecture number in this series
    const lastLecture = await Lecture.findOne({ seriesId: series._id })
      .sort({ lectureNumber: -1 })
      .select('lectureNumber')
      .lean();

    const nextLectureNumber = (lastLecture?.lectureNumber || 0) + 1;

    // Get total lecture count for sortOrder
    const lectureCount = await Lecture.countDocuments({ seriesId: series._id });

    res.render('admin/quick-add-lecture', {
      title: 'إضافة درس سريع',
      user: req.user,
      series,
      nextLectureNumber,
      nextSortOrder: lectureCount,
      today: new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Quick add lecture page error:', error);
    res.status(500).send('Error loading quick add page');
  }
});

// @route   POST /admin/series/:id/quick-add-lecture
// @desc    Create lecture with minimal data
// @access  Private (Admin only)
router.post('/series/:id/quick-add-lecture', isAdmin, async (req, res) => {
  try {
    const { Series, Lecture } = require('../../models');
    const { generateSlug } = require('../../utils/slugify');

    const series = await Series.findById(req.params.id)
      .populate('sheikhId')
      .lean();

    if (!series) {
      return res.status(404).send('Series not found');
    }

    const { lectureNumber, dateRecorded, titleSuffix, notes } = req.body;

    // Build title: Series Title - الدرس X (or with suffix)
    let titleArabic = `${series.titleArabic} - الدرس ${lectureNumber}`;
    if (titleSuffix && titleSuffix.trim()) {
      titleArabic += ` - ${titleSuffix.trim()}`;
    }

    // Generate slug and ensure uniqueness
    let baseSlug = generateSlug(titleArabic);
    let slug = baseSlug;
    let suffix = 1;

    // Check for existing slug and append suffix if needed
    while (await Lecture.exists({ slug })) {
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }

    // Generate suggested audio filename (series-slug-lesson-N.m4a)
    const seriesSlug = generateSlug(series.titleArabic);
    const suggestedFilename = `${seriesSlug}-${lectureNumber}.m4a`;

    // Create the lecture with auto Hijri conversion
    const recordedDate = dateRecorded ? new Date(dateRecorded) : new Date();
    const hijriDate = convertToHijri(recordedDate);

    const lecture = new Lecture({
      titleArabic,
      titleEnglish: series.titleEnglish ? `${series.titleEnglish} - Lesson ${lectureNumber}` : '',
      seriesId: series._id,
      sheikhId: series.sheikhId._id,
      category: series.category || 'Other',
      lectureNumber: parseInt(lectureNumber),
      sortOrder: parseInt(req.body.sortOrder) || 0,
      dateRecorded: recordedDate,
      dateRecordedHijri: hijriDate,
      notes: notes || '',
      slug,
      // Store suggested filename in metadata for later audio upload
      metadata: { suggestedFilename },
      published: false // Default to unpublished until audio is added
    });

    await lecture.save();

    // Update series lecture count
    await Series.findByIdAndUpdate(series._id, { $inc: { lectureCount: 1 } });

    // Redirect back to series edit page with success message
    res.redirect(`/admin/series/${series._id}/edit?success=lecture_added&lectureId=${lecture._id}`);
  } catch (error) {
    console.error('Quick add lecture error:', error);
    res.redirect(`/admin/series/${req.params.id}/edit?error=add_failed`);
  }
});

// @route   GET /admin/lectures/:id/edit
// @desc    Edit lecture page
// @access  Private (Admin only)
router.get('/lectures/:id/edit', isAdmin, async (req, res) => {
  try {
    const { Lecture, Sheikh, Series } = require('../../models');

    const lecture = await Lecture.findById(req.params.id)
      .populate('sheikhId', 'nameArabic nameEnglish')
      .populate('seriesId', 'titleArabic titleEnglish')
      .lean();

    if (!lecture) {
      return res.status(404).send('Lecture not found');
    }

    const sheikhs = await Sheikh.find().sort({ nameArabic: 1 }).lean();
    const series = await Series.find().sort({ titleArabic: 1 }).lean();

    res.render('admin/edit-lecture', {
      title: 'Edit Lecture',
      user: req.user,
      lecture,
      sheikhs,
      series,
      success: req.query.success
    });
  } catch (error) {
    console.error('Edit lecture error:', error);
    res.status(500).send('Error loading edit lecture page');
  }
});

// @route   POST /admin/lectures/:id/edit
// @desc    Update lecture
// @access  Private (Admin only)
router.post('/lectures/:id/edit', isAdmin, async (req, res) => {
  try {
    const { Lecture } = require('../../models');
    const {
      titleArabic,
      titleEnglish,
      descriptionArabic,
      descriptionEnglish,
      lectureNumber,
      category,
      seriesId,
      published,
      featured,
      location,
      dateRecorded,
      tags
    } = req.body;

    // Handle tags - can be a string (single tag) or array (multiple tags)
    let tagsArray = [];
    if (tags) {
      tagsArray = Array.isArray(tags) ? tags : [tags];
    }

    // Auto-convert Gregorian to Hijri
    const recordedDate = dateRecorded ? new Date(dateRecorded) : null;
    const hijriDate = recordedDate ? convertToHijri(recordedDate) : null;

    await Lecture.findByIdAndUpdate(req.params.id, {
      titleArabic,
      titleEnglish,
      descriptionArabic,
      descriptionEnglish,
      lectureNumber: lectureNumber ? parseInt(lectureNumber) : null,
      category,
      seriesId: seriesId || null,
      published: published === 'true',
      featured: featured === 'true',
      location: location || 'غير محدد',
      dateRecorded: recordedDate,
      dateRecordedHijri: hijriDate,
      tags: tagsArray
    });

    res.redirect('/admin/manage?success=lecture-updated');
  } catch (error) {
    console.error('Update lecture error:', error);
    res.status(500).send('Error updating lecture');
  }
});

// @route   POST /admin/lectures/:id/upload-audio
// @desc    Upload audio file to OCI and link to lecture
// @access  Private (Admin only)
router.post('/lectures/:id/upload-audio', isAdmin, async (req, res) => {
  const { upload } = require('../../config/storage');
  const { uploadToOCI } = require('../../utils/ociStorage');
  const { Lecture } = require('../../models');
  const fs = require('fs');
  const path = require('path');

  // Use multer middleware
  upload.single('audioFile')(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).send(`خطأ في الرفع: ${err.message}`);
    }

    if (!req.file) {
      return res.status(400).send('لم يتم اختيار ملف');
    }

    try {
      const lecture = await Lecture.findById(req.params.id);
      if (!lecture) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(404).send('المحاضرة غير موجودة');
      }

      // Generate OCI object name from lecture slug or title
      const ext = path.extname(req.file.originalname).toLowerCase();
      const objectName = lecture.slug
        ? `${lecture.slug}${ext}`
        : `lecture-${lecture._id}${ext}`;

      console.log(`[Audio Upload] Uploading ${req.file.originalname} as ${objectName}`);

      // Upload to OCI
      const result = await uploadToOCI(req.file.path, objectName);

      // Update lecture with audio URL
      lecture.audioUrl = result.url;
      lecture.audioFileName = objectName;
      lecture.fileSize = result.size;
      await lecture.save();

      console.log(`[Audio Upload] Success: ${objectName} -> ${result.url}`);

      // Clean up local temp file
      fs.unlinkSync(req.file.path);

      // Redirect back to edit page with success
      res.redirect(`/admin/lectures/${lecture._id}/edit?success=audio-uploaded`);
    } catch (error) {
      console.error('OCI upload error:', error);

      // Clean up local temp file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).send(`خطأ في الرفع إلى السحابة: ${error.message}`);
    }
  });
});

// @route   POST /admin/api/lectures/:id/upload-audio
// @desc    AJAX upload audio file to OCI with JSON response
// @access  Private (Admin only)
router.post('/api/lectures/:id/upload-audio', isAdmin, async (req, res) => {
  const { upload } = require('../../config/storage');
  const { uploadToOCI, objectExists } = require('../../utils/ociStorage');
  const { Lecture } = require('../../models');
  const fs = require('fs');
  const path = require('path');

  // Use multer middleware
  upload.single('audioFile')(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({
        success: false,
        error: `خطأ في الرفع: ${err.message}`
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'لم يتم اختيار ملف'
      });
    }

    try {
      const lecture = await Lecture.findById(req.params.id);
      if (!lecture) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({
          success: false,
          error: 'المحاضرة غير موجودة'
        });
      }

      // Generate OCI object name from lecture slug or title
      const ext = path.extname(req.file.originalname).toLowerCase();
      const objectName = lecture.slug
        ? `${lecture.slug}${ext}`
        : `lecture-${lecture._id}${ext}`;

      console.log(`[Audio Upload API] Uploading ${req.file.originalname} as ${objectName}`);

      // Upload to OCI
      const result = await uploadToOCI(req.file.path, objectName);

      // Verify upload succeeded by checking object exists
      const verified = await objectExists(objectName);
      if (!verified) {
        throw new Error('فشل التحقق من الملف في السحابة');
      }

      // Update lecture with audio URL
      lecture.audioUrl = result.url;
      lecture.audioFileName = objectName;
      lecture.fileSize = result.size;
      lecture.durationVerified = false; // Reset verification for new file
      await lecture.save();

      console.log(`[Audio Upload API] Success: ${objectName} -> ${result.url}`);

      // Clean up local temp file
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        audioUrl: result.url,
        audioFileName: objectName,
        fileSize: result.size,
        verified: true,
        message: 'تم رفع الملف بنجاح'
      });
    } catch (error) {
      console.error('OCI upload error:', error);

      // Clean up local temp file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        error: `خطأ في الرفع إلى السحابة: ${error.message}`
      });
    }
  });
});

// @route   POST /admin/lectures/:id/toggle-published
// @desc    Toggle lecture published status
// @access  Private (Admin only)
router.post('/lectures/:id/toggle-published', isAdmin, async (req, res) => {
  try {
    const { Lecture } = require('../../models');

    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    lecture.published = !lecture.published;
    await lecture.save();

    res.json({
      success: true,
      published: lecture.published
    });
  } catch (error) {
    console.error('Toggle published error:', error);
    res.status(500).json({ success: false, message: 'Error toggling published status' });
  }
});

// @route   POST /admin/lectures/:id/remove-from-series
// @desc    Remove lecture from series (doesn't delete the lecture)
// @access  Private (Admin only)
router.post('/lectures/:id/remove-from-series', isAdmin, async (req, res) => {
  try {
    const { Lecture, Series } = require('../../models');

    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) {
      return res.status(404).json({ success: false, error: 'Lecture not found' });
    }

    const previousSeriesId = lecture.seriesId;

    // Remove from series
    lecture.seriesId = null;
    await lecture.save();

    // Decrement lecture count on the previous series
    if (previousSeriesId) {
      await Series.findByIdAndUpdate(previousSeriesId, {
        $inc: { lectureCount: -1 }
      });
    }

    console.log(`[Remove from Series] Lecture ${lecture._id} removed from series ${previousSeriesId}`);

    res.json({ success: true });
  } catch (error) {
    console.error('Remove from series error:', error);
    res.status(500).json({ success: false, error: 'Error removing lecture from series' });
  }
});

// @route   GET /admin/api/unassociated-lectures
// @desc    Get lectures not associated with any series
// @access  Private (Admin only)
router.get('/api/unassociated-lectures', isAdmin, async (req, res) => {
  try {
    const { Lecture } = require('../../models');

    const lectures = await Lecture.find({ seriesId: null })
      .select('_id titleArabic titleEnglish slug audioFileName duration lectureNumber createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: lectures.length,
      lectures
    });
  } catch (error) {
    console.error('Get unassociated lectures error:', error);
    res.status(500).json({ success: false, error: 'Error fetching unassociated lectures' });
  }
});

// @route   POST /admin/api/series/create
// @desc    Create a new series (quick create from unassociated lectures)
// @access  Private (Admin only)
router.post('/api/series/create', isAdmin, async (req, res) => {
  try {
    const { Series, Sheikh } = require('../../models');
    const { generateSlug } = require('../../utils/slugify');

    const { titleArabic, titleEnglish, sheikhId, category, tags } = req.body;

    if (!titleArabic || !sheikhId) {
      return res.status(400).json({
        success: false,
        error: 'Title (Arabic) and Sheikh are required'
      });
    }

    // Verify sheikh exists
    const sheikh = await Sheikh.findById(sheikhId);
    if (!sheikh) {
      return res.status(404).json({ success: false, error: 'Sheikh not found' });
    }

    // Generate slug
    let baseSlug = generateSlug(titleArabic);
    let slug = baseSlug;
    let suffix = 1;
    while (await Series.exists({ slug })) {
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }

    // Create series
    const series = new Series({
      titleArabic,
      titleEnglish: titleEnglish || '',
      sheikhId: sheikh._id,
      category: category || 'Other',
      tags: tags || [],
      slug,
      lectureCount: 0
    });

    await series.save();

    console.log(`[Create Series] New series created: ${series._id} - ${titleArabic}`);

    res.json({
      success: true,
      series: {
        _id: series._id,
        titleArabic: series.titleArabic,
        titleEnglish: series.titleEnglish,
        slug: series.slug,
        category: series.category
      }
    });
  } catch (error) {
    console.error('Create series error:', error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'A series with this title already exists for this sheikh'
      });
    }

    res.status(500).json({ success: false, error: 'Error creating series' });
  }
});

// @route   GET /admin/api/sheikhs
// @desc    Get all sheikhs for dropdown
// @access  Private (Admin only)
router.get('/api/sheikhs', isAdmin, async (req, res) => {
  try {
    const { Sheikh } = require('../../models');

    const sheikhs = await Sheikh.find()
      .select('_id nameArabic nameEnglish')
      .sort({ nameArabic: 1 })
      .lean();

    res.json({ success: true, sheikhs });
  } catch (error) {
    console.error('Get sheikhs error:', error);
    res.status(500).json({ success: false, error: 'Error fetching sheikhs' });
  }
});

// @route   POST /admin/lectures/:id/assign-to-series
// @desc    Assign a lecture to a series
// @access  Private (Admin only)
router.post('/lectures/:id/assign-to-series', isAdmin, async (req, res) => {
  try {
    const { Lecture, Series } = require('../../models');
    const { generateSlug } = require('../../utils/slugify');

    const { seriesId, lectureNumber } = req.body;

    if (!seriesId) {
      return res.status(400).json({ success: false, error: 'Series ID is required' });
    }

    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) {
      return res.status(404).json({ success: false, error: 'Lecture not found' });
    }

    const series = await Series.findById(seriesId);
    if (!series) {
      return res.status(404).json({ success: false, error: 'Series not found' });
    }

    // Store previous series ID if any
    const previousSeriesId = lecture.seriesId;

    // Update lecture
    lecture.seriesId = series._id;
    lecture.sheikhId = series.sheikhId;
    lecture.category = series.category;

    if (lectureNumber) {
      lecture.lectureNumber = parseInt(lectureNumber);
    }

    // Regenerate slug to include series name
    const baseSlug = generateSlug(`${series.titleArabic}-الدرس-${lecture.lectureNumber || 'x'}`);
    let slug = baseSlug;
    let suffix = 1;
    while (await Lecture.exists({ slug, _id: { $ne: lecture._id } })) {
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }
    lecture.slug = slug;

    await lecture.save();

    // Update lecture counts
    if (previousSeriesId) {
      await Series.findByIdAndUpdate(previousSeriesId, { $inc: { lectureCount: -1 } });
    }
    await Series.findByIdAndUpdate(series._id, { $inc: { lectureCount: 1 } });

    console.log(`[Assign to Series] Lecture ${lecture._id} assigned to series ${series._id}`);

    res.json({
      success: true,
      lecture: {
        _id: lecture._id,
        titleArabic: lecture.titleArabic,
        slug: lecture.slug,
        seriesId: lecture.seriesId
      }
    });
  } catch (error) {
    console.error('Assign to series error:', error);
    res.status(500).json({ success: false, error: 'Error assigning lecture to series' });
  }
});

// @route   GET /admin/sheikhs
// @desc    Manage sheikhs page
// @access  Private (Admin only)
router.get('/sheikhs', isAdmin, async (req, res) => {
  try {
    const { Sheikh, Lecture } = require('../../models');

    const sheikhs = await Sheikh.find()
      .sort({ nameArabic: 1 })
      .lean();

    // Get lecture count for each sheikh
    for (const sheikh of sheikhs) {
      sheikh.actualLectureCount = await Lecture.countDocuments({
        sheikhId: sheikh._id,
        published: true
      });
    }

    res.render('admin/sheikhs', {
      title: 'Manage Sheikhs',
      user: req.user,
      sheikhs
    });
  } catch (error) {
    console.error('Sheikhs page error:', error);
    res.status(500).send('Error loading sheikhs page');
  }
});

// @route   GET /admin/sheikhs/new
// @desc    Add new sheikh page
// @access  Private (Admin only)
router.get('/sheikhs/new', isAdmin, (req, res) => {
  res.render('admin/sheikh-form', {
    title: 'Add New Sheikh',
    user: req.user,
    sheikh: null,
    isEdit: false
  });
});

// @route   POST /admin/sheikhs
// @desc    Create new sheikh
// @access  Private (Admin only)
router.post('/sheikhs', isAdmin, async (req, res) => {
  try {
    const { Sheikh } = require('../../models');
    const {
      nameArabic,
      nameEnglish,
      honorific,
      bioArabic,
      bioEnglish,
      photoUrl
    } = req.body;

    const sheikh = new Sheikh({
      nameArabic,
      nameEnglish,
      honorific: honorific || 'حفظه الله',
      bioArabic,
      bioEnglish,
      photoUrl
    });

    await sheikh.save();

    res.redirect('/admin/sheikhs?success=sheikh-created');
  } catch (error) {
    console.error('Create sheikh error:', error);
    res.status(500).send('Error creating sheikh');
  }
});

// @route   GET /admin/sheikhs/:id/edit
// @desc    Edit sheikh page
// @access  Private (Admin only)
router.get('/sheikhs/:id/edit', isAdmin, async (req, res) => {
  try {
    const { Sheikh } = require('../../models');

    const sheikh = await Sheikh.findById(req.params.id).lean();

    if (!sheikh) {
      return res.status(404).send('Sheikh not found');
    }

    res.render('admin/sheikh-form', {
      title: 'Edit Sheikh',
      user: req.user,
      sheikh,
      isEdit: true
    });
  } catch (error) {
    console.error('Edit sheikh error:', error);
    res.status(500).send('Error loading edit sheikh page');
  }
});

// @route   POST /admin/sheikhs/:id/edit
// @desc    Update sheikh
// @access  Private (Admin only)
router.post('/sheikhs/:id/edit', isAdmin, async (req, res) => {
  try {
    const { Sheikh } = require('../../models');
    const {
      nameArabic,
      nameEnglish,
      honorific,
      bioArabic,
      bioEnglish,
      photoUrl
    } = req.body;

    await Sheikh.findByIdAndUpdate(req.params.id, {
      nameArabic,
      nameEnglish,
      honorific: honorific || 'حفظه الله',
      bioArabic,
      bioEnglish,
      photoUrl
    });

    res.redirect('/admin/sheikhs?success=sheikh-updated');
  } catch (error) {
    console.error('Update sheikh error:', error);
    res.status(500).send('Error updating sheikh');
  }
});

// @route   POST /admin/sheikhs/:id/delete
// @desc    Delete sheikh
// @access  Private (Admin only)
router.post('/sheikhs/:id/delete', isAdmin, async (req, res) => {
  try {
    const { Sheikh, Lecture, Series } = require('../../models');

    // Check if sheikh has any lectures or series
    const lectureCount = await Lecture.countDocuments({ sheikhId: req.params.id });
    const seriesCount = await Series.countDocuments({ sheikhId: req.params.id });

    if (lectureCount > 0 || seriesCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete sheikh. ${lectureCount} lectures and ${seriesCount} series are associated with this sheikh.`
      });
    }

    await Sheikh.findByIdAndDelete(req.params.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete sheikh error:', error);
    res.status(500).json({ success: false, message: 'Error deleting sheikh' });
  }
});

// ========================================
// USER MANAGEMENT ROUTES (Super Admin Only)
// ========================================

// @route   GET /admin/users
// @desc    Manage admins and editors
// @access  Private (Super Admin only)
router.get('/users', isSuperAdmin, async (req, res) => {
  try {
    const { Admin } = require('../../models');

    const users = await Admin.find()
      .sort({ createdAt: -1 })
      .lean();

    res.render('admin/users', {
      title: 'Manage Users',
      user: req.user,
      users
    });
  } catch (error) {
    console.error('Users page error:', error);
    res.status(500).send('Error loading users page');
  }
});

// @route   POST /admin/users/add
// @desc    Add a new editor/admin user
// @access  Private (Super Admin only)
router.post('/users/add', isSuperAdmin, async (req, res) => {
  try {
    const { Admin } = require('../../models');
    const { email, displayName, role } = req.body;

    // Validate input
    if (!email || !displayName) {
      return res.status(400).json({
        success: false,
        message: 'Email and display name are required'
      });
    }

    if (role !== 'admin' && role !== 'editor') {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    // Check if user already exists
    const existingUser = await Admin.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    // Create new user
    const newUser = new Admin({
      email,
      displayName,
      username: email.split('@')[0], // Use email prefix as username
      role,
      isActive: true,
      googleId: null, // Will be set when they login with Google OAuth
      profilePhoto: null
    });

    await newUser.save();

    res.json({
      success: true,
      message: 'User added successfully'
    });
  } catch (error) {
    console.error('Add user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding user: ' + error.message
    });
  }
});

// @route   POST /admin/users/:id/role
// @desc    Update user role
// @access  Private (Super Admin only)
router.post('/users/:id/role', isSuperAdmin, async (req, res) => {
  try {
    const { Admin } = require('../../models');
    const { role } = req.body;

    // Prevent changing own role
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }

    if (role !== 'admin' && role !== 'editor') {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    await Admin.findByIdAndUpdate(req.params.id, { role });

    res.json({ success: true });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ success: false, message: 'Error updating role' });
  }
});

// @route   POST /admin/users/:id/toggle-active
// @desc    Toggle user active status
// @access  Private (Super Admin only)
router.post('/users/:id/toggle-active', isSuperAdmin, async (req, res) => {
  try {
    const { Admin } = require('../../models');

    // Prevent deactivating own account
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    const user = await Admin.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      isActive: user.isActive
    });
  } catch (error) {
    console.error('Toggle active error:', error);
    res.status(500).json({ success: false, message: 'Error toggling active status' });
  }
});

// ==========================================
// Schedule Management Routes
// ==========================================

// @route   GET /admin/schedule
// @desc    List all schedule items
// @access  Private (Admin only)
router.get('/schedule', isAdmin, async (req, res) => {
  try {
    const { Schedule, Series } = require('../../models');

    const scheduleItems = await Schedule.find()
      .populate('seriesId', 'titleArabic titleEnglish')
      .sort({ sortOrder: 1 })
      .lean();

    // Sort by day order
    const dayOrder = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    scheduleItems.sort((a, b) => dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek));

    res.render('admin/schedule', {
      title: 'Weekly Schedule',
      user: req.user,
      scheduleItems
    });
  } catch (error) {
    console.error('Schedule list error:', error);
    res.status(500).send('Error loading schedule');
  }
});

// @route   GET /admin/schedule/add
// @desc    Add new schedule item form
// @access  Private (Admin only)
router.get('/schedule/add', isAdmin, async (req, res) => {
  try {
    const { Series } = require('../../models');

    const seriesList = await Series.find()
      .sort({ titleArabic: 1 })
      .lean();

    res.render('admin/schedule-edit', {
      title: 'Add Schedule Item',
      user: req.user,
      scheduleItem: null,
      seriesList,
      isEdit: false
    });
  } catch (error) {
    console.error('Schedule add form error:', error);
    res.status(500).send('Error loading form');
  }
});

// @route   POST /admin/schedule/add
// @desc    Create new schedule item
// @access  Private (Admin only)
router.post('/schedule/add', isAdmin, async (req, res) => {
  try {
    const { Schedule } = require('../../models');

    const {
      dayOfWeek,
      dayOfWeekEnglish,
      time,
      timeEnglish,
      seriesId,
      location,
      locationEnglish,
      isActive,
      sortOrder,
      notes
    } = req.body;

    const scheduleItem = new Schedule({
      dayOfWeek,
      dayOfWeekEnglish: dayOfWeekEnglish || undefined,
      time,
      timeEnglish: timeEnglish || undefined,
      seriesId,
      location: location || 'جامع الورود',
      locationEnglish: locationEnglish || 'Masjid Al-Wurud',
      isActive: isActive === 'on' || isActive === true,
      sortOrder: parseInt(sortOrder) || 0,
      notes: notes || undefined
    });

    await scheduleItem.save();

    res.redirect('/admin/schedule?success=created');
  } catch (error) {
    console.error('Schedule create error:', error);
    res.redirect('/admin/schedule?error=create_failed');
  }
});

// @route   GET /admin/schedule/:id/edit
// @desc    Edit schedule item form
// @access  Private (Admin only)
router.get('/schedule/:id/edit', isAdmin, async (req, res) => {
  try {
    const { Schedule, Series } = require('../../models');

    const scheduleItem = await Schedule.findById(req.params.id).lean();
    if (!scheduleItem) {
      return res.redirect('/admin/schedule?error=not_found');
    }

    const seriesList = await Series.find()
      .sort({ titleArabic: 1 })
      .lean();

    res.render('admin/schedule-edit', {
      title: 'Edit Schedule Item',
      user: req.user,
      scheduleItem,
      seriesList,
      isEdit: true
    });
  } catch (error) {
    console.error('Schedule edit form error:', error);
    res.status(500).send('Error loading form');
  }
});

// @route   POST /admin/schedule/:id/edit
// @desc    Update schedule item
// @access  Private (Admin only)
router.post('/schedule/:id/edit', isAdmin, async (req, res) => {
  try {
    const { Schedule } = require('../../models');

    const {
      dayOfWeek,
      dayOfWeekEnglish,
      time,
      timeEnglish,
      seriesId,
      location,
      locationEnglish,
      isActive,
      sortOrder,
      notes
    } = req.body;

    await Schedule.findByIdAndUpdate(req.params.id, {
      dayOfWeek,
      dayOfWeekEnglish: dayOfWeekEnglish || undefined,
      time,
      timeEnglish: timeEnglish || undefined,
      seriesId,
      location: location || 'جامع الورود',
      locationEnglish: locationEnglish || 'Masjid Al-Wurud',
      isActive: isActive === 'on' || isActive === true,
      sortOrder: parseInt(sortOrder) || 0,
      notes: notes || undefined
    });

    res.redirect('/admin/schedule?success=updated');
  } catch (error) {
    console.error('Schedule update error:', error);
    res.redirect('/admin/schedule?error=update_failed');
  }
});

// @route   POST /admin/schedule/:id/delete
// @desc    Delete schedule item
// @access  Private (Admin only)
router.post('/schedule/:id/delete', isAdmin, async (req, res) => {
  try {
    const { Schedule } = require('../../models');

    await Schedule.findByIdAndDelete(req.params.id);

    res.redirect('/admin/schedule?success=deleted');
  } catch (error) {
    console.error('Schedule delete error:', error);
    res.redirect('/admin/schedule?error=delete_failed');
  }
});

// ============================================
// Analytics Routes
// ============================================

// @route   GET /admin/analytics
// @desc    Analytics dashboard
// @access  Private (Admin only)
router.get('/analytics', isAdmin, async (req, res) => {
  try {
    const { getAnalyticsSummary, getTopLectures, getTopDownloads } = require('../../middleware/analytics');
    const { PageView, SiteSettings } = require('../../models');

    const [summary, topLectures, topDownloads, topPages, settings] = await Promise.all([
      getAnalyticsSummary(),
      getTopLectures(10),
      getTopDownloads(10),
      PageView.getTopPages(10),
      SiteSettings.getSettings()
    ]);

    // Get last 30 days of page views for chart
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dailyViews = await PageView.getViewsInRange(thirtyDaysAgo, new Date());

    res.render('admin/analytics', {
      title: 'Analytics',
      user: req.user,
      summary,
      topLectures,
      topDownloads,
      topPages,
      dailyViews,
      settings: settings.analytics,
      shouldShowPublic: settings.shouldShowPublicStats()
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).send('Error loading analytics');
  }
});

// @route   POST /admin/analytics/settings
// @desc    Update analytics visibility settings
// @access  Private (Admin only)
router.post('/analytics/settings', isAdmin, async (req, res) => {
  try {
    const { SiteSettings } = require('../../models');

    const settings = await SiteSettings.getSettings();

    // Update settings
    settings.analytics.showPublicStats = req.body.showPublicStats === 'on';
    settings.analytics.minPlaysToDisplay = parseInt(req.body.minPlaysToDisplay) || 1000;
    settings.analytics.minDownloadsToDisplay = parseInt(req.body.minDownloadsToDisplay) || 500;
    settings.analytics.minPageViewsToDisplay = parseInt(req.body.minPageViewsToDisplay) || 5000;

    await settings.save();

    // Update cached stats
    await SiteSettings.updateCachedStats();

    res.redirect('/admin/analytics?success=settings_updated');
  } catch (error) {
    console.error('Analytics settings error:', error);
    res.redirect('/admin/analytics?error=settings_failed');
  }
});

// @route   POST /admin/analytics/refresh-stats
// @desc    Manually refresh cached statistics
// @access  Private (Admin only)
router.post('/analytics/refresh-stats', isAdmin, async (req, res) => {
  try {
    const { SiteSettings } = require('../../models');

    await SiteSettings.updateCachedStats();

    res.redirect('/admin/analytics?success=stats_refreshed');
  } catch (error) {
    console.error('Stats refresh error:', error);
    res.redirect('/admin/analytics?error=refresh_failed');
  }
});

module.exports = router;
