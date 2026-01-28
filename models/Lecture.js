const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema({
  audioFileName: {
    type: String,
    trim: true
    // Note: Uniqueness enforced by application logic during upload
    // Multiple null values allowed for lectures without audio files
  },
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
  seriesId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Series',
    index: true
  },
  lectureNumber: {
    type: Number,
    min: 1,
    index: true
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  fileSize: {
    type: Number, // in bytes
    default: 0
  },
  location: {
    type: String,
    trim: true,
    default: 'غير محدد'
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
  dateRecorded: {
    type: Date,
    index: true
  },
  dateRecordedHijri: {
    type: String,
    trim: true
  },
  published: {
    type: Boolean,
    default: false,
    index: true
  },
  featured: {
    type: Boolean,
    default: false,
    index: true
  },
  playCount: {
    type: Number,
    default: 0,
    min: 0
  },
  downloadCount: {
    type: Number,
    default: 0,
    min: 0
  },
  metadata: {
    type: Object,
    default: {}
    // Stores Excel import data for matching files later:
    // { excelFilename: String, type: String, serial: String }
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
lectureSchema.index({ published: 1, createdAt: -1 });
lectureSchema.index({ sheikhId: 1, seriesId: 1, lectureNumber: 1 });
lectureSchema.index({ featured: 1, published: 1 });

// Text index for search
lectureSchema.index({
  titleArabic: 'text',
  titleEnglish: 'text',
  descriptionArabic: 'text',
  descriptionEnglish: 'text'
});

// Virtual for duration in formatted string (HH:MM:SS)
lectureSchema.virtual('durationFormatted').get(function() {
  const hours = Math.floor(this.duration / 3600);
  const minutes = Math.floor((this.duration % 3600) / 60);
  const seconds = this.duration % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Virtual for file size in MB
lectureSchema.virtual('fileSizeMB').get(function() {
  return (this.fileSize / (1024 * 1024)).toFixed(2);
});

// Method to increment play count
lectureSchema.methods.incrementPlayCount = async function() {
  this.playCount += 1;
  return this.save();
};

// Method to increment download count
lectureSchema.methods.incrementDownloadCount = async function() {
  this.downloadCount += 1;
  return this.save();
};

// Ensure virtuals are included in JSON
lectureSchema.set('toJSON', { virtuals: true });
lectureSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Lecture', lectureSchema);
