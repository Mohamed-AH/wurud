/**
 * Arabic-friendly slug generation utility
 *
 * Creates URL-safe slugs that preserve Arabic characters.
 * Arabic characters are valid in URLs when properly encoded.
 */

/**
 * Generate a slug from Arabic or English text
 * @param {string} text - The text to slugify
 * @returns {string} - URL-safe slug
 */
function generateSlug(text) {
  if (!text) return '';

  return text
    .toString()
    .trim()
    // Normalize Unicode characters
    .normalize('NFKC')
    // Replace multiple spaces/underscores with single hyphen
    .replace(/[\s_]+/g, '-')
    // Remove characters that are problematic in URLs
    // Keep: Arabic letters, English letters, numbers, hyphens
    .replace(/[^\u0600-\u06FF\u0750-\u077Fa-zA-Z0-9-]/g, '')
    // Remove multiple consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Lowercase English characters (Arabic doesn't have case)
    .toLowerCase();
}

/**
 * Generate a unique slug by checking against existing slugs
 * @param {string} baseSlug - The base slug to make unique
 * @param {Function} checkExists - Async function that returns true if slug exists
 * @returns {Promise<string>} - Unique slug
 */
async function generateUniqueSlug(baseSlug, checkExists) {
  let slug = baseSlug;
  let counter = 1;

  while (await checkExists(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;

    // Safety limit to prevent infinite loops
    if (counter > 100) {
      // Append timestamp for guaranteed uniqueness
      slug = `${baseSlug}-${Date.now()}`;
      break;
    }
  }

  return slug;
}

/**
 * Generate slug for a Lecture
 * Format: series-name-lecture-number or just title if no series
 * @param {Object} lecture - Lecture document
 * @param {Object} series - Series document (optional)
 * @returns {string} - Generated slug
 */
function generateLectureSlug(lecture, series) {
  if (series && lecture.lectureNumber) {
    // Format: series-slug-الدرس-N
    const seriesSlug = generateSlug(series.titleArabic);
    return `${seriesSlug}-الدرس-${lecture.lectureNumber}`;
  }

  // Fallback to lecture title
  return generateSlug(lecture.titleArabic);
}

/**
 * Generate slug for a Series
 * @param {Object} series - Series document
 * @returns {string} - Generated slug
 */
function generateSeriesSlug(series) {
  return generateSlug(series.titleArabic);
}

/**
 * Generate slug for a Sheikh
 * @param {Object} sheikh - Sheikh document
 * @returns {string} - Generated slug
 */
function generateSheikhSlug(sheikh) {
  // Remove honorifics for cleaner URLs
  const name = sheikh.nameArabic
    .replace(/الشيخ\s*/g, '')
    .replace(/حفظه الله/g, '')
    .replace(/رحمه الله/g, '')
    .trim();

  return generateSlug(name);
}

module.exports = {
  generateSlug,
  generateUniqueSlug,
  generateLectureSlug,
  generateSeriesSlug,
  generateSheikhSlug
};
