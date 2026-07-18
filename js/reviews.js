/* ============================================================
   FALCONS DIGITAL — Review System
   ============================================================ */

// ── DEFAULT REVIEWS (show on fresh load) ──────────────────
const defaultReviews = [];

function getReviews() {
  const stored = localStorage.getItem('fd_reviews');
  if (!stored) {
    localStorage.setItem('fd_reviews', JSON.stringify([]));
    return [];
  }
  return JSON.parse(stored);
}

// ── STORAGE ───────────────────────────────────────────────
function getReviews() {
  const stored = localStorage.getItem('fd_reviews');
  if (!stored) {
    localStorage.setItem('fd_reviews', JSON.stringify(defaultReviews));
    return defaultReviews;
  }
  return JSON.parse(stored);
}
function saveReviews(data) {
  localStorage.setItem('fd_reviews', JSON.stringify(data));
}

// ── HELPERS ───────────────────────────────────────────────
const avatarColors = [
  'linear-gradient(135deg,#0057FF,#00D68F)',
  'linear-gradient(135deg,#FFB800,#FF6B35)',
  'linear-gradient(135deg,#9B59B6,#0057FF)',
  'linear-gradient(135deg,#00D68F,#0057FF)',
  'linear-gradient(135deg,#FF4560,#FFB800)',
  'linear-gradient(135deg,#0057FF,#9B59B6)',
];

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return avatarColors[hash % avatarColors.length];
}

function starsHTML(rating) {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-PK', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

// ── RENDER STARS BAR CHART ────────────────────────────────
function renderRatingBars(reviews) {
  const approved = reviews.filter(r => r.approved);
  const total = approved.length;
  const bars = document.getElementById('rating-bars');
  if (!bars) return;

  if (total === 0) {
    bars.innerHTML = '';
    return;
  }

  // Count per star
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  approved.forEach(r => counts[r.rating] = (counts[r.rating] || 0) + 1);

  bars.innerHTML = [5, 4, 3, 2, 1].map(star => {
    const count = counts[star] || 0;
    const pct   = total ? Math.round((count / total) * 100) : 0;
    return `
      <div class="or-bar-row">
        <span class="or-bar-label">${star}</span>
        <div class="or-bar-track">
          <div class="or-bar-fill" style="width:${pct}%"></div>
        </div>
        <span class="or-bar-count">${count}</span>
      </div>`;
  }).join('');
}

// ── UPDATE OVERALL SCORE ──────────────────────────────────
function updateOverallScore(reviews) {
  const approved = reviews.filter(r => r.approved);
  const total    = approved.length;
  const avg      = total
    ? (approved.reduce((s, r) => s + r.rating, 0) / total).toFixed(1)
    : '0.0';

  const scoreEl = document.getElementById('avg-score');
  const starsEl = document.getElementById('avg-stars');
  const countEl = document.getElementById('review-count');

  if (scoreEl) scoreEl.textContent = avg;
  if (starsEl) starsEl.textContent = starsHTML(Math.round(parseFloat(avg)));
  if (countEl) countEl.textContent = `Based on ${total} review${total !== 1 ? 's' : ''}`;

  renderRatingBars(reviews);
}

// ── RENDER REVIEW CARDS ───────────────────────────────────
let visibleCount = 6;

function renderReviews() {
  const reviews  = getReviews();
  const approved = reviews.filter(r => r.approved);
  const grid     = document.getElementById('reviews-grid');
  const moreBtn  = document.getElementById('reviews-more');
  if (!grid) return;

  updateOverallScore(reviews);

  if (!approved.length) {
    grid.innerHTML = `
      <div class="reviews-empty">
        <div class="reviews-empty-icon">💬</div>
        <p>No reviews yet. Be the first to share your experience!</p>
      </div>`;
    if (moreBtn) moreBtn.style.display = 'none';
    return;
  }

  // Sort: featured first, then by date newest
  const sorted = [...approved].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return new Date(b.date) - new Date(a.date);
  });

  const visible = sorted.slice(0, visibleCount);

  grid.innerHTML = visible.map((r, i) => `
    <div class="rcard ${r.featured ? 'rcard-featured' : ''}" style="animation-delay:${i * 0.08}s">
      <div class="rc-top">
        <div class="rc-stars">${starsHTML(r.rating)}</div>
        ${r.service ? `<div class="rc-service">${r.service}</div>` : ''}
      </div>
      <p class="rc-quote">${r.text}</p>
      <div class="rc-author">
        <div class="rc-av" style="background:${getAvatarColor(r.name)}">${getInitials(r.name)}</div>
        <div>
          <div class="rc-name">${r.name}</div>
          ${r.role ? `<div class="rc-role">${r.role}</div>` : ''}
          <div class="rc-date">${formatDate(r.date)}</div>
          <div class="rc-verified">✓ Verified Client</div>
        </div>
      </div>
    </div>`).join('');

  if (moreBtn) {
    moreBtn.style.display = sorted.length > visibleCount ? 'block' : 'none';
  }
}

