const mongoose = require('mongoose');

/**
 * Site Settings Schema
 * Stores global settings for the site including analytics visibility
 */
const siteSettingsSchema = new mongoose.Schema({
  // Singleton identifier - only one document should exist
  key: {
    type: String,
    default: 'global',
    unique: true,
    immutable: true
  },

  // Analytics visibility settings
  analytics: {
    // Whether to show stats publicly on the site
    showPublicStats: {
      type: Boolean,
      default: false
    },
    // Minimum total plays before showing stats publicly
    minPlaysToDisplay: {
      type: Number,
      default: 1000
    },
    // Minimum total downloads before showing stats publicly
    minDownloadsToDisplay: {
      type: Number,
      default: 500
    },
    // Minimum page views before showing stats publicly
    minPageViewsToDisplay: {
      type: Number,
      default: 5000
    }
  },

  // Homepage configuration
  homepage: {
    showSchedule: {
      type: Boolean,
      default: true
    },
    showSeriesTab: {
      type: Boolean,
      default: true
    },
    showStandaloneTab: {
      type: Boolean,
      default: true
    },
    showKhutbasTab: {
      type: Boolean,
      default: true
    }
  },

  // Cached aggregate stats (updated periodically)
  cachedStats: {
    totalPlays: {
      type: Number,
      default: 0
    },
    totalDownloads: {
      type: Number,
      default: 0
    },
    totalPageViews: {
      type: Number,
      default: 0
    },
    totalLectures: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

/**
 * Get or create the singleton settings document (atomic operation)
 */
siteSettingsSchema.statics.getSettings = async function() {
  // Use findOneAndUpdate with upsert to avoid race conditions
  const settings = await this.findOneAndUpdate(
    { key: 'global' },
    { $setOnInsert: { key: 'global' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return settings;
};

/**
 * Update cached stats from database
 */
siteSettingsSchema.statics.updateCachedStats = async function() {
  const Lecture = require('./Lecture');
  const PageView = require('./PageView');

  const [playStats, pageViewStats, lectureCount] = await Promise.all([
    Lecture.aggregate([
      { $match: { published: true } },
      {
        $group: {
          _id: null,
          totalPlays: { $sum: '$playCount' },
          totalDownloads: { $sum: '$downloadCount' }
        }
      }
    ]),
    PageView.aggregate([
      { $group: { _id: null, totalViews: { $sum: '$count' } } }
    ]),
    Lecture.countDocuments({ published: true })
  ]);

  const stats = {
    totalPlays: playStats[0]?.totalPlays || 0,
    totalDownloads: playStats[0]?.totalDownloads || 0,
    totalPageViews: pageViewStats[0]?.totalViews || 0,
    totalLectures: lectureCount,
    lastUpdated: new Date()
  };

  await this.findOneAndUpdate(
    { key: 'global' },
    { $set: { cachedStats: stats } },
    { upsert: true }
  );

  return stats;
};

/**
 * Check if stats should be shown publicly based on thresholds
 */
siteSettingsSchema.methods.shouldShowPublicStats = function() {
  if (this.analytics.showPublicStats) {
    return true; // Manual override
  }

  // Check if all thresholds are met
  const stats = this.cachedStats;
  return (
    stats.totalPlays >= this.analytics.minPlaysToDisplay &&
    stats.totalDownloads >= this.analytics.minDownloadsToDisplay &&
    stats.totalPageViews >= this.analytics.minPageViewsToDisplay
  );
};

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
