/**
 * ═══════════════════════════════════════════════════════════
 * EVERESTIA VENTURES LLC — MAIN JAVASCRIPT MODULE
 * Version: 2.0.0 | Modular Architecture
 * Author: Antigravity (Google DeepMind)
 *
 * Module Index:
 *   1.  Loader            — Preloader with animated percentage counter
 *   2.  HeroText          — Split-letter character reveal animation
 *   3.  HeroParticles     — Connected node canvas particle network
 *   4.  Navigation        — Scroll-solidify nav + mobile menu drawer
 *   5.  CardTilt3D        — 3D perspective tilt on service cards
 *   6.  MagneticButtons   — Magnetic cursor-pull on CTA buttons
 *   7.  ScrollReveal      — IntersectionObserver fade/slide reveals
 *   8.  CounterAnimator   — Intersection-triggered number count-up
 *   9.  ExplodeParticles  — Click burst particle effect on CTAs
 *   10. TrackingForm      — Isolated tracking form handler (AJAX-ready)
 *   11. QuoteForm         — Multi-step quote form with validation
 *   12. SmoothScroll      — Anchor link smooth-scroll polyfill
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

/**
 * Backend API base URL — set window.EVERESTIA_API before main.js loads to override.
 * Example: <script>window.EVERESTIA_API='http://localhost:5000';</script>
 */
const API_BASE = (window.EVERESTIA_API || 'http://localhost:5000').replace(/\/$/, '');

/* ── Utility: detect touch / reduced-motion preferences ── */
const isTouchDevice = () =>
  window.matchMedia('(hover: none) and (pointer: coarse)').matches;

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Apply document-level classes for CSS/JS behavior hooks */
function applyDeviceClasses() {
  document.body.classList.toggle('touch-device', isTouchDevice());
  document.body.classList.toggle('reduced-motion', prefersReducedMotion());
}

/* ── Utility: debounce ── */
const debounce = (fn, delay = 150) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

/**
 * escapeHtml — sanitizes a value before injecting into innerHTML.
 *
 * WHY THIS EXISTS:
 *   TrackingForm injects the user-supplied tracking ID and server-
 *   returned fields (trackingId, status, currentLocation) directly
 *   into element.innerHTML. Without escaping:
 *     - A crafted input like <img src=x onerror=alert(1)> would
 *       execute JavaScript in the user's browser (stored XSS if the
 *       server echoes it, or self-XSS from the input field).
 *     - A compromised or misconfigured API returning malicious data
 *       would also execute in the page context.
 *
 *   This function converts the five HTML special characters into their
 *   named entity equivalents so the browser renders them as text, not markup.
 *
 * @param {*} value - Any value; coerced to string before escaping.
 * @returns {string} HTML-safe string.
 */
function escapeHtml(value) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;');
}



/* ═══════════════════════════════════════════
   2. HERO TEXT — SPLIT LETTER REVEAL
   Splits each word in .split-word elements
   into individual <span> characters with
   staggered CSS animation delays.
═══════════════════════════════════════════ */
const HeroText = {
  init() {
    document.querySelectorAll('.split-word').forEach((el, wordIndex) => {
      const word = el.dataset.word || '';

      const chars = [...word].map((char, charIndex) => {
        const delay = 0.2 + wordIndex * 0.15 + charIndex * 0.04;
        return `<span class="split-char" style="animation-delay:${delay}s">${
          char === ' ' ? '&nbsp;' : char
        }</span>`;
      });

      el.innerHTML = chars.join('');
    });
  }
};