function loadMoreReviews() {
  visibleCount += 6;
  renderReviews();
}

// ── STAR PICKER ───────────────────────────────────────────
let selectedRating = 0;

(function initStarPicker() {
  const stars  = document.querySelectorAll('.sp-star');
  const label  = document.getElementById('rating-label');
  const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'];

  stars.forEach(star => {
    star.addEventListener('mouseenter', () => {
      const val = parseInt(star.dataset.val);
      stars.forEach(s => {
        s.classList.toggle('hovered', parseInt(s.dataset.val) <= val);
        s.classList.remove('selected');
      });
      if (label) label.textContent = labels[val];
    });

    star.addEventListener('mouseleave', () => {
      stars.forEach(s => {
        s.classList.remove('hovered');
        s.classList.toggle('selected', parseInt(s.dataset.val) <= selectedRating);
      });
      if (label) label.textContent = selectedRating ? labels[selectedRating] : 'Click to rate';
    });

    star.addEventListener('click', () => {
      selectedRating = parseInt(star.dataset.val);
      stars.forEach(s => {
        s.classList.toggle('selected', parseInt(s.dataset.val) <= selectedRating);
        s.classList.remove('hovered');
      });
      if (label) label.textContent = labels[selectedRating];
    });
  });
})();

// ── CHARACTER COUNTER ─────────────────────────────────────
(function initCharCount() {
  const textarea  = document.getElementById('rv-text');
  const charCount = document.getElementById('char-count');
  if (!textarea || !charCount) return;

  textarea.addEventListener('input', () => {
    charCount.textContent = textarea.value.length;
    charCount.style.color = textarea.value.length > 450
      ? 'var(--gold)' : 'var(--gray)';
  });
})();

// ── SUBMIT REVIEW ─────────────────────────────────────────
function submitReview() {
  const name    = document.getElementById('rv-name')?.value.trim();
  const role    = document.getElementById('rv-role')?.value.trim();
  const service = document.getElementById('rv-service')?.value;
  const text    = document.getElementById('rv-text')?.value.trim();
  const success = document.getElementById('wr-success');
  const form    = document.querySelector('.wr-form');

  // Validate
  if (!name) { shakeField('rv-name'); return; }
  if (!selectedRating) { shakeField('star-picker'); alert('Please select a star rating.'); return; }
  if (!text || text.length < 20) { shakeField('rv-text'); alert('Please write at least 20 characters.'); return; }

  const reviews = getReviews();
  const newReview = {
    id:       'r_' + Date.now(),
    name,
    role:     role || '',
    service:  service || '',
    rating:   selectedRating,
    text,
    date:     new Date().toISOString().slice(0, 10),
    approved: false,  // needs owner approval
    featured: false
  };

  reviews.push(newReview);
  saveReviews(reviews);

  // Show success, hide form fields
  if (form) {
    const fields = form.querySelectorAll('.wr-form-row, .wr-rating-wrap, .full-width, .wr-actions');
    fields.forEach(el => { el.style.display = 'none'; });
  }
  if (success) success.classList.add('show');

  // Reset
  selectedRating = 0;
  ['rv-name','rv-role','rv-text'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('rv-service').selectedIndex = 0;
  document.querySelectorAll('.sp-star').forEach(s => s.classList.remove('selected','hovered'));
  document.getElementById('char-count').textContent = '0';
}

function shakeField(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.animation = 'shake 0.4s ease';
  setTimeout(() => el.style.animation = '', 400);
}

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderReviews();
});
