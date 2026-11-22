// Hero dot grid, the Istanbul clock, and the active-section marker in the top bar.
(function () {
  var root = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Clock ---------- */

  function wallClock(tz, date) {
    return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  }

  function startClock() {
    var el = document.getElementById('clock');
    if (!el || !window.Intl) return;
    function tick() {
      try {
        el.textContent = 'Istanbul ' + wallClock('Europe/Istanbul', new Date());
      } catch (e) { /* time zone data unavailable: keep the placeholder */ }
    }
    tick();
    setInterval(tick, 15000);
  }

  /* ---------- Active section in the top bar ---------- */

  function startScrollSpy() {
    var links = document.querySelectorAll('.nav a[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;
    var byId = {};
    for (var i = 0; i < links.length; i++) byId[links[i].getAttribute('href').slice(1)] = links[i];

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = byId[entry.target.id];
        if (!link || !entry.isIntersecting) return;
        for (var j = 0; j < links.length; j++) {
          links[j].classList.remove('is-active');
          links[j].removeAttribute('aria-current');
        }
        link.classList.add('is-active');
        link.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    Object.keys(byId).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) observer.observe(section);
    });

    // Back in the hero: nothing is active.
    var hero = document.getElementById('top');
    if (hero) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          for (var j = 0; j < links.length; j++) {
            links[j].classList.remove('is-active');
            links[j].removeAttribute('aria-current');
          }
        }
      }, { rootMargin: '-45% 0px -50% 0px' }).observe(hero);
    }
  }

  /* ---------- Dot grid ----------
     A grid of "weights". Near the pointer, only a fixed sparse subset lights up in the
     accent color, a nod to selective fine-tuning; the rest barely move. */

  function startField() {
    var canvas = document.querySelector('.hero .field');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var SPACING = 22;
    var SELECTED = 0.16;

    var width = 0, height = 0, dots = [];
    var colors = { dot: '#c3bfb2', ink: '#141413', accent: '#2b4de0' };
    var focus = { x: 0, y: 0 };
    var pointer = { x: 0, y: 0, at: -Infinity };
    var visible = true, running = false;

    function hash(i, j) {
      var n = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0;
      n = Math.imul(n ^ (n >>> 13), 1274126177);
      n ^= n >>> 16;
      return (n >>> 0) / 4294967296;
    }

    function readColors() {
      var style = getComputedStyle(root);
      colors.dot = style.getPropertyValue('--dot').trim() || colors.dot;
      colors.ink = style.getPropertyValue('--ink').trim() || colors.ink;
      colors.accent = style.getPropertyValue('--accent').trim() || colors.accent;
    }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      dots = [];
      var ox = (width % SPACING) / 2 + SPACING / 2;
      var oy = (height % SPACING) / 2 + SPACING / 2;
      for (var j = 0; oy + j * SPACING < height; j++) {
        for (var i = 0; ox + i * SPACING < width; i++) {
          var h = hash(i, j);
          dots.push({ x: ox + i * SPACING, y: oy + j * SPACING, selected: h < SELECTED, phase: h * 40 });
        }
      }
      if (!running) {
        focus.x = width * 0.62;
        focus.y = height * 0.5;
        draw(performance.now());
      }
    }

    function idlePoint(t) {
      return {
        x: width * (0.55 + 0.3 * Math.sin(t * 0.00021)),
        y: height * (0.4 + 0.14 * Math.sin(t * 0.00034 + 1.3))
      };
    }

    function draw(t) {
      ctx.clearRect(0, 0, width, height);
      var radius = Math.max(120, Math.min(230, Math.min(width, height) * 0.3));
      var r2 = radius * radius;

      ctx.fillStyle = colors.dot;
      for (var k = 0; k < dots.length; k++) ctx.fillRect(dots[k].x - 1, dots[k].y - 1, 2, 2);

      for (var n = 0; n < dots.length; n++) {
        var d = dots[n];
        var dx = d.x - focus.x, dy = d.y - focus.y;
        var dist2 = dx * dx + dy * dy;
        if (dist2 >= r2) continue;
        var f = 1 - Math.sqrt(dist2) / radius;
        if (d.selected) {
          var pulse = reduceMotion ? 1 : 0.8 + 0.2 * Math.sin(t * 0.004 + d.phase);
          var size = 2 + 5 * f * pulse;
          ctx.globalAlpha = Math.min(1, 0.25 + f);
          ctx.fillStyle = colors.accent;
          ctx.fillRect(d.x - size / 2, d.y - size / 2, size, size);
        } else {
          ctx.globalAlpha = 0.45 * f;
          ctx.fillStyle = colors.ink;
          ctx.fillRect(d.x - 1, d.y - 1, 2, 2);
        }
      }
      ctx.globalAlpha = 1;
    }

    function frame(t) {
      if (!visible || document.hidden) { running = false; return; }
      var target = (t - pointer.at < 2500) ? pointer : idlePoint(t);
      focus.x += (target.x - focus.x) * 0.12;
      focus.y += (target.y - focus.y) * 0.12;
      draw(t);
      requestAnimationFrame(frame);
    }

    function start() {
      if (reduceMotion || running || !visible || document.hidden) return;
      running = true;
      requestAnimationFrame(frame);
    }

    readColors();
    resize();

    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize', resize);

    new MutationObserver(function () {
      readColors();
      if (!running) draw(performance.now());
    }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    if (reduceMotion) return;

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.at = performance.now();
    }, { passive: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        start();
      }).observe(canvas);
    }
    document.addEventListener('visibilitychange', start);
    focus.x = width * 0.62;
    focus.y = height * 0.5;
    start();
  }

  function init() {
    startClock();
    startScrollSpy();
    startField();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
