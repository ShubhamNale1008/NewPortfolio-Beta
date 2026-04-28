// ====================================
// PORTFOLIO INTERACTIONS & ANIMATIONS
// ====================================

// *** LOADER ANIMATION — PREMIUM ***
(() => {
  const container  = document.getElementById('loaderContainer');
  const percentEl  = document.getElementById('loaderPercent');
  const barFill    = document.getElementById('loaderBarFill');
  const ringFill   = document.getElementById('ringFill');
  const ringTip    = document.getElementById('ringTip');
  const CIRCUMF    = 314; // 2π × r (r=50)

  let progress = 0;
  let simInterval = null;

  // Update all visual elements to match progress value
  function setProgress(val) {
    progress = Math.min(100, Math.max(0, val));

    const pct = progress / 100;
    if (percentEl) percentEl.textContent = Math.floor(progress);
    if (barFill)   barFill.style.width   = progress + '%';
    if (ringFill)  ringFill.style.strokeDashoffset = CIRCUMF * (1 - pct);

    // Rotate the glowing tip dot around the circle
    if (ringTip) {
      const angle = pct * 360 - 90; // starts at 12 o'clock
      const rad   = (angle * Math.PI) / 180;
      const cx = 60 + 50 * Math.cos(rad);
      const cy = 60 + 50 * Math.sin(rad);
      ringTip.setAttribute('cx', cx.toFixed(2));
      ringTip.setAttribute('cy', cy.toFixed(2));
    }
  }

  // Simulate progress with an ease-out curve so it slows near 95%
  function startSim() {
    if (simInterval) return;
    simInterval = setInterval(() => {
      const remaining = 95 - progress;
      if (remaining <= 0) { clearInterval(simInterval); return; }
      const step = Math.max(0.5, remaining * 0.07);
      setProgress(progress + step);
    }, 120);
  }

  // Cinematic exit: scale+blur the whole screen, then hide
  function hideLoader() {
    if (!container) return;
    // Rush to 100 first
    clearInterval(simInterval);
    const finish = setInterval(() => {
      if (progress >= 100) {
        clearInterval(finish);
        setTimeout(() => {
          container.classList.add('hidden');
          setTimeout(() => { container.style.display = 'none'; }, 850);
        }, 180);
        return;
      }
      setProgress(progress + 4);
    }, 25);
  }

  setProgress(0);
  startSim();

  window.addEventListener('load', hideLoader, { once: true });

  // Safety fallback at 6 s
  setTimeout(() => {
    if (container && container.style.display !== 'none') hideLoader();
  }, 6000);
})();

// *** LUXEDITOR TUTORIAL VIDEO MODAL ***
(() => {
  const overlay  = document.getElementById('lxModalOverlay');
  const closeBtn = document.getElementById('lxModalClose');
  const trigger  = document.getElementById('lxTrigger');
  const video    = document.getElementById('lxVideoFrame');
  const spinner  = document.getElementById('lxVideoSpinner');
  if (!overlay || !trigger || !video) return;

  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(
      overlay.querySelectorAll('button, video, [tabindex="0"]')
    ).filter(el => !el.disabled);
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
  }

  if (spinner) {
    video.addEventListener('waiting', () => spinner.classList.add('visible'));
    video.addEventListener('playing', () => spinner.classList.remove('visible'));
    video.addEventListener('canplay', () => spinner.classList.remove('visible'));
    video.addEventListener('error',   () => spinner.classList.remove('visible'));
  }

  function openModal() {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    overlay.addEventListener('keydown', trapFocus);
    if (spinner) spinner.classList.add('visible');
    video.play().catch(() => { if (spinner) spinner.classList.remove('visible'); });
    closeBtn.focus();
  }

  function closeModal() {
    overlay.classList.remove('active');
    video.pause();
    video.currentTime = 0;
    if (spinner) spinner.classList.remove('visible');
    document.body.style.overflow = '';
    overlay.removeEventListener('keydown', trapFocus);
    trigger.focus();
  }

  trigger.addEventListener('click', openModal);
  trigger.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(); }
  });
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) closeModal();
  });
})();

