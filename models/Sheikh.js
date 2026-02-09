const mongoose = require('mongoose');

const sheikhSchema = new mongoose.Schema({
  nameArabic: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  nameEnglish: {
    type: String,
    trim: true,
    index: true
  },
  honorific: {
    type: String,
    default: 'حفظه الله',
    trim: true
  },
  bioArabic: {
    type: String,
    trim: true
  },
  bioEnglish: {
    type: String,
    trim: true
  },
  photoUrl: {
    type: String,
    trim: true
  },
  lectureCount: {
    type: Number,
    default: 0
  },
  slug: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for search
sheikhSchema.index({ nameArabic: 'text', nameEnglish: 'text' });

// Virtual for full Arabic name with honorific
sheikhSchema.virtual('fullNameArabic').get(function() {
  return this.honorific ? `${this.nameArabic} ${this.honorific}` : this.nameArabic;
});

// Ensure virtuals are included in JSON
sheikhSchema.set('toJSON', { virtuals: true });
sheikhSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Sheikh', sheikhSchema);
