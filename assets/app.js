(() => {
  // Lazy-load images and iframes
  function enableLazyLoading() {
    document.querySelectorAll('img:not([loading]), iframe:not([loading])').forEach(el => {
      el.setAttribute('loading', 'lazy');
    });
  }

  // Inject small performance styles
  function injectPerfStyles() {
    if (document.getElementById('perf-styles')) return;
    const style = document.createElement('style');
    style.id = 'perf-styles';
    style.textContent = `
      /* Improve initial paint for large sections */
      .projects-grid, .books-grid, .dashboard, .game-container, .attendance-list {
        content-visibility: auto;
        contain-intrinsic-size: 1000px 800px;
      }
      /* Reduce motion if user prefers */
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; scroll-behavior: auto !important; }
      }
    `;
    document.head.appendChild(style);
  }

  // Register Service Worker
  async function registerSW() {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch (err) {
        // no-op
      }
    }
  }

    // Minor prefetch for project pages when on index
    function prefetchProjects() {
      if (!location.pathname.endsWith('index.html') && location.pathname !== '/') return;
      const links = ['project9.html', 'project1.html', 'project3.html', 'project5.html'];
      links.forEach(href => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        document.head.appendChild(link);
      });
    }

  // Initialize
  enableLazyLoading();
  injectPerfStyles();
  prefetchProjects();
  registerSW();

  // THEME: CSS variables, palette overrides, and dynamic meta theme-color
  function injectThemeStyles() {
    if (document.getElementById('theme-styles')) return;
    const style = document.createElement('style');
    style.id = 'theme-styles';
    style.textContent = `
        /* Dark theme variables - permanently applied */
        :root[data-theme="dark"] {
          --bg: #0b1021;
          --bg-secondary: #0f172a;
          --text: #f8fbff;
          --text-muted: #d6e4ff;
          --primary: #8b9dfc;
          --primary-2: #b28dfc;
          --card-bg: #111a33;
          --card-border: #1f2d4c;
          --surface: #0c162c;
          --tag-bg: #1d2742;
          --tag-text: #e4ecff;
          --shadow-1: rgba(0, 0, 0, 0.5);
          --shadow-2: rgba(0, 0, 0, 0.68);
          --theme-color: #0c162c;
          --state-success-bg: rgba(34, 197, 94, 0.26);
          --state-success-text: #d1fadf;
          --state-success-border: rgba(34, 197, 94, 0.6);
          --state-warning-bg: rgba(251, 191, 36, 0.24);
          --state-warning-text: #fdf4c6;
          --state-warning-border: rgba(251, 191, 36, 0.5);
          --state-danger-bg: rgba(248, 113, 113, 0.26);
          --state-danger-text: #ffe2e2;
          --state-danger-border: rgba(248, 113, 113, 0.6);
          --state-info-bg: rgba(59, 130, 246, 0.22);
          --state-info-text: #d4e7ff;
          --state-info-border: rgba(59, 130, 246, 0.5);
      }

      /* Map AI assistant palette to site theme */
      :root[data-theme] {
        --ai-accent: var(--primary);
        --ai-accent2: var(--primary-2);
        --ai-bg: var(--card-bg);
        --ai-text: var(--text);
      }

      /* Global surface/background override (keep the signature gradient but from theme colors) */
      body {
        background: linear-gradient(135deg, var(--primary) 0%, var(--primary-2) 100%) !important;
        color: var(--text);
      }

      /* Unify cards/surfaces across pages */
      .project-card, .panel, .main-section, .modal-content, .game-container, .report-card, .stat-card, .book-card, .attendance-item {
        background: var(--card-bg) !important;
        color: var(--text) !important;
        box-shadow: 0 8px 24px var(--shadow-1) !important;
      }

      /* Headings and texts */
      h1, h2, h3, .project-title, .book-title, .plant-name, .report-title, .stat-info h3, .result-message {
        color: var(--text) !important;
      }
      .project-description, .book-info, .sensor-label, .plant-stats, .stat-label, .student-class, .attendance-time, .notification-item p {
        color: var(--text-muted) !important;
      }

      /* Buttons (primary actions) */
      .view-button, .btn-primary, .scan-button {
        background: linear-gradient(135deg, var(--primary) 0%, var(--primary-2) 100%) !important;
        color: #fff !important;
        border: none !important;
      }

      /* Tags and pills */
      .tag {
        background: var(--tag-bg) !important;
        color: var(--tag-text) !important;
        border: 0 !important;
      }

      :root[data-theme] .book-status,
      :root[data-theme] .status-badge,
      :root[data-theme] .sensor-status,
      :root[data-theme] .notification-item,
      :root[data-theme] .alert-box,
      :root[data-theme] .due-date,
      :root[data-theme] .attendance-item {
        border-radius: inherit;
      }

      :root[data-theme] .notification-item {
        background: var(--state-info-bg) !important;
        color: var(--state-info-text) !important;
        border-right-color: var(--state-info-border) !important;
      }

      :root[data-theme] .book-status.available,
      :root[data-theme] .sensor-status.status-good,
      :root[data-theme] .status-badge.status-present,
      :root[data-theme] .alert-box.success,
      :root[data-theme] .attendance-item.present {
        background: var(--state-success-bg) !important;
        color: var(--state-success-text) !important;
      }

      :root[data-theme] .alert-box.success,
      :root[data-theme] .attendance-item.present {
        border-right-color: var(--state-success-border) !important;
      }

      :root[data-theme] .book-status.borrowed,
      :root[data-theme] .sensor-status.status-warning,
      :root[data-theme] .status-badge.status-late,
      :root[data-theme] .alert-box:not(.success):not(.danger),
      :root[data-theme] .notification-item.warning,
      :root[data-theme] .due-date,
      :root[data-theme] .attendance-item.late {
        background: var(--state-warning-bg) !important;
        color: var(--state-warning-text) !important;
      }

      :root[data-theme] .alert-box:not(.success):not(.danger),
      :root[data-theme] .notification-item.warning,
      :root[data-theme] .attendance-item.late,
      :root[data-theme] .due-date {
        border-right-color: var(--state-warning-border) !important;
      }

      :root[data-theme] .sensor-status.status-danger,
      :root[data-theme] .status-badge.status-absent,
      :root[data-theme] .alert-box.danger,
      :root[data-theme] .notification-item.urgent,
      :root[data-theme] .due-date.overdue,
      :root[data-theme] .attendance-item.absent {
        background: var(--state-danger-bg) !important;
        color: var(--state-danger-text) !important;
      }

      :root[data-theme] .alert-box.danger,
      :root[data-theme] .notification-item.urgent,
      :root[data-theme] .attendance-item.absent,
      :root[data-theme] .due-date.overdue {
        border-right-color: var(--state-danger-border) !important;
      }



      /* شعار المدرسة في رأس الصفحة (الواجهة) */
      .header-logo {
        display: block;
        width: 84px;
        height: 84px;
        object-fit: contain;
        margin: 0 auto 8px;
        border-radius: 50%;
        background: var(--card-bg);
        padding: 6px;
        box-shadow: 0 6px 18px var(--shadow-1);
        border: 1px solid var(--card-border);
      }

      /* Animated Tech logo styles (only used on main page if injected) */
      .tech-logo {
        width: 56px; height: 56px; margin: 0 auto 8px; position: relative;
        filter: drop-shadow(0 6px 16px var(--shadow-2));
      }
      .tech-logo svg .pulse {
        transform-origin: center; animation: tl-pulse 2.2s infinite ease-in-out;
      }
      .tech-logo svg .orbit { transform-origin: center; animation: tl-orbit 6s linear infinite; }
      @keyframes tl-pulse { 0%,100% { opacity: .8; transform: scale(1);} 50% { opacity: 1; transform: scale(1.05);} }
      @keyframes tl-orbit { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }

      /* Reviews section */
      .reviews-section { margin: 30px 0 10px; background: var(--card-bg); color: var(--text); border: 1px solid var(--card-border); border-radius: 16px; box-shadow: 0 8px 24px var(--shadow-1); padding: 20px; }
      .reviews-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
      .rating-summary { display: flex; align-items: center; gap: 16px; }
      .rating-score { font-size: 2rem; font-weight: 800; }
      .stars { color: #fbbf24; } /* amber-400 */
      .star-input button { background: none; border: none; cursor: pointer; font-size: 1.6rem; color: #cbd5e1; }
      .star-input button.active { color: #fbbf24; }
      .review-form { display: grid; gap: 10px; margin-top: 12px; }
      .review-form input, .review-form textarea { border: 1px solid var(--card-border); background: var(--bg-secondary); color: var(--text); border-radius: 10px; padding: 10px 12px; font-family: inherit; }
      .review-form button { justify-self: start; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-2) 100%); color: #fff; border: none; border-radius: 10px; padding: 10px 14px; font-weight: 700; cursor: pointer; }
      .reviews-list { margin-top: 16px; display: grid; gap: 10px; }
      .review-item { background: var(--bg-secondary); border: 1px solid var(--card-border); border-radius: 12px; padding: 12px; }
      .review-item .meta { color: var(--text-muted); font-size: .85rem; margin-bottom: 6px; display: flex; gap: 8px; align-items: center; }

      /* Visitors section */
      .visitors-section { margin: 30px 0 10px; background: var(--card-bg); color: var(--text); border: 1px solid var(--card-border); border-radius: 16px; box-shadow: 0 8px 24px var(--shadow-1); padding: 20px; }
      .visitors-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
      .visitors-meta { color: var(--text-muted); font-size: .9rem; }
      .visitor-chips { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0; }
      .visitor-chip { display: inline-flex; align-items: center; gap: 8px; background: var(--bg-secondary); color: var(--text); border: 1px solid var(--card-border); border-radius: 999px; padding: 6px 10px; box-shadow: 0 4px 14px var(--shadow-1); }
      .visitor-chip .flag { font-size: 1.1rem; }
      .visitors-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      .visitors-table th, .visitors-table td { text-align: right; border-bottom: 1px solid var(--card-border); padding: 10px; }
      .visitors-table th { color: var(--text-muted); font-weight: 700; background: var(--surface); }
      .visitors-table tr:hover { background: var(--surface); }

      /* Mishkat gallery section */
      .mishkat-section { margin: 30px 0 10px; background: var(--card-bg); color: var(--text); border: 1px solid var(--card-border); border-radius: 16px; box-shadow: 0 8px 24px var(--shadow-1); padding: 20px; }
      .mishkat-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
      .mishkat-actions { display: inline-flex; gap: 8px; align-items: center; }
      .mishkat-add { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-2) 100%); color: #fff; border: none; border-radius: 10px; padding: 10px 12px; font-weight: 700; cursor: pointer; box-shadow: 0 6px 18px var(--shadow-1); }
      .mishkat-add:hover { filter: brightness(1.03); }
      .mishkat-file { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0; }
      .mishkat-drop { margin-top: 12px; padding: 18px; border: 2px dashed var(--card-border); border-radius: 12px; background: var(--surface); color: var(--text-muted); text-align: center; transition: border-color .2s ease, background .2s ease; }
      .mishkat-drop strong { color: var(--text); }
      .mishkat-drop.active { border-color: var(--primary); background: rgba(99, 102, 241, .06); }
      .mishkat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-top: 12px; }
      .mishkat-item { position: relative; border-radius: 12px; overflow: hidden; background: var(--bg-secondary); border: 1px solid var(--card-border); box-shadow: 0 6px 18px var(--shadow-1); }
      .mishkat-item img { width: 100%; height: 140px; object-fit: cover; display: block; }
      .mishkat-remove { position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,.55); color: #fff; border: none; border-radius: 8px; font-size: 12px; padding: 6px 8px; cursor: pointer; }
      .mishkat-remove:hover { background: rgba(0,0,0,.7); }

      /* شعار المدرسة العائم لإظهاره على جميع الصفحات */
      .school-logo-fixed {
        position: fixed;
        top: 16px;
        left: 16px;
        width: 56px;
        height: 56px;
        z-index: 950; /* أقل من زر الرجوع */
        border-radius: 50%;
        background: var(--card-bg);
        padding: 6px;
        box-shadow: 0 6px 18px var(--shadow-1);
        border: 1px solid var(--card-border);
      }
    `;
    document.head.appendChild(style);
  }

  function updateThemeColorMeta() {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    const themeColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-color').trim();
    if (themeColor) meta.setAttribute('content', themeColor);
  }

  function applyDarkTheme() {
    const root = document.documentElement;
    // Force dark mode permanently
    root.setAttribute('data-theme', 'dark');
    localStorage.setItem('siteTheme', 'dark');
    updateThemeColorMeta();
  }

  function initTheme() {
    injectThemeStyles();
    // Always apply dark theme - no toggle, no user preference
    applyDarkTheme();
  }

  // BRAND LOGO: Inject school logo in the main index page header
  function injectTechLogoIfNeeded() {
    const onIndex = document.title.includes('قسم التقنية');
    if (!onIndex) return;
    const header = document.querySelector('header');
    if (!header) return;
    // Do not inject if a logo already exists
    if (header.querySelector('.header-logo, .school-logo, img[alt="شعار مدارس المشكاة"]')) return;
    const img = document.createElement('img');
    img.className = 'header-logo';
    img.src = '/assets/logo.svg';
    img.alt = 'شعار مدارس المشكاة';
    img.decoding = 'async';
    img.loading = 'eager';
    img.addEventListener('error', () => img.remove());
    header.insertBefore(img, header.firstChild);
  }

  // REVIEWS: Star rating + testimonials persisted عبر واجهة برمجية بسيطة
  function renderStars(rating) {
    const full = Math.round(rating);
    return '★★★★★'.split('').map((s, i) => i < full ? '★' : '☆').join('');
  }

  function initReviewsSectionIfNeeded() {
    const onIndex = document.title.includes('قسم التقنية');
    if (!onIndex) return;
    if (document.querySelector('.reviews-section')) return;

    const container = document.getElementById('mainContent');
    if (!container) return;
    const footer = container.querySelector('footer');

    const section = document.createElement('section');
    section.className = 'reviews-section';
    section.innerHTML = `
      <div class="reviews-header">
        <h2 style="margin:0;">⭐ تقييم وتجارب الزوار</h2>
        <div class="rating-summary">
          <div class="rating-score" id="avgScore">0.0</div>
          <div class="stars" id="avgStars">☆☆☆☆☆</div>
          <div id="reviewsCount" style="color: var(--text-muted);"></div>
        </div>
      </div>
      <div class="review-form">
        <div class="star-input" id="starInput"></div>
        <textarea id="reviewText" rows="3" placeholder="اكتب تجربتك بإيجاز..."></textarea>
        <input id="reviewName" type="text" placeholder="اسمك (اختياري)">
        <button id="submitReview">إرسال التقييم</button>
      </div>
      <div class="reviews-list" id="reviewsList"></div>
    `;
    container.insertBefore(section, footer);

      const avgScoreEl = section.querySelector('#avgScore');
      const avgStarsEl = section.querySelector('#avgStars');
      const reviewsCountEl = section.querySelector('#reviewsCount');
      const reviewsListEl = section.querySelector('#reviewsList');
      const reviewTextEl = section.querySelector('#reviewText');
      const reviewNameEl = section.querySelector('#reviewName');
      const submitBtn = section.querySelector('#submitReview');
      const starInput = section.querySelector('#starInput');

      let selected = 5;
      let isSubmitting = false;
      let state = { reviews: [], average: 0, count: 0 };

      function setLoading(isLoading) {
        submitBtn.disabled = isLoading;
        submitBtn.textContent = isLoading ? 'جاري الإرسال...' : 'إرسال التقييم';
      }

      function formatDateShort(iso) {
        try {
          return new Date(iso).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch {
          return '';
        }
      }

      function refreshUI(message) {
        const { reviews, average, count } = state;
        avgScoreEl.textContent = average.toFixed(1);
        avgStarsEl.textContent = renderStars(average);
        reviewsCountEl.textContent = message || (count ? 'تمت مشاركة تجارب من الزوار.' : 'بانتظار أوّل تجربة من الزوار.');
        reviewsListEl.innerHTML = reviews.slice().reverse().map((r) => {
          const safeText = String(r.text || '').replace(/</g, '&lt;');
          const reviewer = r.name || 'زائر';
          const createdAt = formatDateShort(r.createdAt || r.date);
          return `
            <div class="review-item">
              <div class="meta">
                <span>${renderStars(r.rating || 0)}</span>
                <span>•</span>
                <span>${reviewer}</span>
                ${createdAt ? `<span style="margin-inline-start:auto;">${createdAt}</span>` : ''}
              </div>
              <div>${safeText}</div>
            </div>
          `;
        }).join('') || '<div style="color: var(--text-muted);">لا توجد تقييمات بعد.</div>';
      }

      async function fetchReviews() {
        try {
          reviewsCountEl.textContent = 'جار تحميل آراء الزوار...';
          const response = await fetch('/api/reviews', { cache: 'no-store' });
          if (!response.ok) throw new Error('failed');
          const data = await response.json();
          const reviews = Array.isArray(data.reviews) ? data.reviews : [];
          const average = Number.isFinite(data.average) ? data.average : 0;
          const count = Number.isFinite(data.count) ? data.count : reviews.length;
          state = { reviews, average, count };
          refreshUI();
        } catch (error) {
          console.warn('⚠️ تعذر تحميل التقييمات:', error);
          state = { reviews: [], average: 0, count: 0 };
          refreshUI('تعذر تحميل التقييمات حالياً.');
        }
      }

      async function submitReview(rating, text, name) {
        const payload = { rating, text, name };
        const response = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || 'review_failed');
        }
        const data = await response.json();
        const reviews = Array.isArray(state.reviews) ? [...state.reviews, data.review] : [data.review];
        const average = Number.isFinite(data.average) ? data.average : state.average;
        const count = Number.isFinite(data.count) ? data.count : reviews.length;
        state = { reviews, average, count };
        refreshUI();
      }

      // Build interactive stars
      for (let i = 1; i <= 5; i++) {
        const b = document.createElement('button');
        b.setAttribute('type', 'button');
        b.textContent = '★';
        b.addEventListener('click', () => {
          selected = i;
          [...starInput.children].forEach((el, idx) => el.classList.toggle('active', idx < i));
        });
        b.className = 'active';
        starInput.appendChild(b);
      }

      submitBtn.addEventListener('click', async () => {
        if (isSubmitting) return;
        const text = reviewTextEl.value.trim();
        const name = reviewNameEl.value.trim();
        const rating = selected;
        if (!rating || !text) {
          alert('يرجى اختيار تقييم وكتابة تجربتك بإيجاز.');
          return;
        }
        try {
          isSubmitting = true;
          setLoading(true);
          await submitReview(rating, text, name);
          reviewTextEl.value = '';
          reviewNameEl.value = '';
          alert('✅ تم تسجيل تقييمك، شكراً لك!');
        } catch (error) {
          console.warn('⚠️ تعذر حفظ التقييم:', error);
          alert('تعذر حفظ التقييم حالياً. حاول مرة أخرى لاحقاً.');
        } finally {
          isSubmitting = false;
          setLoading(false);
        }
      });

      fetchReviews();
  }

  // VISITORS: Log visits locally with timestamp and country (via ipwho.is)
  const VISITOR_LOG_KEY = 'mishkat-visitor-log';
  function getVisitorLogs() {
    try { return JSON.parse(localStorage.getItem(VISITOR_LOG_KEY) || '[]'); } catch { return []; }
  }
  function setVisitorLogs(list) {
    localStorage.setItem(VISITOR_LOG_KEY, JSON.stringify(list));
  }
  async function detectVisitorInfo() {
    try {
      const res = await fetch('https://ipwho.is/?lang=ar');
      const data = await res.json();
      if (!data || data.success === false) throw new Error('geo failed');
      const countryName = data.country || 'غير معروف';
      const countryCode = data.country_code || '';
      const city = data.city || '';
      const flag = data.flag && data.flag.emoji ? data.flag.emoji : '';
      const ip = data.ip || '';
      return { countryName, countryCode, city, flag, ip };
    } catch {
      return { countryName: 'غير معروف', countryCode: '', city: '', flag: '', ip: '' };
    }
  }
  function formatDateTime(iso) {
    try { return new Date(iso).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return iso; }
  }
  function renderVisitors(sectionEl) {
    const logs = getVisitorLogs();
    const latest = logs.slice(-8).reverse();
    const chipsHtml = latest.map(item => `
      <span class="visitor-chip" title="${item.city ? item.city + ' • ' : ''}${item.countryName}">
        <span class="flag">${item.flag || '🌍'}</span>
        <span>${item.countryName}</span>
      </span>
    `).join('');
    sectionEl.querySelector('#visitorChips').innerHTML = chipsHtml || '<span style="color:var(--text-muted)">لا توجد زيارات بعد</span>';
    const rowsHtml = logs.slice().reverse().map(item => `
      <tr>
        <td>${formatDateTime(item.timestamp)}</td>
        <td>${item.countryName}${item.city ? ' — ' + item.city : ''}</td>
      </tr>
    `).join('');
    sectionEl.querySelector('#visitorsTableBody').innerHTML = rowsHtml || '<tr><td colspan="2" style="color:var(--text-muted); text-align:center; padding:12px;">لا توجد بيانات</td></tr>';
    const count = logs.length;
    sectionEl.querySelector('#visitorsCount').textContent = count ? `${count} زيارة مسجلة محلياً` : 'لا توجد زيارات مسجلة بعد';
  }
  function initVisitorsSectionIfNeeded() {
    const onIndex = document.title.includes('قسم التقنية');
    if (!onIndex) return;
    if (document.querySelector('.visitors-section')) return;

    const container = document.getElementById('mainContent');
    if (!container) return;
    const footer = container.querySelector('footer');

    const section = document.createElement('section');
    section.className = 'visitors-section';
    section.innerHTML = `
      <div class="visitors-header">
        <h2 style="margin:0;">👣 سجل الزوار</h2>
        <div class="visitors-meta" id="visitorsCount"></div>
      </div>
      <div class="visitor-chips" id="visitorChips"></div>
      <div style="overflow:auto; border-radius: 10px;">
        <table class="visitors-table" aria-label="سجل الزوار">
          <thead>
            <tr>
              <th style="width: 40%;">التاريخ والوقت</th>
              <th>الدولة / المدينة</th>
            </tr>
          </thead>
          <tbody id="visitorsTableBody"></tbody>
        </table>
      </div>
      <div style="color: var(--text-muted); font-size: .85rem; margin-top:8px;">
        يتم حفظ السجل محلياً على جهازك فقط. لعرض جميع الزوار عبر الموقع، نحتاج إلى ربط قاعدة بيانات لاحقاً.
      </div>
    `;
    container.insertBefore(section, footer);

    // Initial render from existing local data
    renderVisitors(section);

    // Record this visit then refresh
    (async () => {
      const info = await detectVisitorInfo();
      const logs = getVisitorLogs();
      logs.push({ timestamp: new Date().toISOString(), ...info });
      const MAX = 100;
      const trimmed = logs.slice(-MAX);
      setVisitorLogs(trimmed);
      renderVisitors(section);
    })();
  }

  // MISHKAT: Simple image gallery section with local persistence
  const MISHKAT_GALLERY_KEY = 'mishkat-gallery-images';
  function getMishkatImages() {
    try { return JSON.parse(localStorage.getItem(MISHKAT_GALLERY_KEY) || '[]'); } catch { return []; }
  }
  function setMishkatImages(list) {
    localStorage.setItem(MISHKAT_GALLERY_KEY, JSON.stringify(list));
  }
  function initMishkatSectionIfNeeded() {
    const onIndex = document.title.includes('قسم التقنية');
    if (!onIndex) return;
    if (document.querySelector('.mishkat-section')) return;

    const container = document.getElementById('mainContent');
    if (!container) return;
    const header = container.querySelector('header');

    const section = document.createElement('section');
    section.className = 'mishkat-section';
    section.innerHTML = `
      <div class="mishkat-header">
        <h2 style="margin:0;">🖼️ المشكاة</h2>
        <div class="mishkat-actions">
          <label class="mishkat-add" for="mishkatFileInput">إضافة صور</label>
          <input id="mishkatFileInput" class="mishkat-file" type="file" accept="image/*" multiple />
        </div>
      </div>
      <div class="mishkat-drop" id="mishkatDrop">اسحب الصور هنا أو اضغط <strong>إضافة صور</strong></div>
      <div class="mishkat-grid" id="mishkatGrid"></div>
      <div style="color: var(--text-muted); font-size: .85rem; margin-top:8px;">يمكنك إضافة الصور من جهازك، تُحفظ محلياً في المتصفح.</div>
    `;
    if (header && header.parentNode) {
      header.parentNode.insertBefore(section, header.nextSibling);
    } else {
      const footer = container.querySelector('footer');
      container.insertBefore(section, footer);
    }

    const grid = section.querySelector('#mishkatGrid');
    const drop = section.querySelector('#mishkatDrop');
    const fileInput = section.querySelector('#mishkatFileInput');

    function render() {
      const images = getMishkatImages();
      grid.innerHTML = images.map(img => `
        <div class="mishkat-item" data-id="${img.id}">
          <img src="${img.dataUrl}" alt="صورة من قسم المشكاة" />
          <button class="mishkat-remove" type="button" aria-label="حذف">حذف</button>
        </div>
      `).join('');
    }

    grid.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.classList.contains('mishkat-remove')) {
        const parent = target.closest('.mishkat-item');
        if (!parent) return;
        const id = parent.getAttribute('data-id');
        const list = getMishkatImages().filter(item => item.id !== id);
        setMishkatImages(list);
        render();
      }
    });

    async function handleFiles(files) {
      const listFiles = Array.from(files || []);
      if (!listFiles.length) return;
      const MAX_SIZE = 2.5 * 1024 * 1024; // ~2.5MB per image
      const imageFiles = listFiles.filter(f => f.type.startsWith('image/'));
      const oversized = imageFiles.filter(f => f.size > MAX_SIZE);
      if (oversized.length) {
        alert('بعض الصور كبيرة جداً (> 2.5MB)، تم تجاهلها.');
      }
      const okFiles = imageFiles.filter(f => f.size <= MAX_SIZE);
      const readAsDataURL = (file) => new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = reject;
        fr.readAsDataURL(file);
      });
      try {
        const dataUrls = await Promise.all(okFiles.map(readAsDataURL));
        const list = getMishkatImages();
        const newItems = dataUrls.map((dataUrl, idx) => ({ id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2,8)}`, dataUrl }));
        const combined = list.concat(newItems).slice(-48);
        setMishkatImages(combined);
        render();
      } catch {}
    }

    fileInput.addEventListener('change', async () => {
      await handleFiles(fileInput.files);
      fileInput.value = '';
    });

    drop.addEventListener('dragover', (e) => {
      e.preventDefault();
      drop.classList.add('active');
    });
    drop.addEventListener('dragleave', () => drop.classList.remove('active'));
    drop.addEventListener('drop', async (e) => {
      e.preventDefault();
      drop.classList.remove('active');
      await handleFiles(e.dataTransfer && e.dataTransfer.files);
    });

    render();
  }

  // Inject the school logo in a fixed position across all pages
  function injectSchoolLogoFixed() {
    try {
      // إذا الصفحة تحتوي بالفعل على عنصر شعار داخل الواجهة فلا نكرر
      if (document.querySelector('.school-logo, .school-logo-fixed')) return;
      const img = document.createElement('img');
      img.className = 'school-logo-fixed';
      img.src = '/assets/logo.svg';
      img.alt = 'شعار مدارس المشكاة';
      img.decoding = 'async';
      img.loading = 'eager';
      // في حال فشل التحميل، لا نعرض شيء بدلاً من نص مكسور
      img.addEventListener('error', () => img.remove());
      document.body.appendChild(img);
    } catch {}
  }

  // Boot new features
  initTheme();
  injectTechLogoIfNeeded();
  initReviewsSectionIfNeeded();
  initMishkatSectionIfNeeded();
  injectSchoolLogoFixed();
})();