// *** HAMBURGER MENU ***
(function () {
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');
  if (!hamburger || !navLinks) return;

  hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
  });

  // Close on any nav link click
  navLinks.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
      navLinks.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
})();

// *** NAVBAR ACTIVE LINK INDICATOR + SMOOTH SCROLL ***
(function () {
  const sections  = Array.from(document.querySelectorAll('section[id]'));
  const navLinks  = Array.from(document.querySelectorAll('.nav-link'));
  const navEl     = document.querySelector('.navbar');
  let scrollLocked = false;
  let lockTimer    = null;

  // Always read the real rendered navbar height so it works on all screen sizes
  function navH() {
    return navEl ? navEl.offsetHeight : 64;
  }

  function setActive(id) {
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
    });
  }

  function clearActive() {
    navLinks.forEach(l => l.classList.remove('active'));
  }

  function detectActive() {
    if (scrollLocked) return;
    const scrollY = window.scrollY;

    if (scrollY < 10) { clearActive(); return; }

    // If the page bottom is reached, always mark the last section active
    if ((window.innerHeight + scrollY) >= document.documentElement.scrollHeight - 10) {
      setActive(sections[sections.length - 1].id);
      return;
    }

    // A section is "active" when its top edge has crossed past the navbar bottom.
    // We use navH() + 4 as a tiny sub-pixel buffer only.
    const threshold = navH() + 4;
    let current = null;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= threshold) {
        current = section;
      }
    }
    if (current) setActive(current.id);
  }

  function unlock() {
    scrollLocked = false;
    clearTimeout(lockTimer);
    detectActive();
  }

  navLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (!href || href === '#') return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (!target) return;

      // Highlight the clicked link immediately — no waiting for scroll
      setActive(target.getAttribute('id'));

      // Lock scroll-based detection so mid-scroll positions don't override
      scrollLocked = true;
      clearTimeout(lockTimer);
      window.removeEventListener('scrollend', unlock);

      // Explicit offset scroll: section top lands exactly at navbar bottom.
      // More reliable than scrollIntoView + scroll-margin-top across all browsers.
      const scrollTarget = target.getBoundingClientRect().top + window.scrollY - navH();
      window.scrollTo({ top: scrollTarget, behavior: 'smooth' });

      // Use the native scrollend event when available (fires exactly when scroll stops).
      // Fall back to a generous timeout for older browsers.
      if ('onscrollend' in window) {
        window.addEventListener('scrollend', unlock, { once: true });
        // Safety net: if scrollend somehow doesn't fire, unlock after 1.5 s
        lockTimer = setTimeout(unlock, 1500);
      } else {
        lockTimer = setTimeout(unlock, 1200);
      }
    });
  });

  // Handle all other anchor clicks (e.g. hero CTA, logo)
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    if (anchor.classList.contains('nav-link')) return;
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (!href || href === '#') return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (!target) return;
      const scrollTarget = target.getBoundingClientRect().top + window.scrollY - navH();
      window.scrollTo({ top: scrollTarget, behavior: 'smooth' });
    });
  });

  window.addEventListener('scroll', detectActive, { passive: true });
  detectActive(); // run once on load
})();

