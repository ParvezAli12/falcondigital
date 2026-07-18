/* ============================================================
   FALCONS DIGITAL — Main JS
   Cursor, navbar, hamburger, smooth scroll
   ============================================================ */

window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  if (loader) {
    loader.style.transition = 'opacity 0.5s ease';
    loader.style.opacity = '0';
    setTimeout(() => { loader.style.display = 'none'; }, 500);
  }
});

/* ── CUSTOM CURSOR ── */
(function initCursor() {
  const cursor = document.getElementById('cursor');
  if (!cursor) return;
  const dot  = cursor.querySelector('.cur-dot');
  const ring = cursor.querySelector('.cur-ring');
  let mx = 0, my = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  });

  (function animRing() {
    rx += (mx - rx) * 0.1;
    ry += (my - ry) * 0.1;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(animRing);
  })();

  document.querySelectorAll('a, button, .svc-row, .pillar, .rcard, .price-card, .value-card').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('cursor-hover'));
  });

  document.addEventListener('mouseleave', () => cursor.style.opacity = '0');
  document.addEventListener('mouseenter', () => cursor.style.opacity = '1');
})();

/* ── NAVBAR SCROLL ── */
(function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
})();

/* ── HAMBURGER ── */
(function initHamburger() {
  const btn  = document.getElementById('hamburger');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;

  btn.addEventListener('click', () => {
    btn.classList.toggle('open');
    menu.classList.toggle('open');
    document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
  });

  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      btn.classList.remove('open');
      menu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
})();

/* ── SMOOTH SCROLL (same-page anchors only) ── */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

/* ── STAR PICKER (used on review form, index.html only) ── */
(function initStarPicker() {
  const stars = document.querySelectorAll('.sp-star');
  if (!stars.length) return;
  const label = document.getElementById('rating-label');
  let selected = 0;
  const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'];

  stars.forEach(star => {
    star.addEventListener('mouseenter', () => {
      const val = parseInt(star.dataset.val);
      stars.forEach(s => s.classList.toggle('hovered', parseInt(s.dataset.val) <= val));
      if (label) label.textContent = labels[val];
    });
    star.addEventListener('mouseleave', () => {
      stars.forEach(s => {
        s.classList.remove('hovered');
        s.classList.toggle('selected', parseInt(s.dataset.val) <= selected);
      });
      if (label) label.textContent = selected ? labels[selected] : 'Click to rate';
    });
    star.addEventListener('click', () => {
      selected = parseInt(star.dataset.val);
      window.selectedRating = selected;
      stars.forEach(s => s.classList.toggle('selected', parseInt(s.dataset.val) <= selected));
      if (label) label.textContent = labels[selected];
    });
  });
})();

/* ── CHAR COUNTER (review form) ── */
(function initCharCount() {
  const textarea = document.getElementById('rv-text');
  const counter  = document.getElementById('char-count');
  if (!textarea || !counter) return;
  textarea.addEventListener('input', () => {
    counter.textContent = textarea.value.length;
  });
})();
