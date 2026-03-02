/**
 * Homepage Module - Server-side filtering and pagination
 *
 * Handles:
 * - Tab switching (series, lectures, khutbas)
 * - Category/type filtering via API
 * - Search via API with debounce
 * - Pagination (load more)
 * - URL state persistence
 */

(function() {
  'use strict';

  // State
  const state = {
    tab: 'series',
    page: 1,
    limit: 10,
    category: 'all',
    type: 'all',
    search: '',
    sort: 'newest',
    loading: false,
    hasMore: {
      series: true,
      standalone: true,
      khutbas: true
    }
  };

  // Category translations
  const categoryTranslations = {
    ar: {
      'Tafsir': 'تفسير',
      'Hadith': 'حديث',
      'Fiqh': 'فقه',
      'Aqeedah': 'عقيدة',
      'Seerah': 'سيرة',
      'Akhlaq': 'أخلاق',
      'Other': 'أخرى'
    },
    en: {
      'Tafsir': 'Tafsir',
      'Hadith': 'Hadith',
      'Fiqh': 'Fiqh',
      'Aqeedah': 'Aqeedah',
      'Seerah': 'Seerah',
      'Akhlaq': 'Akhlaq',
      'Other': 'Other'
    }
  };

  // Get category translation
  function translateCategory(category) {
    const locale = getLocale();
    return categoryTranslations[locale]?.[category] || categoryTranslations['en'][category] || category;
  }

  // Get current locale (defined in index.ejs template)
  function getLocale() {
    return typeof currentLocale !== 'undefined' ? currentLocale : 'ar';
  }

  // Localized strings
  const strings = {
    ar: {
      loadMore: 'تحميل المزيد',
      loading: 'جاري التحميل...',
      play: 'تشغيل',
      download: 'تحميل',
      sheikh: 'الشيخ:',
      author: 'المؤلف:',
      lesson: 'درس',
      lessons: 'درس',
      showLessons: 'عرض الدروس ▼',
      showKhutbahs: 'عرض الخطب ▼',
      sortLessons: 'ترتيب الدروس:',
      byNumber: 'حسب الرقم',
      oldestFirst: 'الأقدم أولاً',
      newestFirst: 'الأحدث أولاً',
      noSeries: 'لا توجد سلاسل',
      noKhutbahs: 'لا توجد خطب',
      noLectures: 'لا توجد محاضرات',
      tryAnotherSearch: 'جرب بحثاً آخر'
    },
    en: {
      loadMore: 'Load More',
      loading: 'Loading...',
      play: 'Play',
      download: 'Download',
      sheikh: 'Sheikh:',
      author: 'Author:',
      lesson: 'lesson',
      lessons: 'lessons',
      showLessons: 'Show Lessons ▼',
      showKhutbahs: 'Show Khutbahs ▼',
      sortLessons: 'Sort lessons:',
      byNumber: 'By Number',
      oldestFirst: 'Oldest First',
      newestFirst: 'Newest First',
      noSeries: 'No series found',
      noKhutbahs: 'No khutbahs found',
      noLectures: 'No lectures found',
      tryAnotherSearch: 'Try another search'
    }
  };

  // Get localized string
  function t(key) {
    const locale = getLocale();
    return strings[locale]?.[key] || strings['ar'][key] || key;
  }

  // DOM elements
  let seriesContainer, standaloneContainer, khutbasContainer;
  let loadMoreBtn, loadingIndicator;

  /**
   * Initialize the module
   */
  function init() {
    // Get containers
    seriesContainer = document.querySelector('#content-series .series-list');
    standaloneContainer = document.querySelector('#content-lectures .series-list');
    khutbasContainer = document.querySelector('#content-khutbas .series-list');

    // Create load more button
    createLoadMoreButton();

    // Create loading indicator
    createLoadingIndicator();

    // Parse URL state
    parseUrlState();

    // Bind events
    bindEvents();

    // Update UI to match state
    updateUIFromState();

    // Check if we need to load more (if no initial server-rendered content)
    checkInitialContent();
  }

  /**
   * Parse URL query parameters to state
   */
  function parseUrlState() {
    const params = new URLSearchParams(window.location.search);

    if (params.has('tab')) {
      state.tab = params.get('tab');
    }
    if (params.has('category')) {
      state.category = params.get('category');
    }
    if (params.has('type')) {
      state.type = params.get('type');
    }
    if (params.has('search')) {
      state.search = params.get('search');
    }
    if (params.has('sort')) {
      state.sort = params.get('sort');
    }
  }

  /**
   * Update URL with current state
   */
  function updateUrl() {
    const params = new URLSearchParams();

    if (state.tab !== 'series') params.set('tab', state.tab);
    if (state.category !== 'all') params.set('category', state.category);
    if (state.type !== 'all') params.set('type', state.type);
    if (state.search) params.set('search', state.search);
    if (state.sort !== 'newest') params.set('sort', state.sort);

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    window.history.replaceState({}, '', newUrl);
  }

  /**
   * Update UI elements to match current state
   */
  function updateUIFromState() {
    // Update tab
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    const activeTab = document.getElementById('tab-' + state.tab);
    if (activeTab) activeTab.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    const activeContent = document.getElementById('content-' + state.tab);
    if (activeContent) activeContent.classList.add('active');

    // Update category chips
    document.querySelectorAll('.chip[data-type="category"]').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.filter === state.category);
    });

    // Update type chips
    document.querySelectorAll('.chip[data-type="seriesType"]').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.filter === state.type);
    });

    // Update sort chips
    document.querySelectorAll('.chip[data-sort]').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.sort === state.sort);
    });

    // Update search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput && state.search) {
      searchInput.value = state.search;
    }

    // Update clear button visibility
    updateClearButtonVisibility();

    // Update load more button position
    updateLoadMoreButton();
  }

  /**
   * Create load more button
   */
  function createLoadMoreButton() {
    loadMoreBtn = document.createElement('button');
    loadMoreBtn.className = 'load-more-btn';
    loadMoreBtn.innerHTML = t('loadMore');
    loadMoreBtn.style.cssText = `
      display: none;
      width: 100%;
      max-width: 300px;
      margin: 24px auto;
      padding: 12px 24px;
      background: var(--color-gold, #C19A6B);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    `;
    loadMoreBtn.addEventListener('click', loadMore);
  }

  /**
   * Create loading indicator
   */
  function createLoadingIndicator() {
    loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 24px; color: #666;">
        <svg width="24" height="24" viewBox="0 0 24 24" class="spin">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" opacity="0.3"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" fill="none"/>
        </svg>
        <span>${t('loading')}</span>
      </div>
    `;
    loadingIndicator.style.display = 'none';

    // Add spin animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .spin { animation: spin 1s linear infinite; }
      .load-more-btn:hover { background: var(--color-gold-dark, #A67C52); }
    `;
    document.head.appendChild(style);
  }

  /**
   * Update load more button position
   */
  function updateLoadMoreButton() {
    let container;
    if (state.tab === 'series') container = seriesContainer;
    else if (state.tab === 'lectures') container = standaloneContainer;
    else if (state.tab === 'khutbas') container = khutbasContainer;

    if (container) {
      // Remove from previous location
      if (loadMoreBtn.parentNode) {
        loadMoreBtn.parentNode.removeChild(loadMoreBtn);
      }
      if (loadingIndicator.parentNode) {
        loadingIndicator.parentNode.removeChild(loadingIndicator);
      }

      // Add after container
      container.parentNode.appendChild(loadingIndicator);
      container.parentNode.appendChild(loadMoreBtn);

      // Show/hide based on hasMore
      const tabKey = state.tab === 'lectures' ? 'standalone' : state.tab;
      loadMoreBtn.style.display = state.hasMore[tabKey] ? 'block' : 'none';
    }
  }

  /**
   * Check if initial content was server-rendered
   */
  function checkInitialContent() {
    const container = getActiveContainer();
    if (container) {
      const cards = container.querySelectorAll('.series-card');
      // If filters are applied but no cards, fetch from API
      if (cards.length === 0 || state.category !== 'all' || state.type !== 'all' || state.search) {
        // Filters active, need to fetch
        state.page = 1;
        fetchData(true);
      }
    }
  }

  /**
   * Get the active container based on current tab
   */
  function getActiveContainer() {
    if (state.tab === 'series') return seriesContainer;
    if (state.tab === 'lectures') return standaloneContainer;
    if (state.tab === 'khutbas') return khutbasContainer;
    return null;
  }

  /**
   * Bind event listeners
   */
  function bindEvents() {
    // Tab switching
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', function() {
        const tabName = this.id.replace('tab-', '');
        switchTab(tabName);
      });
    });

    // Category filter chips
    document.querySelectorAll('.chip[data-type="category"]').forEach(chip => {
      chip.addEventListener('click', function() {
        setFilter('category', this.dataset.filter);
      });
    });

    // Series type filter chips
    document.querySelectorAll('.chip[data-type="seriesType"]').forEach(chip => {
      chip.addEventListener('click', function() {
        setFilter('type', this.dataset.filter);
      });
    });

    // Sort chips
    document.querySelectorAll('.chip[data-sort]').forEach(chip => {
      chip.addEventListener('click', function() {
        setSort(this.dataset.sort);
      });
    });

    // Search input with debounce
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          setSearch(this.value);
        }, 300);
      });
    }

    // Clear filters button
    const clearBtn = document.getElementById('clearFiltersBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearAllFilters);
    }
  }

  /**
   * Switch tab
   */
  function switchTab(tabName) {
    state.tab = tabName;
    state.page = 1;

    updateUIFromState();
    updateUrl();

    // Fetch data if needed (filters applied or no content)
    const container = getActiveContainer();
    const cards = container ? container.querySelectorAll('.series-card') : [];

    if (cards.length === 0 || state.category !== 'all' || state.type !== 'all' || state.search) {
      fetchData(true);
    } else {
      // Apply client-side filter to existing content
      applyClientSideFilter();
    }
  }

  /**
   * Set filter and fetch data
   */
  function setFilter(filterType, value) {
    if (filterType === 'category') {
      state.category = value;
    } else if (filterType === 'type') {
      state.type = value;
    }

    state.page = 1;
    updateUIFromState();
    updateUrl();
    fetchData(true);
  }

  /**
   * Set sort order
   */
  function setSort(sortValue) {
    state.sort = sortValue;
    state.page = 1;

    updateUIFromState();
    updateUrl();
    fetchData(true);
  }

  /**
   * Set search term
   */
  function setSearch(term) {
    state.search = term.trim();
    state.page = 1;

    updateUrl();
    updateClearButtonVisibility();
    fetchData(true);
  }

  /**
   * Clear all filters
   */
  function clearAllFilters() {
    state.category = 'all';
    state.type = 'all';
    state.search = '';
    state.sort = 'newest';
    state.page = 1;

    // Clear search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';

    updateUIFromState();
    updateUrl();
    fetchData(true);
  }

  /**
   * Update clear button visibility
   */
  function updateClearButtonVisibility() {
    const clearBtn = document.getElementById('clearFiltersBtn');
    if (!clearBtn) return;

    const hasActiveFilter =
      state.category !== 'all' ||
      state.type !== 'all' ||
      state.sort !== 'newest' ||
      state.search !== '';

    clearBtn.style.display = hasActiveFilter ? 'inline-block' : 'none';
  }

  /**
   * Load more data (pagination)
   */
  function loadMore() {
    state.page++;
    fetchData(false);
  }

  /**
   * Fetch data from API
   * @param {boolean} replace - If true, replace content; if false, append
   */
  async function fetchData(replace = true) {
    if (state.loading) return;

    state.loading = true;
    loadingIndicator.style.display = 'block';
    loadMoreBtn.style.display = 'none';

    try {
      let url;
      const params = new URLSearchParams();
      params.set('page', state.page);
      params.set('sort', state.sort);

      if (state.category !== 'all') params.set('category', state.category);
      if (state.search) params.set('search', state.search);

      if (state.tab === 'series') {
        url = '/api/homepage/series';
        params.set('limit', '10');
        if (state.type !== 'all') params.set('type', state.type);
      } else if (state.tab === 'lectures') {
        url = '/api/homepage/standalone';
        params.set('limit', '20');
      } else if (state.tab === 'khutbas') {
        url = '/api/homepage/khutbas';
        params.set('limit', '10');
      }

      const response = await fetch(`${url}?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        if (state.tab === 'lectures') {
          renderStandaloneLectures(data.lectures, replace);
          state.hasMore.standalone = data.pagination.hasMore;
        } else {
          const seriesData = data.series || [];
          if (state.tab === 'series') {
            renderSeries(seriesData, replace);
            state.hasMore.series = data.pagination.hasMore;
          } else if (state.tab === 'khutbas') {
            renderKhutbas(seriesData, replace);
            state.hasMore.khutbas = data.pagination.hasMore;
          }
        }

        updateLoadMoreButton();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      state.loading = false;
      loadingIndicator.style.display = 'none';
    }
  }

  /**
   * Render series cards
   */
  function renderSeries(seriesList, replace) {
    if (!seriesContainer) return;

    // Remove loading skeleton if present
    const skeleton = document.getElementById('seriesLoadingSkeleton');
    if (skeleton) skeleton.remove();

    if (replace) {
      seriesContainer.innerHTML = '';
    }

    if (seriesList.length === 0 && replace) {
      seriesContainer.innerHTML = renderEmptyState('series');
      return;
    }

    seriesList.forEach(series => {
      const card = createSeriesCard(series, false);
      seriesContainer.appendChild(card);
    });
  }

  /**
   * Render khutba series cards
   */
  function renderKhutbas(seriesList, replace) {
    if (!khutbasContainer) return;

    if (replace) {
      khutbasContainer.innerHTML = '';
    }

    if (seriesList.length === 0 && replace) {
      khutbasContainer.innerHTML = renderEmptyState('khutbas');
      return;
    }

    seriesList.forEach(series => {
      const card = createSeriesCard(series, true);
      khutbasContainer.appendChild(card);
    });
  }

  /**
   * Render standalone lectures
   */
  function renderStandaloneLectures(lectures, replace) {
    if (!standaloneContainer) return;

    if (replace) {
      standaloneContainer.innerHTML = '';
    }

    if (lectures.length === 0 && replace) {
      standaloneContainer.innerHTML = renderEmptyState('standalone');
      return;
    }

    lectures.forEach(lecture => {
      const card = createStandaloneLectureCard(lecture);
      standaloneContainer.appendChild(card);
    });
  }

  /**
   * Create a series card element
   */
  function createSeriesCard(series, isKhutba = false) {
    const div = document.createElement('div');
    div.className = 'series-card';
    div.dataset.category = series.category || 'Other';
    div.dataset.date = series.mostRecentDate ? new Date(series.mostRecentDate).getTime() : 0;
    div.dataset.seriesType = series.seriesType || 'masjid';

    const seriesIdPrefix = isKhutba ? 'khutba-' : '';
    const episodesId = isKhutba ? `khutba-episodes-${series._id}` : `episodes-${series._id}`;
    const btnId = isKhutba ? `khutba-btn-${series._id}` : `btn-${series._id}`;
    const toggleFn = isKhutba ? 'toggleKhutba' : 'toggleSeries';
    const btnText = isKhutba ? t('showKhutbahs') : t('showLessons');

    const locale = getLocale();
    const sheikhName = locale === 'ar'
      ? (series.sheikh?.nameArabic || '')
      : (series.sheikh?.nameEnglish || series.sheikh?.nameArabic || '');
    const seriesTitle = locale === 'ar'
      ? (series.titleArabic || '')
      : (series.titleEnglish || series.titleArabic || '');
    const categoryLabel = translateCategory(series.category);

    div.innerHTML = `
      <div class="series-header" onclick="${toggleFn}('${series._id}')">
        <h2 class="series-title">${escapeHtml(seriesTitle)}</h2>

        <div class="series-meta">
          ${series.originalAuthor ? `
            <div class="series-author">
              <span class="series-author-label">${t('author')}</span>
              ${escapeHtml(series.originalAuthor)}
            </div>
          ` : ''}
          <div class="series-sheikh">
            ${t('sheikh')} ${escapeHtml(sheikhName)}
          </div>
        </div>

        <div class="series-info">
          <span>${series.lectureCount || 0} ${t('lesson')}</span>
          <span class="category-badge">${categoryLabel}</span>
        </div>

        <button class="expand-btn" id="${btnId}">
          ${btnText}
        </button>
      </div>

      <div class="episodes-list" id="${episodesId}">
        <div style="padding: 12px; background: #f8f9fa; border-bottom: 1px solid #e9ecef; display: flex; gap: 8px; align-items: center;">
          <span style="font-size: 13px; font-weight: 600; color: #666;">${t('sortLessons')}</span>
          <button class="chip" onclick="sortSeriesLectures('${seriesIdPrefix}${series._id}', 'number'); event.stopPropagation();" style="padding: 4px 12px; font-size: 12px;">
            ${t('byNumber')}
          </button>
          <button class="chip" onclick="sortSeriesLectures('${seriesIdPrefix}${series._id}', 'oldest'); event.stopPropagation();" style="padding: 4px 12px; font-size: 12px;">
            ${t('oldestFirst')}
          </button>
          <button class="chip" onclick="sortSeriesLectures('${seriesIdPrefix}${series._id}', 'newest'); event.stopPropagation();" style="padding: 4px 12px; font-size: 12px;">
            ${t('newestFirst')}
          </button>
        </div>
        <div class="episodes-container">
          ${(series.lectures || []).map((lecture, index) => createEpisodeHtml(lecture, index, sheikhName)).join('')}
        </div>
      </div>
    `;

    return div;
  }

  /**
   * Create episode HTML for a lecture within a series
   */
  function createEpisodeHtml(lecture, index, sheikhName) {
    const locale = getLocale();
    const duration = lecture.duration && lecture.duration > 0
      ? `⏱️ ${Math.floor(lecture.duration / 60)}:${String(lecture.duration % 60).padStart(2, '0')}`
      : '';

    const hijriDate = lecture.dateRecordedHijri
      ? `📅 ${formatHijriDate(lecture.dateRecordedHijri)}`
      : '';

    const lectureDate = lecture.dateRecorded ? new Date(lecture.dateRecorded).getTime() : 0;
    const lectureTitle = locale === 'ar'
      ? (lecture.titleArabic || '')
      : (lecture.titleEnglish || lecture.titleArabic || '');
    const titleEscaped = escapeHtml(lectureTitle).replace(/'/g, "\\'");
    const sheikhEscaped = escapeHtml(sheikhName).replace(/'/g, "\\'");

    return `
      <div class="episode-item" data-lecture-number="${index + 1}" data-date="${lectureDate}">
        <div class="episode-header">
          <div class="episode-number">${index + 1}</div>
          <div class="episode-title">${escapeHtml(lectureTitle)}</div>
        </div>
        <div class="episode-meta">
          ${duration ? `<span>${duration}</span>` : ''}
          ${lecture.location ? `<span>${escapeHtml(lecture.location)}</span>` : ''}
          ${hijriDate ? `<span class="hijri-date">${hijriDate}</span>` : ''}
        </div>
        <div class="episode-actions">
          <button class="btn-play" onclick="playAudio('${lecture._id}', '${titleEscaped}', '${sheikhEscaped}')">
            ▶ ${t('play')}
          </button>
          <a href="/download/${lecture._id}" class="btn-download">
            ⬇ ${t('download')}
          </a>
        </div>
      </div>
    `;
  }

  /**
   * Create a standalone lecture card
   */
  function createStandaloneLectureCard(lecture) {
    const div = document.createElement('div');
    div.className = 'series-card';
    const locale = getLocale();

    const lectureDate = lecture.dateRecorded ? new Date(lecture.dateRecorded).getTime() :
      (lecture.createdAt ? new Date(lecture.createdAt).getTime() : Date.now());
    div.dataset.date = lectureDate;
    div.dataset.hijri = lecture.dateRecordedHijri || '';

    const sheikhName = locale === 'ar'
      ? (lecture.sheikhId?.nameArabic || '')
      : (lecture.sheikhId?.nameEnglish || lecture.sheikhId?.nameArabic || '');
    const lectureTitle = locale === 'ar'
      ? (lecture.titleArabic || '')
      : (lecture.titleEnglish || lecture.titleArabic || '');
    const duration = lecture.duration && lecture.duration > 0
      ? `⏱️ ${Math.floor(lecture.duration / 60)}:${String(lecture.duration % 60).padStart(2, '0')}`
      : '';
    const hijriDate = lecture.dateRecordedHijri
      ? `📅 ${formatHijriDate(lecture.dateRecordedHijri)}`
      : '';

    const titleEscaped = escapeHtml(lectureTitle).replace(/'/g, "\\'");
    const sheikhEscaped = escapeHtml(sheikhName).replace(/'/g, "\\'");

    div.innerHTML = `
      <div class="series-header">
        <h2 class="series-title">${escapeHtml(lectureTitle)}</h2>
        <div class="series-meta">
          <div class="series-sheikh">
            ${t('sheikh')} ${escapeHtml(sheikhName)}
          </div>
        </div>
        <div class="series-info">
          ${duration ? `<span>${duration}</span>` : ''}
          ${hijriDate ? `<span class="hijri-date">${hijriDate}</span>` : ''}
        </div>
        <div class="episode-actions" style="margin-top: 16px;">
          ${lecture.audioFileName || lecture.audioUrl ? `
            <button class="btn-play" onclick="playAudio('${lecture._id}', '${titleEscaped}', '${sheikhEscaped}')">
              ▶ ${t('play')}
            </button>
            <a href="/download/${lecture._id}" class="btn-download">
              ⬇ ${t('download')}
            </a>
          ` : ''}
        </div>
      </div>
    `;

    return div;
  }

  /**
   * Render empty state
   */
  function renderEmptyState(tabType) {
    const emptyMessages = {
      series: { ar: 'لا توجد سلاسل', en: 'No series found' },
      khutbas: { ar: 'لا توجد خطب', en: 'No khutbahs found' },
      standalone: { ar: 'لا توجد محاضرات', en: 'No lectures found' }
    };
    const locale = getLocale();
    const emptyMsg = emptyMessages[tabType]?.[locale] || emptyMessages[tabType]?.['ar'] || tabType;

    return `
      <div class="empty-state">
        <div class="empty-icon">📚</div>
        <h3 class="empty-title">${emptyMsg}</h3>
        <p class="empty-text">${t('tryAnotherSearch')}</p>
      </div>
    `;
  }

  /**
   * Format Hijri date
   */
  function formatHijriDate(dateStr) {
    if (!dateStr) return '';

    const locale = getLocale();
    // Only convert to Arabic numerals for Arabic locale
    if (locale === 'ar') {
      const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
      return dateStr.replace(/[0-9]/g, d => arabicNumerals[parseInt(d)]);
    }
    return dateStr;
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Apply client-side filter to existing content
   * (Used when filters match server-rendered content)
   */
  function applyClientSideFilter() {
    const container = getActiveContainer();
    if (!container) return;

    const cards = container.querySelectorAll('.series-card');
    cards.forEach(card => {
      const category = card.dataset.category;
      const seriesType = card.dataset.seriesType;

      const categoryMatch = state.category === 'all' || category === state.category;
      const typeMatch = state.type === 'all' || seriesType === state.type;

      card.style.display = (categoryMatch && typeMatch) ? 'block' : 'none';
    });

    // Apply sort
    sortCards(container);
  }

  /**
   * Sort cards in container
   */
  function sortCards(container) {
    const cards = Array.from(container.querySelectorAll('.series-card'));

    cards.sort((a, b) => {
      const dateA = parseInt(a.dataset.date) || 0;
      const dateB = parseInt(b.dataset.date) || 0;
      return state.sort === 'newest' ? dateB - dateA : dateA - dateB;
    });

    cards.forEach(card => container.appendChild(card));
  }

  // Expose functions globally for onclick handlers
  window.switchTab = switchTab;
  window.filterBySeriesType = (type) => setFilter('type', type);
  window.sortByDate = setSort;
  window.clearAllFilters = clearAllFilters;

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