// *** CONTACT FORM HANDLER ***
(function () {
  const form      = document.getElementById('contactForm');
  const submitBtn = document.getElementById('formSubmit');
  if (!form) return;

  // ── Web3Forms access key ──────────────────────────────────────────────────
  // Get your FREE key at https://web3forms.com  (enter your email, instant key)
  // Replace the placeholder below with your actual key.
  const WEB3FORMS_KEY = 'fb4f7e21-4920-4bdb-b4a0-655ddd8c62f9';
  // ─────────────────────────────────────────────────────────────────────────

  function showToast(msg, isError = false) {
    // Announce to screen readers via ARIA live region
    const liveRegion = document.getElementById('toastLiveRegion');
    if (liveRegion) {
      liveRegion.textContent = '';
      setTimeout(() => { liveRegion.textContent = msg; }, 50);
    }

    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = `
      position: fixed; top: 80px; right: 20px;
      background: ${isError ? '#ef4444' : 'linear-gradient(135deg,#6366f1,#a78bfa)'};
      color: #fff; padding: 14px 22px; border-radius: 10px;
      font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 600;
      box-shadow: 0 12px 32px rgba(99,102,241,0.35);
      animation: slideInRight 0.35s cubic-bezier(0.25,0.46,0.45,0.94);
      z-index: 9999; transition: opacity 0.3s ease, transform 0.3s ease;
      max-width: 320px; word-wrap: break-word;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(120px)';
      setTimeout(() => toast.remove(), 350);
    }, 4000);
  }

  function setSubmitLoading(isLoading) {
    const textEl = submitBtn.querySelector('.form-submit-text');
    const iconEl = submitBtn.querySelector('.form-submit-icon');
    submitBtn.disabled = isLoading;
    if (isLoading) {
      textEl.textContent = 'Sending…';
      iconEl.className   = 'fas fa-spinner fa-spin form-submit-icon';
    } else {
      textEl.textContent = 'Send Message';
      iconEl.className   = 'fas fa-paper-plane form-submit-icon';
    }
  }

  // Basic email format check
  function isValidEmail(val) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name    = document.getElementById('cf-name')?.value.trim()    || '';
    const email   = document.getElementById('cf-email')?.value.trim()   || '';
    const subject = document.getElementById('cf-subject')?.value.trim() || '';
    const message = document.getElementById('cf-message')?.value.trim() || '';

    // ── Validation ──
    if (!name || !email || !subject || !message) {
      showToast('Please fill in all required fields.', true);
      return;
    }
    if (!isValidEmail(email)) {
      showToast('Please enter a valid email address.', true);
      return;
    }

    // ── If no API key yet, fall back to mailto ──
    if (!WEB3FORMS_KEY || WEB3FORMS_KEY === 'YOUR_WEB3FORMS_ACCESS_KEY') {
      const mailto = `mailto:shubhamnale1008@gmail.com?subject=${encodeURIComponent(subject || 'Portfolio Contact')}&body=${encodeURIComponent('Name: ' + name + '\nEmail: ' + email + '\n\n' + message)}`;
      window.open(mailto, '_blank', 'noopener,noreferrer');
      showToast('Opening your mail client… ✓');
      form.reset();
      return;
    }

    // ── Web3Forms submission ──
    setSubmitLoading(true);
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          access_key:  WEB3FORMS_KEY,
          name,
          email,
          subject:     subject || 'Portfolio Contact — ' + name,
          message,
          from_name:   'Portfolio Contact Form',
          replyto:     email
        })
      });

      const data = await res.json();

      if (data.success) {
        showToast('Message sent! I\'ll get back to you soon ✓');
        form.reset();
      } else {
        console.error('Web3Forms error:', data);
        showToast('Something went wrong — please email me directly.', true);
      }
    } catch (err) {
      console.error('Network error:', err);
      showToast('Network error — please try again or email me directly.', true);
    } finally {
      setSubmitLoading(false);
    }
  });
})();

// *** PERFORMANCE OPTIMIZATIONS ***

// *** KEYBOARD SHORTCUTS ***
document.addEventListener('keydown', (e) => {
  // Never fire shortcuts while the user is typing in a form element
  const tag = e.target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;

  if (e.code === 'KeyH') {
    document.querySelector('#hero').scrollIntoView({ behavior: 'smooth' });
  }
  if (e.code === 'KeyA') {
    document.querySelector('#about').scrollIntoView({ behavior: 'smooth' });
  }
  if (e.code === 'KeyE') {
    const eduTarget = document.querySelector('#education');
    if (eduTarget) eduTarget.scrollIntoView({ behavior: 'smooth' });
  }
  if (e.code === 'KeyS') {
    document.querySelector('#skills').scrollIntoView({ behavior: 'smooth' });
  }
  if (e.code === 'KeyP') {
    const projTarget = document.querySelector('#projects');
    if (projTarget) projTarget.scrollIntoView({ behavior: 'smooth' });
  }
  if (e.code === 'KeyW') {
    const workTarget = document.querySelector('#certificates');
    if (workTarget) workTarget.scrollIntoView({ behavior: 'smooth' });
  }
  if (e.code === 'KeyC') {
    document.querySelector('#contact').scrollIntoView({ behavior: 'smooth' });
  }
});

// *** RESUME MODAL ***
(() => {
  const modal    = document.getElementById('resumeModal');
  const overlay  = document.getElementById('resumeModalOverlay');
  const closeBtn = document.getElementById('resumeModalClose');  
  const body     = document.getElementById('resumeModalBody');
  const RESUME_PDF = 'resume/Shubham_Nale_Resume.pdf';

  if (!modal) return;

  let loaded = false;

  function buildViewer() {
    if (loaded) return;
    loaded = true;

    // Show spinner while loading
    body.innerHTML = `
      <div class="resume-pdfjs-loading">
        <div class="resume-pdfjs-spinner"></div>
        <span>Loading resume…</span>
      </div>`;

    // Point PDF.js worker at the CDN copy
    if (typeof pdfjsLib === 'undefined') {
      showError();
      return;
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    pdfjsLib.getDocument(RESUME_PDF).promise.then(function (pdf) {
      body.innerHTML = '';
      const container = document.createElement('div');
      container.className = 'resume-pdfjs-container';
      body.appendChild(container);

      // Render pages one by one
      let chain = Promise.resolve();
      for (let i = 1; i <= pdf.numPages; i++) {
        (function (pageNum) {
          chain = chain.then(function () {
            return pdf.getPage(pageNum).then(function (page) {
              const containerW = (body.clientWidth > 0 ? body.clientWidth : (body.parentElement?.clientWidth || 800)) - 32;
              const baseView   = page.getViewport({ scale: 1 });
              const scale      = Math.max(containerW / baseView.width, 0.5);
              const viewport   = page.getViewport({ scale });

              const wrapper = document.createElement('div');
              wrapper.className = 'resume-pdfjs-page';

              const canvas    = document.createElement('canvas');
              canvas.width    = viewport.width;
              canvas.height   = viewport.height;

              wrapper.appendChild(canvas);
              container.appendChild(wrapper);

              return page.render({
                canvasContext: canvas.getContext('2d'),
                viewport
              }).promise;
            });
          });
        })(i);
      }
      chain.catch(function () { showError(); });

    }).catch(function () { showError(); });
  }

  function showError() {
    body.innerHTML = `
      <div class="resume-pdfjs-error">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Could not load the resume PDF.<br>Make sure the file exists at <code>resume/Shubham_Nale_Resume.pdf</code><br>and use the Download button above.</p>
      </div>`;
  }

  function openResumeModal() {
    buildViewer();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeResumeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Desktop navbar pill button
  document.getElementById('openResumeModal')?.addEventListener('click', openResumeModal);

  // Mobile hamburger menu resume link — intercept and open modal instead
  document.querySelector('.nav-link-resume')?.addEventListener('click', (e) => {
    e.preventDefault();
    // Close the mobile menu first
    document.getElementById('navLinks')?.classList.remove('open');
    document.getElementById('hamburger')?.classList.remove('open');
    document.getElementById('hamburger')?.setAttribute('aria-expanded', 'false');
    openResumeModal();
  });

  closeBtn?.addEventListener('click', closeResumeModal);
  overlay?.addEventListener('click', closeResumeModal);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('active')) closeResumeModal();
  });
})();

// *** CERTIFICATE MODAL ***
(function () {
  const modal        = document.getElementById('certModal');
  const overlay      = document.getElementById('certModalOverlay');
  const closeBtn     = document.getElementById('certModalClose');
  const modalImg     = document.getElementById('certModalImage');
  const modalTitle   = document.getElementById('certModalTitle');
  const viewFullBtn  = document.getElementById('certDownload');

  if (!modal) return;

  let currentSrc = '';

  function openModal(src, title) {
    currentSrc = src;
    modalImg.src = src;
    modalImg.alt = title;
    modalTitle.textContent = title;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    // slight delay before clearing src to avoid flash
    setTimeout(() => { if (!modal.classList.contains('active')) modalImg.src = ''; }, 400);
  }

  // Wire each cert card — read src and h3 directly from the card
  document.querySelectorAll('.certificate-card').forEach(card => {
    card.addEventListener('click', () => {
      // PDF cards open directly in a new tab — can't be shown in an img modal
      const pdfSrc = card.dataset.pdf;
      if (pdfSrc) {
        window.open(pdfSrc, '_blank', 'noopener,noreferrer');
        return;
      }
      const img   = card.querySelector('img');
      const h3    = card.querySelector('h3');
      if (img) openModal(img.src, h3 ? h3.textContent.trim() : 'Certificate');
    });
  });

  // View Full Size — open in new tab
  viewFullBtn?.addEventListener('click', () => {
    if (currentSrc) window.open(currentSrc, '_blank', 'noopener,noreferrer');
  });

  closeBtn?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
  });
})();

// Set footer year
(function () {
  var el = document.getElementById('footerYear');
  if (el) el.textContent = new Date().getFullYear();
})();

// *** SCROLL-DRIVEN UI — single RAF-debounced listener ***
(() => {
  const navbar     = document.querySelector('.navbar');
  const scrollProg = document.getElementById('scrollProgress');
  const backToTop  = document.getElementById('backToTop');
  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const scrollY   = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (navbar)     navbar.classList.toggle('scrolled', scrollY > 50);
      if (scrollProg) scrollProg.style.width = (docHeight > 0 ? (scrollY / docHeight) * 100 : 0) + '%';
      if (backToTop)  backToTop.classList.toggle('visible', scrollY > 400);
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // apply initial state without waiting for first scroll

  backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

// *** TYPING ANIMATION ***
(function () {
  const phrases = [
    'building real projects.',
    'exploring AI.',
    'learning every day.',
  ];
  const el = document.getElementById('typedText');
  if (!el) return;

  // Add cursor element
  const cursor = document.createElement('span');
  cursor.className = 'typed-cursor';
  el.insertAdjacentElement('afterend', cursor);

  let phraseIndex = 0;
  let charIndex = 0;
  let deleting = false;
  let delay = 100;

  function type() {
    const current = phrases[phraseIndex];
    if (deleting) {
      el.textContent = current.substring(0, charIndex - 1);
      charIndex--;
      delay = 50;
    } else {
      el.textContent = current.substring(0, charIndex + 1);
      charIndex++;
      delay = 100;
    }

    if (!deleting && charIndex === current.length) {
      delay = 1800;
      deleting = true;
    } else if (deleting && charIndex === 0) {
      deleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      delay = 400;
    }
    setTimeout(type, delay);
  }
  setTimeout(type, 800);
})();

// *** HERO PARTICLE STARS ***
(function () {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const particleContainer = document.createElement('div');
  particleContainer.className = 'hero-particles';
  hero.appendChild(particleContainer);

  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 1;
    const left = Math.random() * 100;
    const duration = Math.random() * 15 + 8;
    const delay = Math.random() * 10;
    const drift = (Math.random() - 0.5) * 200;
    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${left}%;
      bottom: -10px;
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
      --drift: ${drift}px;
      opacity: ${Math.random() * 0.6 + 0.2};
    `;
    particleContainer.appendChild(p);
  }
})();

