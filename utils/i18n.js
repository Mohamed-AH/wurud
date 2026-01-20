/**
 * Simple i18n (internationalization) system for Duroos platform
 * Supports Arabic (ar) and English (en)
 */

const translations = {
  ar: {
    // Navigation
    nav_home: 'الرئيسية',
    nav_lectures: 'جميع المحاضرات',
    nav_sheikhs: 'الشيوخ',
    nav_series: 'السلاسل',
    nav_search: 'بحث...',

    // Homepage
    home_title: 'منصة الدروس للمحاضرات الإسلامية',
    home_subtitle: 'استمع إلى محاضرات العلماء والمشايخ في العقيدة والفقه والتفسير وغيرها',
    home_browse_btn: 'تصفح المحاضرات',
    home_featured: 'محاضرات مميزة',
    home_recent: 'أحدث المحاضرات',

    // Statistics
    stat_lectures: 'محاضرة',
    stat_sheikhs: 'شيخ',
    stat_series: 'سلسلة',
    stat_plays: 'استماع',
    stat_hours: 'ساعة محتوى',

    // Browse page
    browse_title: 'جميع المحاضرات',
    browse_filter_category: 'تصفية حسب التصنيف',
    browse_all_categories: 'جميع التصنيفات',
    browse_search: 'ابحث في المحاضرات',
    browse_no_results: 'لا توجد نتائج',
    browse_results_count: 'محاضرة',

    // Lecture detail
    lecture_about: 'عن المحاضرة',
    lecture_sheikh_bio: 'نبذة عن الشيخ',
    lecture_related: 'محاضرات ذات صلة',
    lecture_download: 'تحميل المحاضرة',
    lecture_share: 'مشاركة',
    lecture_play: 'تشغيل',
    lecture_pause: 'إيقاف مؤقت',
    lecture_volume: 'الصوت',
    lecture_speed: 'السرعة',
    lecture_location: 'الموقع',

    // Sheikh profile
    sheikh_profile: 'الملف الشخصي',
    sheikh_lectures: 'جميع المحاضرات',
    sheikh_series: 'السلاسل',
    sheikh_bio: 'نبذة عن الشيخ',
    sheikh_more: 'المزيد من محاضرات الشيخ',
    sheikh_no_lectures: 'لا توجد محاضرات منشورة حالياً',

    // Series detail
    series_title: 'السلاسل',
    series_lectures: 'محاضرات السلسلة',
    series_about: 'وصف السلسلة',
    series_completion: 'مرقمة',
    series_no_lectures: 'لا توجد محاضرات منشورة في هذه السلسلة حالياً',

    // Categories
    category_aqeedah: 'العقيدة',
    category_fiqh: 'الفقه',
    category_tafsir: 'التفسير',
    category_hadith: 'الحديث',
    category_seerah: 'السيرة',
    category_general: 'عام',
    category_other: 'أخرى',

    // Common
    common_listen: 'استماع',
    common_download: 'تحميل',
    common_duration: 'المدة',
    common_date: 'التاريخ',
    common_views: 'مرة',
    common_loading: 'جاري التحميل...',
    common_error: 'حدث خطأ',
    common_not_found: 'غير موجود',

    // Footer
    footer_about: 'عن المنصة',
    footer_about_text: 'منصة الدروس للمحاضرات الإسلامية - نسعى لنشر العلم الشرعي',
    footer_quick_links: 'روابط سريعة',
    footer_categories: 'التصنيفات',
    footer_rights: 'جميع الحقوق محفوظة',

    // Breadcrumbs
    breadcrumb_home: 'الرئيسية',
    breadcrumb_lectures: 'المحاضرات',
    breadcrumb_sheikhs: 'الشيوخ',
    breadcrumb_series: 'السلاسل',
  },

  en: {
    // Navigation
    nav_home: 'Home',
    nav_lectures: 'All Lectures',
    nav_sheikhs: 'Sheikhs',
    nav_series: 'Series',
    nav_search: 'Search...',

    // Homepage
    home_title: 'Duroos Islamic Lectures Platform',
    home_subtitle: 'Listen to lectures from scholars and sheikhs on Aqeedah, Fiqh, Tafsir, and more',
    home_browse_btn: 'Browse Lectures',
    home_featured: 'Featured Lectures',
    home_recent: 'Recent Lectures',

    // Statistics
    stat_lectures: 'Lectures',
    stat_sheikhs: 'Sheikhs',
    stat_series: 'Series',
    stat_plays: 'Plays',
    stat_hours: 'Hours of Content',

    // Browse page
    browse_title: 'All Lectures',
    browse_filter_category: 'Filter by Category',
    browse_all_categories: 'All Categories',
    browse_search: 'Search lectures',
    browse_no_results: 'No results found',
    browse_results_count: 'Lectures',

    // Lecture detail
    lecture_about: 'About this Lecture',
    lecture_sheikh_bio: 'About the Sheikh',
    lecture_related: 'Related Lectures',
    lecture_download: 'Download Lecture',
    lecture_share: 'Share',
    lecture_play: 'Play',
    lecture_pause: 'Pause',
    lecture_volume: 'Volume',
    lecture_speed: 'Speed',
    lecture_location: 'Location',

    // Sheikh profile
    sheikh_profile: 'Profile',
    sheikh_lectures: 'All Lectures',
    sheikh_series: 'Series',
    sheikh_bio: 'About the Sheikh',
    sheikh_more: 'More lectures by this sheikh',
    sheikh_no_lectures: 'No published lectures at this time',

    // Series detail
    series_title: 'Series',
    series_lectures: 'Series Lectures',
    series_about: 'Series Description',
    series_completion: 'Numbered',
    series_no_lectures: 'No published lectures in this series at this time',

    // Categories
    category_aqeedah: 'Aqeedah',
    category_fiqh: 'Fiqh',
    category_tafsir: 'Tafsir',
    category_hadith: 'Hadith',
    category_seerah: 'Seerah',
    category_general: 'General',
    category_other: 'Other',

    // Common
    common_listen: 'Listen',
    common_download: 'Download',
    common_duration: 'Duration',
    common_date: 'Date',
    common_views: 'views',
    common_loading: 'Loading...',
    common_error: 'An error occurred',
    common_not_found: 'Not found',

    // Footer
    footer_about: 'About',
    footer_about_text: 'Duroos Islamic Lectures Platform - Spreading Islamic knowledge',
    footer_quick_links: 'Quick Links',
    footer_categories: 'Categories',
    footer_rights: 'All rights reserved',

    // Breadcrumbs
    breadcrumb_home: 'Home',
    breadcrumb_lectures: 'Lectures',
    breadcrumb_sheikhs: 'Sheikhs',
    breadcrumb_series: 'Series',
  }
};

/**
 * Get translation for a key in the specified locale
 * @param {string} locale - 'ar' or 'en'
 * @param {string} key - Translation key
 * @returns {string} Translated text or key if not found
 */
function t(locale, key) {
  if (!translations[locale]) {
    return key;
  }
  return translations[locale][key] || key;
}

/**
 * Middleware to set locale and inject translation function into templates
 */
function i18nMiddleware(req, res, next) {
  // Get locale from query, cookie, or default to Arabic
  const locale = req.query.lang || req.cookies?.locale || 'ar';

  // Validate locale
  const validLocale = ['ar', 'en'].includes(locale) ? locale : 'ar';

  // Set locale in response locals for templates
  res.locals.locale = validLocale;
  res.locals.isRTL = validLocale === 'ar';

  // Inject translation function
  res.locals.t = (key) => t(validLocale, key);

  // Inject all translations for client-side use
  res.locals.translations = translations[validLocale];

  next();
}

module.exports = {
  t,
  i18nMiddleware,
  translations
};
