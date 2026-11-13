(function(){
  var rail = Array.prototype.slice.call(document.querySelectorAll('.rail [data-set]'));
  var live = document.getElementById('live');
  var nextBtn = document.getElementById('fit-next');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var pending = null;   // last activation wins (§6.2)
  var pendingFocus = false;
  var locked = false;   // one ritual at a time, never overlapped
  var busy = false;     // a transition is in flight; input is locked

  function current(){
    return Number(document.documentElement.getAttribute('data-era')) || 1;
  }
  function atHero(){ return window.scrollY <= 4; }

  function apply(n){
    document.documentElement.setAttribute('data-era', String(n));
    rail.forEach(function(b){ b.setAttribute('aria-checked', b.getAttribute('data-set') === String(n) ? 'true' : 'false'); });
    live.textContent = rail[n-1].getAttribute('aria-label');
  }

  /* ---- Era-change transition: cover → hold (readiness) → reveal ----
     One system for every pair and every direction: the page dissolves into
     its own ground and rises out of it. The pace is fixed here and nowhere
     else; nothing varies per era. */
  var DOWN_MS = 200;    // fade toward the ground
  var UP_MS   = 280;    // fade back up into the destination era
  var TROUGH_MAX = 260; // ceiling on the neutral hold: past this the fade
                        // rises with fallback metrics rather than stalling

  var fade = document.getElementById('eraFade');

  // Every weight a stylesheet requests must exist as a local cut. Loading the
  // destination's declared cuts is the readiness gate: the swap must not be
  // painted before the faces that paint it are available.
  var FONT_CUTS = {
    1: [['300','Vazirmatn'],['400','Vazirmatn'],['700','Vazirmatn']],
    2: [['400','Ario'],['700','Ario']],
    3: [['300','Vazirmatn'],['400','Vazirmatn'],['700','Vazirmatn']],
    4: [['400','Estedad'],['800','Estedad']],
    5: [['400','Rooyin'],['700','Rooyin']]
  };

  function loadCuts(n){
    if (!document.fonts || !document.fonts.load) return null;
    var cuts = FONT_CUTS[n] || [];
    if (!cuts.length) return null;
    return Promise.all(cuts.map(function(c){
      return document.fonts.load(c[0] + ' 16px "' + c[1] + '"');
    }));
  }

  // Intent (hover, focus, pointer-down on a rail item) starts the destination's
  // prefetch; the reveal is the loading window.
  function prefetch(n){
    var job = loadCuts(n);
    if (job && job.catch) job.catch(function(){});
  }

  function whenReady(n, cb){
    var job = loadCuts(n);
    var done = false;
    function finish(){ if (done) return; done = true; cb(); }
    if (job && job.then) job.then(finish, finish);
    else finish();
    window.setTimeout(finish, TROUGH_MAX);
  }

  function settle(){
    if (locked || busy || pending === null) return;
    var n = pending;
    var focus = pendingFocus;
    pending = null;
    pendingFocus = false;

    // Re-activating the current era replays its own state with no fade:
    // nothing is swapping, so nothing needs to dissolve.
    if (n === current()){ apply(n); if (focus) rail[n-1].focus({ preventScroll: true }); return; }

    run(n, focus);
  }

  function run(n, focus){
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    var instant = reduce.matches || (conn && conn.saveData);

    if (!fade){ apply(n); if (focus) rail[n-1].focus({ preventScroll: true }); return; }

    busy = true;
    document.body.classList.add('is-switching');

    // The layer takes the OUTGOING era's own ground. The page dissolves into
    // the colour it already is, so the fade never introduces a third palette
    // and never reads as a curtain drawn over the work.
    var ground = getComputedStyle(document.body).backgroundColor;
    fade.style.setProperty('--fade-bg', ground || '#fff');

    function finish(){
      fade.classList.add('is-cut');
      fade.classList.remove('is-down', 'is-up', 'is-quick');
      void fade.offsetWidth;
      fade.classList.remove('is-cut');
      busy = false;
      document.body.classList.remove('is-switching');
      if (focus) rail[n-1].focus({ preventScroll: true });
      // The page has fully arrived. Only now do era-owned entrances start, so
      // they are never layered on top of the fade itself.
      document.dispatchEvent(new CustomEvent('era:revealed'));
    }

    if (instant){
      // Reduced motion / Save-Data: swap behind an opaque frame, then a 120 ms
      // fade. No dissolve and no readiness hold.
      fade.classList.add('is-cut', 'is-down');
      apply(n);
      void fade.offsetWidth;   // paint the opaque frame before lifting it
      fade.classList.remove('is-cut', 'is-down');
      fade.classList.add('is-quick', 'is-up');
      window.setTimeout(finish, 120);
      return;
    }

    // 1 — fade down into the era's own ground.
    void fade.offsetWidth;
    fade.classList.add('is-down');

    window.setTimeout(function(){
      // 2 — fully faded: swap the one attribute the page keys off. Nothing is
      // visible here, so no frame can show two eras blended.
      apply(n);

      whenReady(n, function(){
        // Require one painted frame of the destination before rising, so the
        // fade-up never lifts onto a half-swapped page.
        requestAnimationFrame(function(){
          // 3 — fade up onto the destination.
          fade.classList.remove('is-down');
          fade.classList.add('is-up');
          window.setTimeout(finish, UP_MS);
        });
      });
    }, DOWN_MS);
  }

  function home(n, focus){
    if (busy) return;   // a transition is in flight: input is locked
    pending = n;        // while the ritual scrolls, last activation wins
    pendingFocus = focus;
    if (atHero()){ settle(); return; }
    if (locked) return;

    locked = true;
    var motion = reduce.matches ? 'auto' : 'smooth';
    var fallback = null;

    function done(){
      if (!locked) return;
      window.clearTimeout(fallback);
      window.removeEventListener('scroll', onScroll);
      locked = false;
      settle();
    }
    function onScroll(){ if (atHero()) done(); }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.scrollTo({ top: 0, left: 0, behavior: motion });
    fallback = window.setTimeout(function(){
      window.removeEventListener('scroll', onScroll);
      window.scrollTo(0, 0);
      done();
    }, 1200);
  }

  rail.forEach(function(b){
    // Intent signals start the destination's prefetch. The scroll to the hero
    // and the cover are the loading window, so the hold stays short.
    var n = Number(b.getAttribute('data-set'));
    b.addEventListener('pointerenter', function(){ prefetch(n); }, { passive: true });
    b.addEventListener('focus', function(){ prefetch(n); });
    b.addEventListener('pointerdown', function(){ prefetch(n); }, { passive: true });
    b.addEventListener('click', function(){ home(Number(b.getAttribute('data-set')), false); });
    b.addEventListener('keydown', function(e){
      var i = Number(b.getAttribute('data-set'));
      var n = null;
      if(e.key === 'ArrowDown' || e.key === 'ArrowLeft') n = Math.min(5, i + 1);
      if(e.key === 'ArrowUp' || e.key === 'ArrowRight') n = Math.max(1, i - 1);
      if(e.key === 'Home') n = 1;
      if(e.key === 'End') n = 5;
      if(n !== null){
        e.preventDefault();
        rail[n-1].focus({ preventScroll: true });
        home(n, false);
      }
    });
  });
  nextBtn.addEventListener('pointerenter', function(){
    prefetch(current() === 5 ? 1 : current() + 1);
  }, { passive: true });
  nextBtn.addEventListener('click', function(){
    var n = current() === 5 ? 1 : current() + 1;
    home(n, true);
  });

  /* Tier 1 — idle. The product is browsing five typefaces, so anyone who taps
     one era will tap another; warming the other four after first paint is
     aligned with what the visitor came to do, not speculative. Skipped under
     Save-Data and on a slow effectiveType, where every era stays on demand.
     Fonts are immutable-cached, so this costs each visitor once. */
  (function(){
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn && (conn.saveData || /^(slow-2g|2g)$/.test(conn.effectiveType || ''))) return;

    function warm(){
      for (var n = 1; n <= 5; n++){
        if (n !== current()) prefetch(n);
      }
    }
    if ('requestIdleCallback' in window) window.requestIdleCallback(warm, { timeout: 3000 });
    else window.setTimeout(warm, 1200);
  })();
})();