// ============================================================
// PREMIUM ANIMATIONS
// ============================================================

// *** 1. CURSOR SPOTLIGHT — smooth laggy glow follows mouse ***
(() => {
  const el = document.getElementById('cursorSpotlight');
  if (!el || window.matchMedia('(pointer: coarse)').matches) {
    if (el) el.style.display = 'none'; // hide on touch devices
    return;
  }
  let tx = window.innerWidth / 2, ty = window.innerHeight / 2;
  let cx = tx, cy = ty;
  window.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
  (function raf() {
    cx += (tx - cx) * 0.1;
    cy += (ty - cy) * 0.1;
    el.style.left = cx + 'px';
    el.style.top  = cy + 'px';
    requestAnimationFrame(raf);
  })();
})();

// *** 2. SCROLL REVEAL with stagger ***
(() => {
  const groups = [
    { sel: '.section-header',    cls: '',             stagger: false },
    { sel: '.about-text p',      cls: 'reveal-left',  stagger: true  },
    { sel: '.stat',              cls: 'reveal-right', stagger: true  },
    { sel: '.edu-item',          cls: 'reveal-left',  stagger: true  },
    { sel: '.skill-card',        cls: 'reveal-scale', stagger: true  },
    { sel: '.project-card',      cls: 'reveal-scale', stagger: true  },
    { sel: '.certificate-card',  cls: '',             stagger: true  },
    { sel: '.interest-card',     cls: '',             stagger: true  },
    { sel: '.contact-info',      cls: 'reveal-left',  stagger: false },
    { sel: '.contact-form-wrap', cls: 'reveal-right', stagger: false },
  ];

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  groups.forEach(({ sel, cls, stagger }) => {
    document.querySelectorAll(sel).forEach((el, i) => {
      // Add classes only if not already present (idempotent)
      el.classList.add('reveal');
      if (cls) el.classList.add(cls);
      if (stagger) el.style.transitionDelay = (i % 5) * 0.09 + 's';
      obs.observe(el);
    });
  });
})();

