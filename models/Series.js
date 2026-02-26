const mongoose = require('mongoose');

const seriesSchema = new mongoose.Schema({
  titleArabic: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  titleEnglish: {
    type: String,
    trim: true,
    index: true
  },
  descriptionArabic: {
    type: String,
    trim: true
  },
  descriptionEnglish: {
    type: String,
    trim: true
  },
  sheikhId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sheikh',
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ['Aqeedah', 'Fiqh', 'Tafsir', 'Hadith', 'Seerah', 'Akhlaq', 'Other'],
    default: 'Other',
    index: true
  },
  tags: {
    type: [String],
    default: [],
    index: true
  },
  bookTitle: {
    type: String,
    trim: true
  },
  bookAuthor: {
    type: String,
    trim: true
  },
  lectureCount: {
    type: Number,
    default: 0
  },
  thumbnailUrl: {
    type: String,
    trim: true
  },
  slug: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
    index: true
  },
  isVisible: {
    type: Boolean,
    default: true,
    index: true
  },
  // Section assignment for homepage organization
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
    default: null,
    index: true
  },
  // Order within the assigned section
  sectionOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index for sheikh + title (to prevent duplicates)
seriesSchema.index({ sheikhId: 1, titleArabic: 1 }, { unique: true });

// Text index for search
seriesSchema.index({ titleArabic: 'text', titleEnglish: 'text' });

module.exports = mongoose.model('Series', seriesSchema);
