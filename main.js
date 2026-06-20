/* ═══════════════════════════════════════════════════════════
   EVERESTIA VENTURES LLC — MAIN.JS
   Vanilla JS, no dependencies. Powers preloader, nav, hero canvas,
   scroll reveals, counters, ticker, tracking + quote form logic.
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ───────────────────────────────────────────
     PRELOADER
  ─────────────────────────────────────────── */
  function initPreloader() {
    var loader = document.getElementById('loader');
    var bar = document.getElementById('loader-bar');
    var pct = document.getElementById('loader-pct');
    if (!loader) return;

    var progress = 0;
    var target = 0;
    var raf = null;

    function bump() {
      target = Math.min(target + Math.random() * 18 + 6, 96);
    }
    var bumpInterval = setInterval(bump, 180);
    bump();

    function tick() {
      progress += (target - progress) * 0.18;
      if (progress > target - 0.1) progress = target;
      var shown = Math.round(progress);
      if (bar) bar.style.width = shown + '%';
      if (pct) pct.textContent = shown + '%';
      raf = requestAnimationFrame(tick);
    }
    tick();

    function finish() {
      clearInterval(bumpInterval);
      target = 100;
      setTimeout(function () {
        progress = 100;
        if (bar) bar.style.width = '100%';
        if (pct) pct.textContent = '100%';
        setTimeout(function () {
          loader.classList.add('is-hidden');
          if (raf) cancelAnimationFrame(raf);
          document.body.style.overflow = '';
          loader.addEventListener('transitionend', function handler() {
            loader.removeEventListener('transitionend', handler);
            if (loader.parentNode) loader.setAttribute('aria-hidden', 'true');
          });
        }, 280);
      }, 220);
    }

    if (document.readyState === 'complete') {
      finish();
    } else {
      window.addEventListener('load', finish);
      // Safety net in case 'load' is delayed by slow third-party assets
      setTimeout(finish, 3200);
    }
  }

  /* ───────────────────────────────────────────
     CUSTOM CURSOR
  ─────────────────────────────────────────── */
  function initCursor() {
    var dot = document.getElementById('cursor-dot');
    var ring = document.getElementById('cursor-ring');
    if (!dot || !ring) return;

    var isCoarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    if (isCoarse) return;

    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var rx = mx, ry = my;
    var visible = false;

    function onMove(e) {
      mx = e.clientX;
      my = e.clientY;
      if (!visible) {
        visible = true;
        dot.classList.remove('hide');
        ring.classList.remove('hide');
      }
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%)';
    }
    window.addEventListener('mousemove', onMove, { passive: true });

    document.addEventListener('mouseleave', function () {
      dot.classList.add('hide');
      ring.classList.add('hide');
    });
    document.addEventListener('mouseenter', function () {
      if (visible) {
        dot.classList.remove('hide');
        ring.classList.remove('hide');
      }
    });

    function ringLoop() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
      requestAnimationFrame(ringLoop);
    }
    ringLoop();

    var interactiveSelector = 'a, button, input, textarea, select, [role="button"], .svc-card, .stat-badge';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest && e.target.closest(interactiveSelector)) {
        ring.classList.add('is-active');
      }
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest && e.target.closest(interactiveSelector)) {
        ring.classList.remove('is-active');
      }
    });
  }

  /* ───────────────────────────────────────────
     NAVIGATION — scroll state, mobile menu, smooth scroll
  ─────────────────────────────────────────── */
  function initNav() {
    var header = document.querySelector('header');
    var hamburger = document.getElementById('hamburger');
    var mobileMenu = document.getElementById('mobile-menu');
    var scrim = document.getElementById('nav-scrim');

    function onScroll() {
      if (!header) return;
      if (window.scrollY > 24) header.classList.add('is-scrolled');
      else header.classList.remove('is-scrolled');
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    function openMenu() {
      if (!mobileMenu) return;
      mobileMenu.hidden = false;
      requestAnimationFrame(function () {
        mobileMenu.classList.add('is-open');
      });
      if (scrim) scrim.classList.add('is-visible');
      if (hamburger) hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
    function closeMenu() {
      if (!mobileMenu) return;
      mobileMenu.classList.remove('is-open');
      if (scrim) scrim.classList.remove('is-visible');
      if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      var onEnd = function () {
        mobileMenu.removeEventListener('transitionend', onEnd);
        if (!mobileMenu.classList.contains('is-open')) mobileMenu.hidden = true;
      };
      mobileMenu.addEventListener('transitionend', onEnd);
    }

    if (hamburger && mobileMenu) {
      hamburger.addEventListener('click', function () {
        var expanded = hamburger.getAttribute('aria-expanded') === 'true';
        if (expanded) closeMenu(); else openMenu();
      });
    }
    if (scrim) scrim.addEventListener('click', closeMenu);

    mobileMenu && mobileMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobileMenu && mobileMenu.classList.contains('is-open')) {
        closeMenu();
      }
    });

    // data-scroll-to + hash links: smooth-scroll with header offset
    function scrollToId(id) {
      var target = document.getElementById(id);
      if (!target) return;
      var headerEl = document.querySelector('header');
      var offset = headerEl ? headerEl.offsetHeight : 84;
      var top = target.getBoundingClientRect().top + window.pageYOffset - offset + 1;
      window.scrollTo({ top: top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }

    document.querySelectorAll('[data-scroll-to]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        scrollToId(btn.getAttribute('data-scroll-to'));
      });
    });

    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href || href === '#') return;
      link.addEventListener('click', function (e) {
        var id = href.slice(1);
        var target = document.getElementById(id);
        if (target) {
          e.preventDefault();
          scrollToId(id);
        }
      });
    });
  }

  /* ───────────────────────────────────────────
     HERO HEADLINE — populate split-word spans from data-word
  ─────────────────────────────────────────── */
  function initHeroHeadline() {
    var words = document.querySelectorAll('.split-word');
    if (!words.length) return;

    words.forEach(function (wordEl) {
      var text = wordEl.getAttribute('data-word');
      if (!text) return;

      // Preserve any existing child elements (e.g. the .glitch span) by
      // appending letters before them rather than wiping innerHTML.
      var existingChildren = Array.prototype.slice.call(wordEl.children);

      var frag = document.createDocumentFragment();
      text.split('').forEach(function (ch, i) {
        var letter = document.createElement('span');
        letter.className = 'sw-letter';
        letter.style.setProperty('--li', i);
        letter.textContent = ch === ' ' ? '\u00A0' : ch;
        frag.appendChild(letter);
      });

      wordEl.insertBefore(frag, wordEl.firstChild);

      // Keep glitch span's data-text in sync (cosmetic, already set in HTML)
      existingChildren.forEach(function (child) {
        if (child.classList && child.classList.contains('glitch')) {
          child.setAttribute('data-text', text);
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initPreloader();
    initCursor();
    initNav();
    initHeroHeadline();
  });
})();


(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ───────────────────────────────────────────
     HERO PARTICLE CANVAS
  ─────────────────────────────────────────── */
  function initHeroCanvas() {
    var canvas = document.getElementById('hero-canvas');
    var hero = document.querySelector('.hero');
    if (!canvas || !hero || prefersReducedMotion) return;
    var ctx = canvas.getContext('2d');
    var particles = [];
    var W, H, dpr;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = hero.offsetWidth;
      H = hero.offsetHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.round((W * H) / 26000);
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.6 + 0.6,
          vx: (Math.random() - 0.5) * 0.18,
          vy: -Math.random() * 0.25 - 0.05,
          o: Math.random() * 0.5 + 0.15
        });
      }
    }

    var ro = new ResizeObserver(resize);
    ro.observe(hero);
    resize();

    function loop() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 190, 140,' + p.o + ')';
        ctx.fill();
      }
      requestAnimationFrame(loop);
    }
    loop();
  }

  /* ───────────────────────────────────────────
     MOUNTAIN PARALLAX (mousemove + scroll)
  ─────────────────────────────────────────── */
  function initParallax() {
    var hero = document.querySelector('.hero');
    var back = document.querySelector('.mountain-back');
    var front = document.querySelector('.mountain-front');
    var blobs = document.querySelectorAll('.blob');
    if (!hero || prefersReducedMotion) return;

    var tx = 0, ty = 0, cx = 0, cy = 0;

    hero.addEventListener('mousemove', function (e) {
      var rect = hero.getBoundingClientRect();
      tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      ty = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    }, { passive: true });

    function loop() {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      if (back) back.style.transform = 'translate(' + (cx * 10) + 'px,' + (cy * 6 + 2) + 'px)';
      if (front) front.style.transform = 'translate(' + (cx * 20) + 'px,' + (cy * 10) + 'px)';
      requestAnimationFrame(loop);
    }
    loop();

    window.addEventListener('scroll', function () {
      var sc = window.scrollY;
      if (back) back.style.setProperty('--sy', sc * 0.08 + 'px');
      if (front) front.style.setProperty('--sy', sc * 0.14 + 'px');
    }, { passive: true });
  }

  /* ───────────────────────────────────────────
     SCROLL REVEAL (.rv / .rv-l / .rv-r)
  ─────────────────────────────────────────── */
  function initScrollReveal() {
    var targets = document.querySelectorAll('.rv, .rv-l, .rv-r');
    if (!targets.length) return;

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      targets.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

    targets.forEach(function (el) { io.observe(el); });
  }

  /* ───────────────────────────────────────────
     ANIMATED COUNTERS (data-target / data-suffix)
  ─────────────────────────────────────────── */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-target'));
    if (isNaN(target)) return;
    var suffix = el.getAttribute('data-suffix') || '';
    var dur = 1400;
    var start = null;

    if (prefersReducedMotion) {
      el.textContent = target + suffix;
      return;
    }

    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = Math.round(target * eased);
      el.textContent = val + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target + suffix;
    }
    requestAnimationFrame(step);
  }

  function initCounters() {
    var counters = document.querySelectorAll('[data-target]');
    if (!counters.length || typeof IntersectionObserver === 'undefined') {
      counters.forEach(animateCount);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { io.observe(el); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initHeroCanvas();
    initParallax();
    initScrollReveal();
    initCounters();
  });
})();