/* ═══════════════════════════════════════════
   5. HERO PARTICLES — CONNECTED NODE NETWORK
   Renders 100 floating particles on a canvas.
   Particles within 130px are connected by lines.
═══════════════════════════════════════════ */
const HeroParticles = {
  canvas: null,
  ctx:    null,
  pts:    [],
  rafId:  null,
  COUNT:  100,
  LINK_DIST: 130,

  init() {
    this.canvas = document.getElementById('hero-canvas');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this._resize();
    this._createPoints();

    window.addEventListener('resize', debounce(() => {
      this._resize();
      this._createPoints();
    }));

    this._draw();
  },

  _resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  _createPoints() {
    const { width: w, height: h } = this.canvas;
    this.pts = Array.from({ length: this.COUNT }, () => ({
      x:  Math.random() * w,
      y:  Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r:  Math.random() * 1.8 + 0.4,
      a:  Math.random() * 0.5 + 0.1
    }));
  },

  _draw() {
    const ctx = this.ctx;
    const { width: w, height: h } = this.canvas;
    const DIST = this.LINK_DIST;

    ctx.clearRect(0, 0, w, h);

    this.pts.forEach((p) => {
      // Move
      p.x += p.vx;
      p.y += p.vy;

      // Bounce off walls
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      // Draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(232, 98, 10, ${p.a})`;
      ctx.fill();
    });

    // Draw connecting lines between nearby particles
    const pts = this.pts;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);

        if (d < DIST) {
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = `rgba(232, 98, 10, ${0.12 * (1 - d / DIST)})`;
          ctx.lineWidth   = 0.7;
          ctx.stroke();
        }
      }
    }

    this.rafId = requestAnimationFrame(() => this._draw());
  }
};


/* ═══════════════════════════════════════════
   6. NAVIGATION
   - Adds `.solid` class (backdrop blur + border)
     when user scrolls past 60px.
   - Mobile hamburger toggling.
═══════════════════════════════════════════ */
const Navigation = {
  nav:         null,
  hamburger:   null,
  mobileMenu:  null,
  mobileLinks: null,
  isOpen:      false,

  init() {
    this.nav        = document.getElementById('nav');
    this.hamburger  = document.getElementById('hamburger');
    this.mobileMenu = document.getElementById('mobile-menu');
    this.mobileLinks = document.querySelectorAll('.mobile-nav-links a, .mobile-cta');

    if (!this.nav) return;

    // Scroll solidify
    window.addEventListener('scroll', () => {
      this.nav.classList.toggle('solid', window.scrollY > 60);
    }, { passive: true });

    // Mobile menu toggle
    if (this.hamburger && this.mobileMenu) {
      this.hamburger.addEventListener('click', () => this._toggleMenu());

      // Close on link click
      this.mobileLinks.forEach((link) => {
        link.addEventListener('click', () => this._closeMenu());
      });

      // Close on Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) this._closeMenu();
      });
    }
  },

  _toggleMenu() {
    this.isOpen ? this._closeMenu() : this._openMenu();
  },

  _openMenu() {
    this.isOpen = true;
    this.hamburger.classList.add('open');
    this.hamburger.setAttribute('aria-expanded', 'true');
    this.mobileMenu.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
  },

  _closeMenu() {
    this.isOpen = false;
    this.hamburger.classList.remove('open');
    this.hamburger.setAttribute('aria-expanded', 'false');
    this.mobileMenu.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }
};


/* ═══════════════════════════════════════════
   7. 3D CARD TILT
   Applies perspective rotateX/Y based on
   relative mouse position within each card.
   Includes the "Why Us" feature card too.
═══════════════════════════════════════════ */
const CardTilt3D = {
  INTENSITY: 12, // Max degrees of tilt

  init() {
    // Service cards
    document.querySelectorAll('.svc-card').forEach((card) => {
      card.addEventListener('mousemove', (e) => this._onMove(e, card, this.INTENSITY));
      card.addEventListener('mouseleave', () => this._onLeave(card));
    });

    // Why-Us visual card (subtler tilt)
    const whyCard = document.querySelector('.why-card');
    if (whyCard) {
      whyCard.addEventListener('mousemove', (e) => this._onMove(e, whyCard, 10));
      whyCard.addEventListener('mouseleave', () => {
        whyCard.style.transform = 'perspective(1000px) rotateY(-8deg) rotateX(4deg)';
      });
    }
  },

  _onMove(e, card, intensity) {
    const r  = card.getBoundingClientRect();
    const x  = (e.clientX - r.left) / r.width  - 0.5;
    const y  = (e.clientY - r.top)  / r.height - 0.5;
    card.style.transform = `perspective(1000px) rotateX(${-y * intensity}deg) rotateY(${x * intensity}deg) translateY(-12px)`;
  },

  _onLeave(card) {
    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
  }
};


