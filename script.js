(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.add('js');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header: ombra allo scroll ---------- */
  var header = document.querySelector('.site-header');
  var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Menu mobile ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('main-nav');
  var mq = window.matchMedia('(max-width: 900px)');

  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
  }
  toggle.addEventListener('click', function () {
    var open = toggle.getAttribute('aria-expanded') !== 'true';
    setMenu(open);
    if (open) { var first = nav.querySelector('a'); if (first) first.focus(); }
  });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
  });
  mq.addEventListener('change', function () { if (!mq.matches) setMenu(false); });

  /* ---------- Voce di menu attiva ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.main-nav ul a'));
  var sections = links.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
  if ('IntersectionObserver' in window) {
    var navObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          links.forEach(function (a) {
            var active = a.getAttribute('href') === '#' + entry.target.id;
            a.classList.toggle('is-active', active);
            if (active) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
          });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { navObs.observe(s); });
  }

  /* ---------- Reveal ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revObs.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { revObs.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Come funziona: linea che si riempie con lo scroll ---------- */
  var tlWrap = document.getElementById('timeline');
  if (tlWrap) {
    var rail = tlWrap.querySelector('.tl-rail');
    var steps = Array.prototype.slice.call(tlWrap.querySelectorAll('.timeline li'));
    var nums = steps.map(function (li) { return li.querySelector('.step-num'); });
    var tlRunning = false;
    var vertical = false;
    var railLength = 1;
    var stepRadius = 48;
    var current = null;
    var clamp = function (v, min, max) { return Math.max(min, Math.min(max, v)); };

    var centerOf = function (el) {
      var r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };

    var measureRail = function () {
      var w = tlWrap.getBoundingClientRect();
      var a = centerOf(nums[0]);
      var b = centerOf(nums[nums.length - 1]);
      vertical = Math.abs(b.y - a.y) > Math.abs(b.x - a.x);
      railLength = vertical ? b.y - a.y : b.x - a.x;
      stepRadius = nums[0].offsetWidth / 2 + 10;
      tlWrap.style.setProperty('--rail', railLength + 'px');
      tlWrap.classList.toggle('is-vertical', vertical);
      if (vertical) {
        rail.style.cssText = 'left:' + (a.x - w.left) + 'px;top:' + (a.y - w.top) + 'px;height:' + (b.y - a.y) + 'px;width:1px';
      } else {
        rail.style.cssText = 'left:' + (a.x - w.left) + 'px;top:' + (a.y - w.top) + 'px;width:' + (b.x - a.x) + 'px;height:1px';
      }
    };

    /* Posizione della luce lungo la linea: oltre 0 e 1 entra e esce dai cerchi */
    var targetProgress = function () {
      var margin = stepRadius / railLength;
      var vh = window.innerHeight;
      if (reducedMotion) return 1 + margin;
      if (vertical) {
        var a = centerOf(nums[0]).y;
        var b = centerOf(nums[nums.length - 1]).y;
        return clamp((vh * 0.68 - a) / (b - a), -margin, 1 + margin);
      }
      var t = clamp((vh * 0.82 - tlWrap.getBoundingClientRect().top) / (vh * 0.42), 0, 1);
      return -margin + t * (1 + 2 * margin);
    };

    var render = function () {
      var spacing = railLength / (steps.length - 1);
      var x = current * railLength;
      var railX = clamp(x, 0, railLength);
      var last = -1;
      tlWrap.style.setProperty('--p', clamp(current, 0, 1).toFixed(4));
      steps.forEach(function (li, i) {
        var stepX = i * spacing;
        var fill = clamp((x - stepX + stepRadius) / (2 * stepRadius), 0, 1);
        var glow = reducedMotion ? 0 : clamp(1 - Math.abs(railX - stepX) / (spacing * 0.55), 0, 1);
        nums[i].style.setProperty('--f', fill.toFixed(3));
        nums[i].style.setProperty('--g', glow.toFixed(3));
        var lit = fill >= 0.5;
        li.classList.toggle('is-lit', lit);
        if (lit) last = i;
      });
      steps.forEach(function (li, i) { li.classList.toggle('is-current', i === last && !reducedMotion); });
    };

    /* La luce insegue lo scorrimento con una leggera inerzia */
    var tick = function () {
      var target = targetProgress();
      if (current === null || reducedMotion) current = target;
      current += (target - current) * 0.16;
      var settled = Math.abs(target - current) < 0.0006;
      if (settled) current = target;
      render();
      if (settled) { tlRunning = false; } else { window.requestAnimationFrame(tick); }
    };

    var paint = function () {
      current = targetProgress();
      render();
    };

    var requestPaint = function () {
      if (!tlRunning) { tlRunning = true; window.requestAnimationFrame(tick); }
    };

    measureRail();
    paint();
    window.addEventListener('scroll', requestPaint, { passive: true });
    window.addEventListener('resize', function () { measureRail(); requestPaint(); });
    window.addEventListener('load', function () { measureRail(); requestPaint(); });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { measureRail(); requestPaint(); });
    }
  }

  /* ---------- Modal servizi ---------- */
  var closeModal = function (dialog) {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
    var finish = function () {
      dialog.classList.remove('is-closing');
      dialog.close();
    };
    if (reducedMotion) { finish(); return; }
    dialog.classList.add('is-closing');
    window.setTimeout(finish, 240);
  };

  document.querySelectorAll('.svc-open').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var dialog = document.getElementById(btn.getAttribute('data-modal'));
      if (!dialog) return;
      dialog.showModal();
      document.body.classList.add('modal-open');
      var scroller = dialog.querySelector('.modal-scroll');
      if (scroller) scroller.scrollTop = 0;
    });
  });

  document.querySelectorAll('dialog.modal').forEach(function (dialog) {
    dialog.addEventListener('close', function () { document.body.classList.remove('modal-open'); });
    dialog.addEventListener('cancel', function (e) { e.preventDefault(); closeModal(dialog); });
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog || e.target.closest('[data-close]')) closeModal(dialog);
    });
  });

  /* ---------- Accordion FAQ ---------- */
  document.querySelectorAll('.acc-trigger').forEach(function (btn) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    panel.setAttribute('aria-hidden', 'true');
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('is-open', open);
      panel.setAttribute('aria-hidden', String(!open));
      panel.querySelectorAll('a').forEach(function (a) { a.tabIndex = open ? 0 : -1; });
    });
    panel.querySelectorAll('a').forEach(function (a) { a.tabIndex = -1; });
  });

  /* ---------- Form contatti: prepara l'email per la segreteria ---------- */
  var form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = function (name) { return form.elements[name].value.trim(); };
      var body = [
        'Nome: ' + v('nome'),
        'Email: ' + v('email'),
        'Telefono: ' + (v('telefono') || '-'),
        'Servizio di interesse: ' + v('servizio'),
        '',
        v('messaggio')
      ].join('\r\n');
      window.location.href = 'mailto:verona.medicale@gmail.com'
        + '?subject=' + encodeURIComponent('Richiesta informazioni - ' + v('servizio'))
        + '&body=' + encodeURIComponent(body);
      document.getElementById('form-status').textContent =
        'Abbiamo preparato la tua email: inviala dal tuo programma di posta per completare la richiesta.';
    });
  }

  /* ---------- Anno ---------- */
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