/* ───────────────────────────────────────────
   SHIPMENT TRACKING FORM
─────────────────────────────────────────── */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('tracking-form');
    var input = document.getElementById('trackingId');
    var statusEl = document.getElementById('track-status');
    var submitBtn = document.getElementById('track-submit-btn');
    if (!form || !input || !statusEl || !submitBtn) return;

    function showStatus(html, type) {
      statusEl.innerHTML = html;
      statusEl.className = 'track-status' + (type ? ' ' + type : '');
      statusEl.hidden = false;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var val = input.value.trim();

      if (val.length < 4) {
        showStatus('Please enter a valid tracking ID (at least 4 characters).', 'error');
        input.focus();
        return;
      }

      submitBtn.disabled = true;
      var span = submitBtn.querySelector('span');
      var original = span ? span.textContent : 'Track Now';
      if (span) span.textContent = 'Searching…';
      showStatus('Looking up shipment <strong>' + val.replace(/[<>]/g, '') + '</strong>…');

      var API_BASE = (window.EVERESTIA_API || 'http://localhost:5000').replace(/\/$/, '');

      fetch(API_BASE + '/api/tracking/' + encodeURIComponent(val))
        .then(function (res) {
          if (!res.ok) throw new Error('not_found');
          return res.json();
        })
        .then(function (data) {
          if (data && data.success && data.shipment) {
            var s = data.shipment;
            showStatus(
              '<strong>Shipment ' + (s.id || val) + '</strong>' +
              'Status: ' + (s.status || 'In Transit') +
              (s.eta ? ' · ETA: ' + s.eta : '') +
              (s.location ? ' · Last known location: ' + s.location : ''),
              'success'
            );
          } else {
            showStatus('No shipment found for <strong>' + val.replace(/[<>]/g, '') + '</strong>. Double-check the ID or contact our support team.', 'error');
          }
        })
        .catch(function () {
          showStatus(
            'We couldn\'t reach the tracking service right now. Please try again shortly, or call us at <strong>+1 (682) 464-1308</strong> for an immediate update.',
            'error'
          );
        })
        .finally(function () {
          submitBtn.disabled = false;
          if (span) span.textContent = original;
        });
    });
  });
})();