/* ═══════════════════════════════════════════
   8. MAGNETIC BUTTONS
   Buttons gently pull towards the cursor
   when hovered — magnetic attraction effect.
   Resets on mouse leave.
═══════════════════════════════════════════ */
const MagneticButtons = {
  PULL_FACTOR: 0.28,

  init() {
    // FIX: Added .btn-ghost2 — it's a primary hero CTA and should have magnetic pull too.
    const selectors = '.btn-explode, .btn-ghost2, .mag-btn, .btn-step-next, .fsub';
    document.querySelectorAll(selectors).forEach((btn) => {
      btn.addEventListener('mousemove', (e) => this._onMove(e, btn));
      btn.addEventListener('mouseleave', () => this._onLeave(btn));
    });
  },

  _onMove(e, btn) {
    const r = btn.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width  / 2) * this.PULL_FACTOR;
    const y = (e.clientY - r.top  - r.height / 2) * this.PULL_FACTOR;
    btn.style.transform = `translate(${x}px, ${y}px) scale(1.05)`;
  },

  _onLeave(btn) {
    btn.style.transform = '';
  }
};


/* ═══════════════════════════════════════════
   9. SCROLL REVEAL
   Uses IntersectionObserver to add `.in`
   class when elements with .rv, .rv-l, .rv-r
   enter the viewport. Staggered for grouped items.
═══════════════════════════════════════════ */
const ScrollReveal = {
  THRESHOLD: 0.1,
  STAGGER_DELAY: 80, // ms between consecutive reveals

  init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          const delay = i * this.STAGGER_DELAY;
          setTimeout(() => entry.target.classList.add('in'), delay);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: this.THRESHOLD });

    document.querySelectorAll('.rv, .rv-l, .rv-r').forEach((el) => {
      observer.observe(el);
    });
  }
};


/* ═══════════════════════════════════════════
   10. COUNTER ANIMATOR
   Uses IntersectionObserver to trigger a
   number count-up on elements with [data-target].
   Supports optional [data-suffix] appended to end.
═══════════════════════════════════════════ */
const CounterAnimator = {
  DURATION: 1400, // ms to reach target

  init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.target.dataset.target) {
          this._countUp(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('[data-target]').forEach((el) => {
      observer.observe(el);
    });
  },

  _countUp(el) {
    const target = parseInt(el.dataset.target, 10);
    const suffix = el.dataset.suffix || '';
    const fps    = 60;
    const steps  = Math.round(this.DURATION / (1000 / fps));
    let   cur    = 0;
    let   frame  = 0;

    const interval = setInterval(() => {
      frame++;
      // Ease-out quad interpolation
      const progress = frame / steps;
      cur = Math.floor(target * (1 - Math.pow(1 - progress, 3)));

      el.textContent = cur < target
        ? cur.toLocaleString()
        : `${target.toLocaleString()}${suffix}`;

      if (frame >= steps) clearInterval(interval);
    }, 1000 / fps);
  }
};