// *** 3. 3D TILT + inner spotlight on cards ***
(() => {
  const cards = document.querySelectorAll('.skill-card, .certificate-card, .interest-card, .project-card, .edu-card');
  cards.forEach(card => {
    // Make sure overflow is visible so tilt pops above siblings
    card.style.willChange = 'transform';
    card.style.transformStyle = 'preserve-3d';

    card.addEventListener('mousemove', e => {
      const r  = card.getBoundingClientRect();
      const nx = (e.clientX - r.left)  / r.width  - 0.5; // -0.5 → +0.5
      const ny = (e.clientY - r.top)   / r.height - 0.5;
      const rx = (-ny * 12).toFixed(2);
      const ry = ( nx * 12).toFixed(2);
      card.style.transform  = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(8px)`;
      card.style.transition = 'transform 0.08s ease';
      // follow-cursor inner glow
      const gx = ((e.clientX - r.left) / r.width  * 100).toFixed(1);
      const gy = ((e.clientY - r.top)  / r.height * 100).toFixed(1);
      card.style.background = `radial-gradient(circle at ${gx}% ${gy}%, rgba(99,102,241,0.13) 0%, rgba(255,255,255,0.015) 55%)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform  = '';
      card.style.transition = 'transform 0.55s cubic-bezier(0.16,1,0.3,1), background 0.4s ease';
      card.style.background = '';
    });
  });
})();