/* Manifesto entrance — one-shot reveal per era mount. Each era carries its
   own motion in CSS; this only decides when it fires: when the active era's
   block is on screen. An era with no entrance shows its cards immediately. */
(function(){
  var manifesto = document.querySelector('.manifesto');
  if (!manifesto) return;
  var blocks = Array.prototype.slice.call(manifesto.querySelectorAll('.era-block'));
  if (!blocks.length) return;
  blocks.forEach(function(b){ b.classList.add('entrance-ready'); });

  function active(){
    var era = document.documentElement.getAttribute('data-era') || '1';
    return manifesto.querySelector('.era-block[data-for="' + era + '"]');
  }
  function check(){
    var b = active();
    if (!b || b.classList.contains('is-revealed')) return;
    var card = b.querySelector('.m-card');
    if (!card) return;
    var box = card.getBoundingClientRect();
    if (box.top < window.innerHeight && box.bottom > 0) b.classList.add('is-revealed');
  }
  function reset(){
    var era = document.documentElement.getAttribute('data-era') || '1';
    blocks.forEach(function(b){
      if (b.getAttribute('data-for') !== era) b.classList.remove('is-revealed');
    });
  }

  window.addEventListener('scroll', check, { passive: true });
  window.addEventListener('resize', check);
  check();

  // Each era mount replays that era's entrance.
  // A data-era flip happens under an opaque frame. Reset there, but do not
  // start the entrance: it begins when the era is actually rising into view,
  // so the entrance is always seen and never plays where it cannot be.
  if (window.MutationObserver){
    new MutationObserver(function(){ reset(); })
      .observe(document.documentElement, { attributes:true, attributeFilter:['data-era'] });
  }
  document.addEventListener('era:revealed', check);
})();

/* Exhibit pause — stop the glass layers' drift and the bar breathing once
   the hero scrolls away, so nothing animates off screen. */
(function(){
  var exhibit = document.querySelector('.exhibit.ex-glass');
  if (!exhibit || !('IntersectionObserver' in window)) return;

  var observer = new IntersectionObserver(function(entries){
    for (var i = 0; i < entries.length; i++){
      exhibit.classList.toggle('is-paused', !entries[i].isIntersecting);
    }
  }, { threshold: 0 });

  observer.observe(exhibit);
})();
