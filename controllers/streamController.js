const fs = require('fs');
const path = require('path');
const { Lecture } = require('../models');
const { getFilePath, fileExists } = require('../utils/fileManager');
const { getMimeType, handleRangeRequest } = require('../middleware/streamHandler');

/**
 * Stream audio file with Range request support
 * @route GET /stream/:id
 */
const streamAudio = async (req, res) => {
  try {
    const lectureId = req.params.id;

    // Find lecture
    const lecture = await Lecture.findById(lectureId);

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    // Check if file exists
    const filePath = getFilePath(lecture.audioFileName);

    if (!fileExists(lecture.audioFileName)) {
      console.error(`Audio file not found: ${lecture.audioFileName}`);
      return res.status(404).json({
        success: false,
        message: 'Audio file not found on server'
      });
    }

    // Get file stats
    const stat = fs.statSync(filePath);

    // Increment play count (async, don't wait)
    lecture.incrementPlayCount().catch(err => {
      console.error('Error incrementing play count:', err);
    });

    // Get MIME type
    const mimeType = getMimeType(lecture.audioFileName);

    // Set file info for stream handler
    req.filePath = filePath;
    req.fileStat = stat;
    req.mimeType = mimeType;

    // Set Content-Disposition header for inline playback
    res.set({
      'Content-Disposition': `inline; filename="${encodeURIComponent(lecture.titleEnglish || lecture.titleArabic)}.${path.extname(lecture.audioFileName)}"`,
      'X-Content-Type-Options': 'nosniff'
    });

    // Handle range request
    handleRangeRequest(req, res);

  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stream audio',
      error: error.message
    });
  }
};

/**
 * Download audio file
 * @route GET /download/:id
 */
const downloadAudio = async (req, res) => {
  try {
    const lectureId = req.params.id;

    // Find lecture
    const lecture = await Lecture.findById(lectureId)
      .populate('sheikhId', 'nameArabic nameEnglish')
      .populate('seriesId', 'titleArabic titleEnglish');

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    // Check if file exists
    const filePath = getFilePath(lecture.audioFileName);

    if (!fileExists(lecture.audioFileName)) {
      console.error(`Audio file not found: ${lecture.audioFileName}`);
      return res.status(404).json({
        success: false,
        message: 'Audio file not found on server'
      });
    }

    // Increment download count (async, don't wait)
    lecture.incrementDownloadCount().catch(err => {
      console.error('Error incrementing download count:', err);
    });

    // Create a meaningful filename for download
    const ext = path.extname(lecture.audioFileName);
    let downloadFilename = '';

    if (lecture.seriesId && lecture.lectureNumber) {
      // Series lecture: "SeriesTitle - Part X - LectureTitle.mp3"
      const seriesTitle = lecture.seriesId.titleEnglish || lecture.seriesId.titleArabic;
      const lectureTitle = lecture.titleEnglish || lecture.titleArabic;
      downloadFilename = `${seriesTitle} - Part ${lecture.lectureNumber} - ${lectureTitle}${ext}`;
    } else {
      // Standalone lecture: "SheikhName - LectureTitle.mp3"
      const sheikhName = lecture.sheikhId?.nameEnglish || lecture.sheikhId?.nameArabic || 'Unknown';
      const lectureTitle = lecture.titleEnglish || lecture.titleArabic;
      downloadFilename = `${sheikhName} - ${lectureTitle}${ext}`;
    }

    // Sanitize filename for download
    downloadFilename = downloadFilename
      .replace(/[<>:"/\\|?*]/g, '-') // Remove invalid chars
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();

    // Get MIME type
    const mimeType = getMimeType(lecture.audioFileName);

    // Set headers for download
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadFilename)}"`,
      'Content-Length': lecture.fileSize,
      'Cache-Control': 'public, max-age=31536000'
    });

    // Stream file to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
      console.error('Download stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Download failed'
        });
      }
    });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download audio',
      error: error.message
    });
  }
};

/**
 * Get streaming info (for testing/debugging)
 * @route GET /stream/:id/info
 */
const getStreamInfo = async (req, res) => {
  try {
    const lectureId = req.params.id;

    const lecture = await Lecture.findById(lectureId)
      .populate('sheikhId', 'nameArabic nameEnglish')
      .populate('seriesId', 'titleArabic titleEnglish')
      .lean();

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    const filePathExists = fileExists(lecture.audioFileName);
    const filePath = getFilePath(lecture.audioFileName);
    let fileStats = null;

    if (filePathExists) {
      fileStats = fs.statSync(filePath);
    }

    res.json({
      success: true,
      lecture: {
        id: lecture._id,
        titleArabic: lecture.titleArabic,
        titleEnglish: lecture.titleEnglish,
        sheikh: lecture.sheikhId?.nameArabic || 'Unknown',
        series: lecture.seriesId?.titleArabic || null,
        duration: lecture.durationFormatted,
        fileSize: lecture.fileSizeMB + ' MB',
        playCount: lecture.playCount,
        downloadCount: lecture.downloadCount
      },
      file: {
        fileName: lecture.audioFileName,
        exists: filePathExists,
        size: fileStats ? fileStats.size : null,
        mimeType: getMimeType(lecture.audioFileName)
      },
      urls: {
        stream: `/stream/${lectureId}`,
        download: `/download/${lectureId}`
      }
    });

  } catch (error) {
    console.error('Stream info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get stream info',
      error: error.message
    });
  }
};

module.exports = {
  streamAudio,
  downloadAudio,
  getStreamInfo
};