// *** 4. MAGNETIC BUTTONS — subtly attract to cursor ***
(() => {
  const magnets = document.querySelectorAll('.cta-button.primary, .social-link, .back-to-top');
  magnets.forEach(el => {
    el.addEventListener('mousemove', e => {
      const r  = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width  / 2)) * 0.28;
      const dy = (e.clientY - (r.top  + r.height / 2)) * 0.28;
      el.style.transform  = `translate(${dx}px, ${dy}px)`;
      el.style.transition = 'transform 0.12s ease';
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform  = '';
      el.style.transition = 'transform 0.5s cubic-bezier(0.16,1,0.3,1)';
    });
  });
})();

// *** 5. HERO MOUSE PARALLAX on orbs ***
(() => {
  const orbDefs = [
    { sel: '.bg-orb-1', depth: 0.022 },
    { sel: '.bg-orb-2', depth: 0.016 },
    { sel: '.bg-orb-3', depth: 0.028 },
    { sel: '.bg-orb-4', depth: 0.012 },
  ];
  const orbs = orbDefs.map(o => ({ el: document.querySelector(o.sel), depth: o.depth })).filter(o => o.el);
  const hero = document.querySelector('.hero');
  if (!hero || !orbs.length) return;

  let tx = 0, ty = 0, cx = 0, cy = 0;
  window.addEventListener('mousemove', e => {
    tx = e.clientX - window.innerWidth  / 2;
    ty = e.clientY - window.innerHeight / 2;
  }, { passive: true });
  (function raf() {
    cx += (tx - cx) * 0.05;
    cy += (ty - cy) * 0.05;
    orbs.forEach(({ el, depth }) => {
      el.style.transform  = `translate(${(cx * depth).toFixed(2)}px, ${(cy * depth).toFixed(2)}px)`;
    });
    requestAnimationFrame(raf);
  })();
})();