/* ═══════════════════════════════════════════
   11. EXPLODE PARTICLES
   Fires a burst of colored circles on click
   of .btn-explode buttons.
═══════════════════════════════════════════ */
const ExplodeParticles = {
  COUNT:     18,
  RADIUS_MIN: 60,
  RADIUS_MAX: 80,
  DURATION:   700, // ms until removed

  init() {
    // FIX: Skip entire module when user prefers reduced motion.
    if (prefersReducedMotion()) return;

    document.querySelectorAll('.btn-explode').forEach((btn) => {
      btn.addEventListener('click', (e) => this._burst(e));
    });
  },

  _burst(e) {
    const cx = e.clientX;
    const cy = e.clientY;

    for (let i = 0; i < this.COUNT; i++) {
      const angle = (i / this.COUNT) * Math.PI * 2;
      const dist  = this.RADIUS_MIN + Math.random() * this.RADIUS_MAX;
      const size  = Math.random() * 8 + 4;
      const hue   = 20 + Math.random() * 30;
      const light = 50 + Math.random() * 20;

      const p = document.createElement('div');
      Object.assign(p.style, {
        position:      'fixed',
        left:          `${cx}px`,
        top:           `${cy}px`,
        width:         `${size}px`,
        height:        `${size}px`,
        borderRadius:  '50%',
        pointerEvents: 'none',
        zIndex:        '99999',
        background:    `hsl(${hue}, 100%, ${light}%)`,
        transform:     'translate(-50%, -50%)',
        animation:     `explodeOut ${this.DURATION}ms ease forwards`,
        willChange:    'transform, opacity'
      });

      p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);

      document.body.appendChild(p);
      setTimeout(() => p.remove(), this.DURATION);
    }
  }
};


