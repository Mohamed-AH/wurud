const express = require('express');
const router = express.Router();
const { isAdmin, isEditor, isSuperAdmin } = require('../../middleware/auth');

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
          effectiveSortOrder: 0
        }
      }
    ]);

    res.render('admin/edit-series', {
      title: 'Edit Series',
      user: req.user,
      series,
      sheikhs,
      lectures
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
    const { titleArabic, titleEnglish, category, descriptionArabic, descriptionEnglish, tags } = req.body;

    // Handle tags - can be a string (single tag) or array (multiple tags)
    let tagsArray = [];
    if (tags) {
      tagsArray = Array.isArray(tags) ? tags : [tags];
    }

    await Series.findByIdAndUpdate(req.params.id, {
      titleArabic,
      titleEnglish,
      category,
      descriptionArabic,
      descriptionEnglish,
      tags: tagsArray
    });

    res.redirect('/admin/manage?success=series-updated');
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
    const { lectureIds } = req.body;

    if (!lectureIds || !Array.isArray(lectureIds)) {
      return res.status(400).json({ error: 'Invalid lecture order data' });
    }

    // Update sortOrder for each lecture based on new order
    const updates = lectureIds.map((lectureId, index) =>
      Lecture.updateOne(
        { _id: lectureId, seriesId: req.params.id },
        { $set: { sortOrder: index } }
      )
    );

    await Promise.all(updates);

    res.json({ success: true, message: 'Lecture order updated successfully' });
  } catch (error) {
    console.error('Reorder lectures error:', error);
    res.status(500).json({ error: 'Error reordering lectures' });
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
      series
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
      tags
    } = req.body;

    // Handle tags - can be a string (single tag) or array (multiple tags)
    let tagsArray = [];
    if (tags) {
      tagsArray = Array.isArray(tags) ? tags : [tags];
    }

    await Lecture.findByIdAndUpdate(req.params.id, {
      titleArabic,
      titleEnglish,
      descriptionArabic,
      descriptionEnglish,
      lectureNumber: lectureNumber ? parseInt(lectureNumber) : null,
      category,
      seriesId: seriesId || null,
      published: published === 'true',
      tags: tagsArray
    });

    res.redirect('/admin/manage?success=lecture-updated');
  } catch (error) {
    console.error('Update lecture error:', error);
    res.status(500).send('Error updating lecture');
  }
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

module.exports = router;