// *** 6. PROFILE ORBIT RINGS ***
(() => {
  const wrapper = document.querySelector('.profile-image-wrapper');
  if (!wrapper) return;
  ['profile-orbit profile-orbit-a', 'profile-orbit profile-orbit-b'].forEach(cls => {
    if (wrapper.querySelector('.' + cls.split(' ')[1])) return; // don't double-add
    const ring = document.createElement('div');
    ring.className = cls;
    wrapper.appendChild(ring);
  });
})();

// *** 7. SECTION TITLE WORD-SLIDE REVEAL ***
(() => {
  document.querySelectorAll('.section-title').forEach(title => {
    const words = title.textContent.trim().split(' ');
    title.innerHTML = words.map((w, i) =>
      `<span class="title-word-wrap"><span class="title-word-inner" style="transition-delay:${i * 0.07}s">${w}</span></span>`
    ).join(' ');
  });

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('revealed');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.section-title').forEach(t => {
    t.classList.add('reveal');
    obs.observe(t);
  });
})();

// *** 8. PREMIUM SECTION NUMBER FADE-IN ***
(() => {
  const nums = document.querySelectorAll('.section-number');
  if (!nums.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.3, rootMargin: '0px 0px -40px 0px' });

  nums.forEach(n => obs.observe(n));
})();

// *** 9. STAGGERED HERO ENTRANCE — CSS-driven, no JS opacity blocking ***
// We use CSS classes so if JS or load event fails, elements remain visible.
(() => {
  const badge   = document.querySelector('.hero-badge');
  const profile = document.querySelector('.profile-container');
  const title   = document.querySelector('.hero-title');
  const subtitle = document.querySelector('.hero-subtitle');
  const cta     = document.querySelector('.cta-group');

  const items = [badge, profile, title, subtitle, cta].filter(Boolean);
  items.forEach((el, i) => {
    el.classList.add('hero-anim-item');
    el.style.animationDelay = `${0.1 + i * 0.12}s`;
  });
})();

// *** 10. SMOOTH PARALLAX DEPTH ON SCROLL (desktop only, no opacity change) ***
(() => {
  const hero = document.querySelector('.hero');
  const heroBackground = document.querySelector('.hero-background');
  if (!hero || !heroBackground) return;

  // Only run parallax on non-touch desktop devices
  if (window.matchMedia('(pointer: coarse)').matches) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const scrolled = window.scrollY;
      const heroH = hero.offsetHeight;
      if (scrolled < heroH) {
        // Parallax only on the background, not content — keeps buttons always clickable
        heroBackground.style.transform = `translateY(${scrolled * 0.25}px)`;
      }
      ticking = false;
    });
  }, { passive: true });
})();

