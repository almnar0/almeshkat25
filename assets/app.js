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
})();