/* ═══════════════════════════════════════════
   12. TRACKING FORM
   ─────────────────────────────────────────
   BACKEND INTEGRATION NOTE:
   This form is isolated for easy AJAX wiring.
   To connect, attach a 'submit' listener below
   and replace the placeholder response handler
   with your Fetch API / Axios call:

   trackingForm.addEventListener('submit', async (e) => {
     e.preventDefault();
     const trackingId = document.getElementById('trackingId').value;
     const res = await fetch('/api/track', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ trackingId })
     });
     const data = await res.json();
     // Handle: data.status, data.location, data.eta
   });
═══════════════════════════════════════════ */
const TrackingForm = {
  form:       null,
  input:      null,
  statusEl:   null,

  init() {
    this.form     = document.getElementById('tracking-form');
    this.input    = document.getElementById('trackingId');
    this.statusEl = document.getElementById('track-status');

    if (!this.form) return;

    this.form.addEventListener('submit', (e) => this._onSubmit(e));
  },

  async _onSubmit(e) {
    e.preventDefault();

    const id = this.input ? this.input.value.trim() : '';

    if (!id || id.length < 4) {
      this._showStatus('Please enter a valid tracking ID (minimum 4 characters).', 'error');
      return;
    }

    // SECURITY FIX: Escape the user-supplied tracking ID before injecting
    // into innerHTML. Without this, a crafted input containing HTML tags
    // would be interpreted as markup and could execute JavaScript.
    const safeId = escapeHtml(id);
    this._showStatus(`Searching for shipment <strong>${safeId}</strong>…`, 'loading');

    try {
      const res = await fetch(`${API_BASE}/api/track/${encodeURIComponent(id)}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        this._showStatus(
          `${json.message || 'No shipment found.'} ` +
          `Call <a href="tel:+16824641308" style="color:var(--color-orange)">+1 (682) 464-1308</a> for assistance.`,
          'error'
        );
        return;
      }

      const s   = json.data;
      const eta = s.estimatedDelivery
        ? new Date(s.estimatedDelivery).toLocaleDateString('en-US', {
            weekday: 'short',
            month:   'long',
            day:     'numeric',
          })
        : 'TBD';

      // SECURITY FIX: Escape ALL server-returned fields before injecting
      // into innerHTML. Even though these come from our own API, defense-
      // in-depth requires treating any externally-sourced data as untrusted.
      // If the database were compromised, malicious strings stored in
      // trackingId/status/currentLocation would otherwise execute as XSS.
      const safeTrackingId = escapeHtml(s.trackingId);
      const safeStatus     = escapeHtml(s.status);
      const safeLocation   = escapeHtml(s.currentLocation);

      this._showStatus(
        `<strong>${safeTrackingId}</strong> — <span style="color:var(--color-orange)">${safeStatus}</span><br>
        Location: ${safeLocation}<br>
        Est. delivery: ${eta}`,
        'success'
      );
    } catch (err) {
      console.error('[TrackingForm]', err);
      this._showStatus(
        `Unable to reach the tracking server. ` +
        `Call <a href="tel:+16824641308" style="color:var(--color-orange)">+1 (682) 464-1308</a>.`,
        'error'
      );
    }
  },

  _showStatus(html, type) {
    if (!this.statusEl) return;
    this.statusEl.innerHTML = html;
    this.statusEl.removeAttribute('hidden');
    this.statusEl.style.borderColor =
      type === 'error'   ? 'rgba(248,113,113,0.3)' :
      type === 'success' ? 'rgba(34,197,94,0.35)' :
      type === 'loading' ? 'rgba(255,255,255,0.1)' :
      'rgba(232,98,10,0.25)';
  }
};


/* ═══════════════════════════════════════════
   13. MULTI-STEP QUOTE FORM
   ─────────────────────────────────────────
   BACKEND INTEGRATION NOTE:
   On final submit, attach your Fetch API call:

   quoteForm.addEventListener('submit', async (e) => {
     e.preventDefault();
     const payload = {
       fullName:        document.getElementById('fullName').value,
       company:         document.getElementById('company').value,
       phone:           document.getElementById('phone').value,
       email:           document.getElementById('email').value,
       originCity:      document.getElementById('originCity').value,
       destinationCity: document.getElementById('destinationCity').value,
       serviceType:     document.getElementById('serviceType').value,
       weight:          document.getElementById('weight').value,
       pickupDate:      document.getElementById('pickupDate').value,
       message:         document.getElementById('message').value,
     };
     const res = await fetch('/api/quotes', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(payload)
     });
     // Handle response...
   });
═══════════════════════════════════════════ */
const QuoteForm = {
  form:         null,
  currentStep:  1,
  totalSteps:   3,
  panels:       [],
  stepDots:     [],

  init() {
    this.form = document.getElementById('quote-form');
    if (!this.form) return;

    this.panels   = [
      document.getElementById('step-panel-1'),
      document.getElementById('step-panel-2'),
      document.getElementById('step-panel-3')
    ];

    this.stepDots = document.querySelectorAll('.form-step');

    // Step navigation
    document.getElementById('step1-next')?.addEventListener('click', () => this._nextStep(1));
    document.getElementById('step2-next')?.addEventListener('click', () => this._nextStep(2));
    document.getElementById('step2-back')?.addEventListener('click', () => this._prevStep(2));
    document.getElementById('step3-back')?.addEventListener('click', () => this._prevStep(3));



    // Set min date for pickup to today
    const pickupInput = document.getElementById('pickupDate');
    if (pickupInput) {
      pickupInput.min = new Date().toISOString().split('T')[0];
    }
  },

  /** Move to next step after validating current step */
  _nextStep(fromStep) {
    const errors = this._validateStep(fromStep);
    if (errors.length > 0) return; // Validation failed — errors already displayed

    // Mark current step completed
    const currentDot = this.stepDots[fromStep - 1];
    if (currentDot) currentDot.classList.add('completed');

    this._goToStep(fromStep + 1);

    // Populate summary on step 3
    if (fromStep + 1 === 3) {
      this._buildSummary();
    }
  },

  _prevStep(fromStep) {
    this._goToStep(fromStep - 1);
  },

  _goToStep(step) {
    if (step < 1 || step > this.totalSteps) return;

    // Hide all panels
    this.panels.forEach((panel) => {
      if (panel) panel.setAttribute('hidden', '');
    });

    // Show target panel
    const target = this.panels[step - 1];
    if (target) target.removeAttribute('hidden');

    // Update step dots
    this.stepDots.forEach((dot, i) => {
      dot.classList.toggle('active', i === step - 1);
      dot.setAttribute('aria-selected', i === step - 1 ? 'true' : 'false');
    });

    this.currentStep = step;

    // Scroll form into view
    const cf = document.querySelector('.cf');
    if (cf) cf.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  /** Client-side validation for a given step number */
  _validateStep(step) {
    const errors = [];

    const rules = {
      1: [
        { id: 'fullName',   msg: 'Please enter your full name.' },
        { id: 'phone',      msg: 'Please enter a valid phone number.', pattern: /[\+]?[0-9\s\-\(\)]{7,20}/ },
        { id: 'email',      msg: 'Please enter a valid email address.', type: 'email' }
      ],
      2: [
        { id: 'originCity',      msg: 'Please enter an origin city.' },
        { id: 'destinationCity', msg: 'Please enter a destination city.' },
        { id: 'serviceType',     msg: 'Please select a service type.' }
      ]
    };

    const stepRules = rules[step] || [];

    stepRules.forEach(({ id, msg, pattern, type }) => {
      const input  = document.getElementById(id);
      const errEl  = document.getElementById(`${id}-error`);
      const value  = input ? input.value.trim() : '';
      let   isValid = true;

      if (!value) {
        isValid = false;
      } else if (pattern && !pattern.test(value)) {
        isValid = false;
      } else if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        isValid = false;
      }

      if (errEl) {
        errEl.textContent = isValid ? '' : msg;
      }

      if (input) {
        input.style.borderColor = isValid ? '' : 'rgba(248, 113, 113, 0.8)';
      }

      if (!isValid) errors.push(id);
    });

    // Focus first errored field
    if (errors.length > 0) {
      document.getElementById(errors[0])?.focus();
    }

    return errors;
  },

  /** Build and display a quote summary on Step 3 */
  _buildSummary() {
    const summaryEl = document.getElementById('quote-summary');
    if (!summaryEl) return;

    const get = (id) => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : '';
    };

    const serviceMap = {
      FTL:         'Full Truckload (FTL)',
      LTL:         'Less Than Truckload (LTL)',
      lastmile:    'Last-Mile Delivery',
      temperature: 'Temperature-Controlled',
      longhaul:    'Long-Haul / Interstate',
      warehousing: 'Warehousing & Storage'
    };

    const service = serviceMap[get('serviceType')] || get('serviceType');
    const name    = get('fullName');
    const route   = `${get('originCity')} → ${get('destinationCity')}`;
    // FIX: Append T00:00:00 to force LOCAL timezone parsing.
    // Without it, "2025-06-10" is parsed as UTC midnight, which in UTC+5:45
    // renders as the previous calendar day (June 9) — a silent data error.
    const rawDate = get('pickupDate');
    const date    = rawDate
      ? new Date(`${rawDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })
      : 'Flexible';

    if (!service) { summaryEl.classList.remove('visible'); return; }

    summaryEl.innerHTML = `
      <strong>📋 Quote Summary</strong><br>
      <strong>Name:</strong> ${name}<br>
      <strong>Route:</strong> ${route}<br>
      <strong>Service:</strong> ${service}<br>
      <strong>Pickup:</strong> ${date}
    `;
    summaryEl.classList.add('visible');
  },

  /** Form final submission handler */
  async _onSubmit(e) {
    e.preventDefault();

    const stepErrors = this._validateStep(2);
    if (stepErrors.length) {
      this._goToStep(2);
      return;
    }

    const submitBtn = document.getElementById('quote-submit-btn');
    const msgEl     = document.getElementById('form-msg');

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.querySelector('span').textContent = 'Sending…';
    }

    const formData = new FormData(this.form);
    const payload = {};
    formData.forEach((value, key) => {
      payload[key] = typeof value === 'string' ? value.trim() : value;
    });

    try {
      const res = await fetch(`${API_BASE}/api/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        const detail = json.errors?.join(' ') || json.message || 'Submission failed.';
        this._onError(msgEl, submitBtn, detail);
        return;
      }

      this._onSuccess(msgEl, submitBtn, json.message);
    } catch (err) {
      console.error('[QuoteForm]', err);
      this._onError(
        msgEl,
        submitBtn,
        `Could not connect to the server at ${API_BASE}. Please call +1 (682) 464-1308.`
      );
    }
  },

  _onSuccess(msgEl, btn, serverMessage) {
    if (msgEl) {
      msgEl.textContent =
        serverMessage ||
        'Request sent! Our team will contact you within 1 hour with your personalized quote.';
      msgEl.className = 'form-msg success';
      msgEl.removeAttribute('hidden');
    }
    if (btn) {
      btn.querySelector('span').textContent = 'Request Sent ✓';
      btn.style.opacity = '0.7';
    }
    this.form.reset();
    this._goToStep(1);
  },

  _onError(msgEl, btn, message) {
    if (msgEl) {
      msgEl.textContent = message || '❌ Something went wrong. Please call us at +1 (682) 464-1308.';
      msgEl.className = 'form-msg error';
      msgEl.removeAttribute('hidden');
    }
    if (btn) {
      btn.disabled = false;
      btn.querySelector('span').textContent = 'Send Request — Get My Quote';
    }
  }
};


/* ═══════════════════════════════════════════
   14. SMOOTH SCROLL
   Polyfill for browsers without native
   smooth scrolling on anchor clicks.
   (Most modern browsers handle this via CSS
    scroll-behavior: smooth — this is a fallback.)
═══════════════════════════════════════════ */
// FIX: Wrapped in DOMContentLoaded so anchor queries run after the full DOM is parsed.
// Previously this IIFE ran synchronously at script parse time when the page was
// still loading (script tag is at bottom, but DOMContentLoaded is safer).
(function SmoothScroll() {
  function attachSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        // Guard: ignore lone '#' used as placeholder href
        if (!href || href === '#') return;

        const target = document.querySelector(href);
        if (!target) return;

        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Update focus for accessibility — allow Escape to return focus cleanly
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachSmoothScroll);
  } else {
    attachSmoothScroll();
  }
})();

function startLoader() {
  const loaderEl = document.getElementById('loader');
  const loaderPct = document.getElementById('loader-pct');
  const loaderBar = document.getElementById('loader-bar');
  if (!loaderEl) return;
  let pct = 0;
  const interval = setInterval(() => {
    const remaining = 100 - pct;
    const increment = Math.random() * (remaining * 0.15) + 0.5;
    pct = Math.min(pct + increment, 100);
    const flooredPct = Math.floor(pct);
    loaderPct.textContent = `${flooredPct}%`;
    loaderBar.style.width = `${pct}%`;
    if (pct >= 100) {
      clearInterval(interval);
      loaderPct.textContent = '100%';
      loaderBar.style.width = '100%';
      setTimeout(() => {
        loaderEl.classList.add('hide');
        initSite();
      }, 380);
    }
  }, 75);
}

function initSite() {
  applyDeviceClasses();
  HeroText.init();
  if (!prefersReducedMotion()) {
    HeroParticles.init();
  }
  if (!isTouchDevice()) {
    CardTilt3D.init();
    MagneticButtons.init();
  }
  ScrollReveal.init();
  CounterAnimator.init();
  ExplodeParticles.init();
  TrackingForm.init();
  QuoteForm.init();
}

function bootEarlyModules() {
  applyDeviceClasses();
  Navigation.init();
  _initScrollToButtons();
}

function _initScrollToButtons() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-scroll-to]');
    if (!btn) return;
    const targetId = btn.dataset.scrollTo;
    const target = document.getElementById(targetId);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bootEarlyModules();
  startLoader();
});