// *** PREMIUM DARK MODE TOGGLE ***
(function() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  if (!toggleBtn) return;
  
  // Custom floral/premium dark mode inspired by user image
  const toggleIcon = toggleBtn.querySelector('i');
  
  // check local storage
  const savedTheme = localStorage.getItem('sn-premium-theme');
  if (savedTheme === 'premium-dark') {
    document.body.classList.add('premium-dark');
    toggleIcon.className = 'fas fa-sun';
  }

  toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('premium-dark');
    
    if (document.body.classList.contains('premium-dark')) {
      toggleIcon.className = 'fas fa-sun';
      localStorage.setItem('sn-premium-theme', 'premium-dark');
    } else {
      toggleIcon.className = 'fas fa-moon';
      localStorage.setItem('sn-premium-theme', 'default');
    }
  });
})();

// *** MAX VERSTAPPEN VIDEO MODAL ***
(() => {
  const overlay  = document.getElementById('mvModalOverlay');
  const closeBtn = document.getElementById('mvModalClose');
  const trigger  = document.getElementById('mvTrigger');
  const video    = document.getElementById('mvVideoFrame');
  const spinner  = document.getElementById('mvVideoSpinner');
  if (!overlay || !trigger || !video) return;

  // Keyboard focus trap — Tab cycles only inside the modal
  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(
      overlay.querySelectorAll('button, video, [tabindex="0"]')
    ).filter(el => !el.disabled);
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
  }

  // Spinner tied to video buffering events
  if (spinner) {
    video.addEventListener('waiting', () => spinner.classList.add('visible'));
    video.addEventListener('playing', () => spinner.classList.remove('visible'));
    video.addEventListener('canplay', () => spinner.classList.remove('visible'));
    video.addEventListener('error',   () => spinner.classList.remove('visible'));
  }

  function openModal() {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    overlay.addEventListener('keydown', trapFocus);
    if (spinner) spinner.classList.add('visible');
    video.play().catch(() => { if (spinner) spinner.classList.remove('visible'); });
    closeBtn.focus();
  }

  function closeModal() {
    overlay.classList.remove('active');
    video.pause();
    video.currentTime = 0;
    if (spinner) spinner.classList.remove('visible');
    document.body.style.overflow = '';
    overlay.removeEventListener('keydown', trapFocus);
    trigger.focus();
  }

  trigger.addEventListener('click', openModal);
  trigger.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(); }
  });
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) closeModal();
  });
})();
// *** LUXEDITOR VIDEO MODAL ***
(() => {
  const overlay  = document.getElementById('lxModalOverlay');
  const closeBtn = document.getElementById('lxModalClose');
  const trigger  = document.getElementById('lxTrigger');
  const video    = document.getElementById('lxVideoFrame');
  const spinner  = document.getElementById('lxVideoSpinner');
  if (!overlay || !trigger || !video) return;

  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(
      overlay.querySelectorAll('button, video, [tabindex="0"]')
    ).filter(el => !el.disabled);
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
  }

  if (spinner) {
    video.addEventListener('waiting', () => spinner.classList.add('visible'));
    video.addEventListener('playing', () => spinner.classList.remove('visible'));
    video.addEventListener('canplay', () => spinner.classList.remove('visible'));
    video.addEventListener('error',   () => spinner.classList.remove('visible'));
  }

  function openModal() {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    overlay.addEventListener('keydown', trapFocus);
    if (spinner) spinner.classList.add('visible');
    video.play().catch(() => { if (spinner) spinner.classList.remove('visible'); });
    closeBtn.focus();
  }

  function closeModal() {
    overlay.classList.remove('active');
    video.pause();
    video.currentTime = 0;
    if (spinner) spinner.classList.remove('visible');
    document.body.style.overflow = '';
    overlay.removeEventListener('keydown', trapFocus);
    trigger.focus();
  }

  trigger.addEventListener('click', openModal);
  trigger.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(); }
  });
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) closeModal();
  });
})();
