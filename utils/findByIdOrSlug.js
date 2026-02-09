/**
 * Utility to find documents by MongoDB ObjectId or slug
 */

const mongoose = require('mongoose');

/**
 * Check if a string is a valid MongoDB ObjectId
 * @param {string} str - String to check
 * @returns {boolean}
 */
function isValidObjectId(str) {
  return mongoose.Types.ObjectId.isValid(str) &&
    String(new mongoose.Types.ObjectId(str)) === str;
}

/**
 * Find a document by ID or slug
 * @param {Model} Model - Mongoose model
 * @param {string} idOrSlug - ObjectId or slug string
 * @param {Object} populate - Optional populate options
 * @returns {Promise<Document|null>}
 */
async function findByIdOrSlug(Model, idOrSlug, populate = null) {
  let query;

  if (isValidObjectId(idOrSlug)) {
    // It's a valid ObjectId, search by _id first, then by slug
    query = Model.findOne({
      $or: [
        { _id: idOrSlug },
        { slug: idOrSlug }
      ]
    });
  } else {
    // Not a valid ObjectId, must be a slug
    query = Model.findOne({ slug: idOrSlug });
  }

  if (populate) {
    query = query.populate(populate);
  }

  return query.lean();
}

/**
 * Find a document and check if we should redirect to canonical slug URL
 * @param {Model} Model - Mongoose model
 * @param {string} idOrSlug - ObjectId or slug string
 * @param {Object} populate - Optional populate options
 * @returns {Promise<{doc: Document|null, shouldRedirect: boolean, canonicalSlug: string|null}>}
 */
async function findWithRedirectCheck(Model, idOrSlug, populate = null) {
  const doc = await findByIdOrSlug(Model, idOrSlug, populate);

  if (!doc) {
    return { doc: null, shouldRedirect: false, canonicalSlug: null };
  }

  // If accessed by ID but has a slug, suggest redirect
  const accessedById = isValidObjectId(idOrSlug) && idOrSlug === doc._id.toString();
  const hasSlug = !!doc.slug;

  return {
    doc,
    shouldRedirect: accessedById && hasSlug,
    canonicalSlug: doc.slug
  };
}

module.exports = {
  isValidObjectId,
  findByIdOrSlug,
  findWithRedirectCheck
};