/* ───────────────────────────────────────────
   MULTI-STEP QUOTE FORM
   Exposes window.QuoteForm with _goToStep / _validateStep
   so the inline submit handler in index.html can call it.
─────────────────────────────────────────── */
var QuoteForm = (function () {
  'use strict';

  var currentStep = 1;
  var totalSteps = 3;

  var els = {};

  var validators = {
    fullName: function (v) { return v.trim().length >= 2; },
    phone: function (v) { return /^[\+]?[0-9\s\-\(\)]{7,20}$/.test(v.trim()); },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); },
    originCity: function (v) { return v.trim().length >= 2; },
    destinationCity: function (v) { return v.trim().length >= 2; },
    serviceType: function (v) { return v.trim().length > 0; }
  };

  var errorMessages = {
    fullName: 'Please enter your full name.',
    phone: 'Please enter a valid phone number.',
    email: 'Please enter a valid email address.',
    originCity: 'Please enter an origin city & state.',
    destinationCity: 'Please enter a destination city & state.',
    serviceType: 'Please select a service type.'
  };

  var stepFieldMap = {
    1: ['fullName', 'phone', 'email'],
    2: ['originCity', 'destinationCity', 'serviceType']
  };

  function cacheEls() {
    els.form = document.getElementById('quote-form');
    els.panels = document.querySelectorAll('.form-panel');
    els.steps = document.querySelectorAll('.form-step');
    els.lines = document.querySelectorAll('.step-line');
    els.summary = document.getElementById('quote-summary');
  }

  function clearFieldError(name) {
    var input = document.getElementById(name);
    var err = document.getElementById(name + '-error');
    if (input) input.classList.remove('field-invalid');
    if (err) err.textContent = '';
  }

  function setFieldError(name, message) {
    var input = document.getElementById(name);
    var err = document.getElementById(name + '-error');
    if (input) input.classList.add('field-invalid');
    if (err) err.textContent = message;
  }

  function _validateStep(step) {
    var fields = stepFieldMap[step] || [];
    var errors = [];
    fields.forEach(function (name) {
      var input = document.getElementById(name);
      if (!input) return;
      var value = input.value || '';
      var validator = validators[name];
      clearFieldError(name);
      if (validator && !validator(value)) {
        setFieldError(name, errorMessages[name]);
        errors.push(name);
      }
    });
    return errors;
  }

  function updateStepIndicator(step) {
    els.steps.forEach(function (stepEl) {
      var n = parseInt(stepEl.getAttribute('data-step'), 10);
      stepEl.classList.toggle('active', n === step);
      stepEl.classList.toggle('is-complete', n < step);
      stepEl.setAttribute('aria-selected', n === step ? 'true' : 'false');
    });
    els.lines.forEach(function (line, i) {
      line.classList.toggle('is-filled', i < step - 1);
    });
  }

  function _goToStep(step) {
    currentStep = Math.min(Math.max(step, 1), totalSteps);
    els.panels.forEach(function (panel) {
      var id = panel.id || '';
      var match = id.match(/step-panel-(\d+)/);
      var panelStep = match ? parseInt(match[1], 10) : 0;
      var isActive = panelStep === currentStep;
      panel.classList.toggle('active', isActive);
      panel.hidden = !isActive;
    });
    updateStepIndicator(currentStep);

    if (currentStep === 3) updateSummary();

    var formTop = els.form;
    if (formTop) {
      var rect = formTop.getBoundingClientRect();
      if (rect.top < 0 || rect.top > window.innerHeight * 0.6) {
        formTop.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  function updateSummary() {
    if (!els.summary) return;
    var fullName = (document.getElementById('fullName') || {}).value || '';
    var origin = (document.getElementById('originCity') || {}).value || '';
    var destination = (document.getElementById('destinationCity') || {}).value || '';
    var serviceSelect = document.getElementById('serviceType');
    var serviceLabel = '';
    if (serviceSelect && serviceSelect.selectedIndex > -1) {
      serviceLabel = serviceSelect.options[serviceSelect.selectedIndex].textContent;
    }
    var weight = (document.getElementById('weight') || {}).value || '';

    var rows = [];
    if (fullName) rows.push(row('Contact', fullName));
    if (origin && destination) rows.push(row('Route', origin + ' → ' + destination));
    if (serviceLabel) rows.push(row('Service', serviceLabel));
    if (weight) rows.push(row('Est. Weight', weight + ' lbs'));

    els.summary.innerHTML = rows.length
      ? rows.join('')
      : '<div class="qs-empty">Your quote summary will appear here.</div>';
  }

  function row(k, v) {
    return '<div class="qs-row"><span class="qs-k">' + k + '</span><span class="qs-v">' + escapeHtml(v) + '</span></div>';
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function bindLiveValidation() {
    Object.keys(validators).forEach(function (name) {
      var input = document.getElementById(name);
      if (!input) return;
      input.addEventListener('blur', function () {
        var validator = validators[name];
        if (input.value.trim() === '' && !input.hasAttribute('required')) return;
        if (validator(input.value)) clearFieldError(name);
      });
      input.addEventListener('input', function () {
        if (input.classList.contains('field-invalid') && validators[name](input.value)) {
          clearFieldError(name);
        }
      });
    });
  }

  function init() {
    cacheEls();
    if (!els.form) return;

    var step1Next = document.getElementById('step1-next');
    var step2Next = document.getElementById('step2-next');
    var step2Back = document.getElementById('step2-back');
    var step3Back = document.getElementById('step3-back');

    if (step1Next) {
      step1Next.addEventListener('click', function () {
        var errors = _validateStep(1);
        if (errors.length === 0) _goToStep(2);
        else {
          var firstError = document.getElementById(errors[0]);
          if (firstError) firstError.focus();
        }
      });
    }
    if (step2Next) {
      step2Next.addEventListener('click', function () {
        var errors = _validateStep(2);
        if (errors.length === 0) _goToStep(3);
        else {
          var firstError = document.getElementById(errors[0]);
          if (firstError) firstError.focus();
        }
      });
    }
    if (step2Back) step2Back.addEventListener('click', function () { _goToStep(1); });
    if (step3Back) step3Back.addEventListener('click', function () { _goToStep(2); });

    bindLiveValidation();
    updateStepIndicator(1);
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    _goToStep: _goToStep,
    _validateStep: _validateStep
  };
})();

/* ───────────────────────────────────────────
   FOOTER YEAR
─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  var yearEl = document.getElementById('copyright-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});