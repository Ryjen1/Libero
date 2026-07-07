/**
 * Libero Marketing Site — Scroll animations & interactions
 */

// ── Scroll Reveal ──────────────────────────────────────────────────────

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.feature-card, .step, .stack-card, .pred-card-demo, .download__card').forEach(el => {
  el.classList.add('fade-up');
  observer.observe(el);
});

// ── Smooth scroll for nav links ────────────────────────────────────────

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ── Nav background on scroll ───────────────────────────────────────────

const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    nav.style.borderBottomColor = 'rgba(27, 51, 37, 0.5)';
  } else {
    nav.style.borderBottomColor = '';
  }
});
