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
    const links = ['project1.html', 'project3.html', 'project5.html', 'project7.html'];
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

  // THEME: CSS variables, palette overrides, toggle UI, and dynamic meta theme-color
  function injectThemeStyles() {
    if (document.getElementById('theme-styles')) return;
    const style = document.createElement('style');
    style.id = 'theme-styles';
    style.textContent = `
      :root[data-theme="light"] {
        --bg: #f7f8fb;
        --bg-secondary: #ffffff;
        --text: #0f172a;
        --text-muted: #475569;
        --primary: #6366f1; /* indigo-500 */
        --primary-2: #8b5cf6; /* violet-500 */
        --card-bg: #ffffff;
        --card-border: #e5e7eb;
        --surface: #f1f5f9;
        --tag-bg: #eef2ff;
        --tag-text: #4f46e5;
        --shadow-1: rgba(15, 23, 42, 0.08);
        --shadow-2: rgba(15, 23, 42, 0.15);
        --theme-color: #6366f1;
      }

      :root[data-theme="dark"] {
        --bg: #0b1021;
        --bg-secondary: #0f172a;
        --text: #e5e7eb;
        --text-muted: #94a3b8;
        --primary: #8b9dfc;
        --primary-2: #b28dfc;
        --card-bg: #111827;
        --card-border: #1f2937;
        --surface: #0b1324;
        --tag-bg: #1f2937;
        --tag-text: #c7d2fe;
        --shadow-1: rgba(0, 0, 0, 0.45);
        --shadow-2: rgba(0, 0, 0, 0.6);
        --theme-color: #0b1324;
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
      .project-card, .panel, .main-section, .modal-content, .game-container, .report-card, .stat-card, .book-card, .attendance-item, .notification-item {
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
      .tag, .book-status, .status-badge {
        background: var(--tag-bg) !important;
        color: var(--tag-text) !important;
        border: 0 !important;
      }

      /* Theme toggle control */
      .theme-toggle {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 2000;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: var(--card-bg);
        color: var(--text);
        border: 1px solid var(--card-border);
        border-radius: 999px;
        padding: 8px 12px;
        box-shadow: 0 6px 18px var(--shadow-1);
        cursor: pointer;
        user-select: none;
      }
      .theme-toggle:hover { box-shadow: 0 10px 26px var(--shadow-2); }
      .theme-toggle .icon { font-size: 1.1rem; }
      .theme-toggle .label { font-weight: 700; font-size: 0.95rem; }

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

  function applyTheme(theme) {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem('siteTheme', theme);
    updateThemeColorMeta();
  }

  function detectInitialTheme() {
    const saved = localStorage.getItem('siteTheme');
    if (saved === 'light' || saved === 'dark') return saved;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  function createThemeToggle() {
    if (document.querySelector('.theme-toggle')) return;
    const btn = document.createElement('button');
    btn.className = 'theme-toggle';
    const icon = document.createElement('span');
    icon.className = 'icon';
    const label = document.createElement('span');
    label.className = 'label';

    function sync() {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      icon.textContent = isDark ? '🌙' : '☀️';
      label.textContent = isDark ? 'ليلي' : 'نهاري';
    }

    btn.appendChild(icon);
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark');
      sync();
    });
    document.body.appendChild(btn);
    sync();
  }

  function initTheme() {
    injectThemeStyles();
    applyTheme(detectInitialTheme());
    createThemeToggle();
    if (window.matchMedia) {
      try {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          const saved = localStorage.getItem('siteTheme');
          if (!saved) {
            applyTheme(e.matches ? 'dark' : 'light');
          }
        });
      } catch {}
    }
  }

  // TECH LOGO: Inject animated logo on main index page header
  function injectTechLogoIfNeeded() {
    const onIndex = document.title.includes('قسم التقنية');
    if (!onIndex) return;
    const header = document.querySelector('header');
    if (!header) return;
    if (header.querySelector('.tech-logo')) return;
    const logo = document.createElement('div');
    logo.className = 'tech-logo';
    logo.setAttribute('aria-label', 'Tech');
    logo.innerHTML = `
      <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="tl-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="var(--primary)"/>
            <stop offset="100%" stop-color="var(--primary-2)"/>
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="40" fill="none" stroke="url(#tl-grad)" stroke-width="6" class="pulse" />
        <g class="orbit">
          <circle cx="60" cy="20" r="6" fill="url(#tl-grad)"/>
          <circle cx="95" cy="70" r="5" fill="url(#tl-grad)"/>
          <circle cx="25" cy="70" r="5" fill="url(#tl-grad)"/>
        </g>
        <path d="M45 55 h30 M60 40 v40" stroke="url(#tl-grad)" stroke-width="6" stroke-linecap="round"/>
      </svg>
    `;
    header.insertBefore(logo, header.firstChild);
  }

  // REVIEWS: Star rating + testimonials stored in localStorage
  const REVIEWS_KEY = 'mishkat-tech-reviews';
  function getReviews() {
    try { return JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]'); } catch { return []; }
  }
  function setReviews(list) {
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(list));
  }

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

    // Build interactive stars
    const starInput = section.querySelector('#starInput');
    let selected = 5;
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

    function refresh() {
      const reviews = getReviews();
      const count = reviews.length;
      const avg = count ? (reviews.reduce((a, r) => a + (r.rating || 0), 0) / count) : 0;
      section.querySelector('#avgScore').textContent = avg.toFixed(1);
      section.querySelector('#avgStars').textContent = renderStars(avg);
      section.querySelector('#reviewsCount').textContent = count ? `${count} تقييم` : 'لا توجد تقييمات بعد';
      const list = section.querySelector('#reviewsList');
      list.innerHTML = reviews.slice().reverse().map(r => `
        <div class="review-item">
          <div class="meta">
            <span>${renderStars(r.rating)}</span>
            <span>•</span>
            <span>${r.name ? r.name : 'مستخدم'}</span>
            <span style="margin-inline-start:auto;">${new Date(r.date).toLocaleDateString('ar-SA')}</span>
          </div>
          <div>${(r.text || '').replace(/</g, '&lt;')}</div>
        </div>
      `).join('');
    }

    section.querySelector('#submitReview').addEventListener('click', () => {
      const text = section.querySelector('#reviewText').value.trim();
      const name = section.querySelector('#reviewName').value.trim();
      const rating = selected;
      if (!rating || !text) {
        alert('يرجى اختيار تقييم وكتابة تجربتك بإيجاز.');
        return;
      }
      const reviews = getReviews();
      reviews.push({ rating, text, name, date: new Date().toISOString() });
      setReviews(reviews);
      section.querySelector('#reviewText').value = '';
      section.querySelector('#reviewName').value = '';
      refresh();
      alert('✅ تم حفظ تقييمك محلياً، شكراً لمشاركتك!');
    });

    // Seed one sample review if none exist to demonstrate UI
    if (getReviews().length === 0) {
      setReviews([
        { rating: 5, text: 'تجربة رائعة ومفيدة جداً، تصميم مرتب وألوان جميلة!', name: 'زائر', date: new Date().toISOString() }
      ]);
    }
    refresh();
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

  // Boot new features
  initTheme();
  injectTechLogoIfNeeded();
  initReviewsSectionIfNeeded();
  initVisitorsSectionIfNeeded();
})();
